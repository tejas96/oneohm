export interface ResellerSummary {
  resellerId: string; name: string; code: string | null; status: string;
  ratePercent: number | null;
  leads: number; quoted: number; won: number; winRate: number | null;
  revenuePaise: number; pendingPaise: number; owedPaise: number; paidPaise: number; toRecoverPaise: number;
}

export interface ResellerTotals { pendingPaise: number; owedPaise: number; paidPaise: number; toRecoverPaise: number; }

export interface ResellerHeader {
  resellerId: string; name: string; code: string | null; status: string; ratePercent: number | null;
  bankName: string | null; accountLast4: string | null; gstin: string | null; phone: string | null;
}

export interface MissingRow {
  quoteId: string; quoteNumber: string; acceptedAt: string; resellerId: string; resellerName: string; customerName: string;
}

/** IST midnight at the start of the period, as a UTC instant; null = all time. */
export function periodStart(period: 'month' | 'fy' | 'all' | undefined, now = new Date()): Date | null {
  if (!period || period === 'all') return null;
  const ist = new Date(now.getTime() + 330 * 60_000); // shift to IST wall clock
  const y = ist.getUTCFullYear();
  const mo = ist.getUTCMonth();
  const startY = period === 'month' ? y : mo >= 3 ? y : y - 1;
  const startM = period === 'month' ? mo : 3; // April
  return new Date(Date.UTC(startY, startM, 1) - 330 * 60_000);
}

/**
 * One row per reseller. Funnel by LEAD date; money by ACCEPTANCE date (revenue)
 * or right-now (pending/owed/paid/to recover). Spec §12 has the definitions;
 * `$1` is the period start (timestamptz or NULL), `$2` an optional reseller id.
 *
 * Counts PROPERTIES for quoted/won, so re-quotes on one roof count once.
 */
export const RESELLER_SUMMARY_SQL = (commissionRowSql: string): string => `
WITH r AS (
  SELECT ep.id, CASE WHEN ep.deleted_at IS NOT NULL THEN 'deleted'
                     WHEN u.status <> 'active' THEN 'inactive'
                     ELSE ep.status END AS status,
         ep.company_code AS code, ep.commission_percentage AS rate,
         COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS name
    FROM employee_profiles ep JOIN users u ON u.id = ep.user_id
   WHERE ep.profile_kind = 'reseller'
     -- A soft-deleted reseller stays listed while any live commission is his,
     -- so money owed to (or recoverable from) him never drops off the page.
     AND (ep.deleted_at IS NULL OR EXISTS (
           SELECT 1 FROM employee_commissions ec
            WHERE ec.employee_id = ep.id AND ec.status <> 'cancelled' AND ec.deleted_at IS NULL))
     AND ($2::uuid IS NULL OR ep.id = $2)
), leads AS (
  SELECT cp.id, cp.reseller_id FROM customer_profiles cp
   WHERE cp.reseller_id IS NOT NULL AND cp.deleted_at IS NULL
     AND ($1::timestamptz IS NULL OR cp.created_at >= $1)
), quoted AS (
  SELECT l.reseller_id, count(DISTINCT q.property_id) AS n FROM leads l
    JOIN quotes q ON q.customer_id = l.id AND q.reseller_id = l.reseller_id
   WHERE q.status <> 'draft' AND q.deleted_at IS NULL GROUP BY l.reseller_id
), won AS (
  SELECT l.reseller_id, count(DISTINCT q.property_id) AS n FROM leads l
    JOIN quotes q ON q.customer_id = l.id AND q.reseller_id = l.reseller_id
   WHERE q.status = 'accepted' AND q.voided_at IS NULL AND q.deleted_at IS NULL GROUP BY l.reseller_id
), revenue AS (
  -- Every live won deal counts, whatever its commission's state: a 0% partner
  -- or a dismissed pre-launch deal still brought the business in. A deal that
  -- died (its quote voided by the project cancel) drops out, same as "won".
  SELECT c.employee_id AS reseller_id, sum(ROUND(c.base_amount * 100)) AS n
    FROM employee_commissions c JOIN quotes q ON q.id = c.quote_id
   WHERE c.deleted_at IS NULL AND q.status = 'accepted' AND q.voided_at IS NULL AND q.deleted_at IS NULL
     AND ($1::timestamptz IS NULL OR q.accepted_at >= $1)
   GROUP BY c.employee_id
), money AS (
  SELECT x."resellerId" AS reseller_id,
    sum(x."amountPaise") FILTER (WHERE x.state IN ('pending','needs_amount'))          AS pending,
    sum(x."amountPaise") FILTER (WHERE x.state IN ('waiting_for_project','approved','payment_in_review')) AS owed,
    sum(x."amountPaise") FILTER (WHERE x.status = 'paid')                              AS paid,
    sum(x."amountPaise") FILTER (WHERE x.state = 'to_recover')                         AS to_recover
    FROM (${commissionRowSql}) x GROUP BY x."resellerId"
)
SELECT r.id AS "resellerId", r.name, r.code, r.status, r.rate::float8 AS "ratePercent",
       (SELECT count(*) FROM leads l WHERE l.reseller_id = r.id)::int AS leads,
       COALESCE(qd.n, 0)::int AS quoted, COALESCE(w.n, 0)::int AS won,
       COALESCE(rv.n, 0)::bigint AS "revenuePaise", COALESCE(mo.pending, 0)::bigint AS "pendingPaise",
       COALESCE(mo.owed, 0)::bigint AS "owedPaise", COALESCE(mo.paid, 0)::bigint AS "paidPaise",
       COALESCE(mo.to_recover, 0)::bigint AS "toRecoverPaise"
  FROM r
  LEFT JOIN quoted qd ON qd.reseller_id = r.id
  LEFT JOIN won w ON w.reseller_id = r.id
  LEFT JOIN money mo ON mo.reseller_id = r.id
  LEFT JOIN revenue rv ON rv.reseller_id = r.id
 ORDER BY COALESCE(mo.owed, 0) DESC, r.name`;

export const MISSING_COMMISSIONS_SQL = `
SELECT q.id AS "quoteId", q.quote_number AS "quoteNumber", q.accepted_at AS "acceptedAt",
       q.reseller_id AS "resellerId",
       COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS "resellerName",
       TRIM(cu.first_name || ' ' || COALESCE(cu.last_name, '')) AS "customerName"
  FROM quotes q
  JOIN employee_profiles ep ON ep.id = q.reseller_id
  JOIN users u ON u.id = ep.user_id
  JOIN customer_profiles cu ON cu.id = q.customer_id
  LEFT JOIN employee_commissions c ON c.quote_id = q.id
 WHERE q.status = 'accepted' AND q.voided_at IS NULL AND q.deleted_at IS NULL
   AND q.reseller_id IS NOT NULL AND c.id IS NULL
 ORDER BY q.accepted_at DESC`;
