import type { CommissionBaseSource, CommissionRateSource, CommissionState } from '@tejas96/shared/utils';

/**
 * One commission row as every screen needs it, with the displayed state
 * DERIVED here — never stored — from the row, its project, its site and the
 * approval queue. Nothing to keep in step, so nothing can drift.
 *
 * Order of the CASE is the rule table in spec §6.1; do not reorder.
 * Ends with WHERE 1=1 so callers append `AND ...` with their own params.
 */
export const COMMISSION_ROW_SQL = `
SELECT c.id,
       c.employee_id                                   AS "resellerId",
       COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS "resellerName",
       c.quote_id                                      AS "quoteId",
       q.quote_number                                  AS "quoteNumber",
       q.accepted_at                                   AS "acceptedAt",
       q.customer_id                                   AS "customerId",
       TRIM(cu.first_name || ' ' || COALESCE(cu.last_name, '')) AS "customerName",
       pr.id                                           AS "projectId",
       pr.project_number                               AS "projectNumber",
       pr.status                                       AS "projectStatus",
       ROUND(c.base_amount * 100)::bigint              AS "basePaise",
       c.commission_percentage::float8                 AS "ratePercent",
       ROUND(c.commission_amount * 100)::bigint        AS "amountPaise",
       c.base_source                                   AS "baseSource",
       c.rate_source                                   AS "rateSource",
       c.status,
       c.payout_request_id                             AS "payoutRequestId",
       ple.request_no                                  AS "payoutRequestNo",
       c.payout_rejected_reason                        AS "payoutRejectedReason",
       c.expense_entry_id                              AS "expenseEntryId",
       c.approved_at                                   AS "approvedAt",
       c.paid_at                                       AS "paidAt",
       c.payment_mode                                  AS "paymentMode",
       c.payment_reference                             AS "paymentReference",
       c.invoice_number                                AS "invoiceNumber",
       c.recovered_at                                  AS "recoveredAt",
       ROUND(c.recovered_amount * 100)::bigint         AS "recoveredPaise",
       c.recovery_notes                                AS "recoveryNotes",
       c.cancel_reason                                 AS "cancelReason",
       c.notes,
       c.created_at                                    AS "createdAt",
       CASE
         WHEN c.status = 'cancelled' THEN 'cancelled'
         WHEN c.status = 'paid' AND c.recovered_at IS NOT NULL THEN 'recovered'
         WHEN c.status = 'paid' AND pr.status = 'cancelled' THEN 'to_recover'
         WHEN c.status = 'paid' THEN 'paid'
         WHEN pr.id IS NULL AND prop.status = 'lost' THEN 'on_hold'
         WHEN c.status = 'pending' AND (c.base_source = 'missing' OR c.rate_source = 'missing') THEN 'needs_amount'
         WHEN c.status = 'pending' THEN 'pending'
         WHEN pr.id IS NULL THEN 'waiting_for_project'
         WHEN c.payout_request_id IS NOT NULL THEN 'payment_in_review'
         ELSE 'approved'
       END                                             AS state
  FROM employee_commissions c
  JOIN quotes q              ON q.id = c.quote_id
  JOIN employee_profiles ep  ON ep.id = c.employee_id
  JOIN users u               ON u.id = ep.user_id
  JOIN customer_profiles cu  ON cu.id = q.customer_id
  LEFT JOIN customer_properties prop ON prop.id = q.property_id
  LEFT JOIN LATERAL (
    SELECT p.id, p.project_number, p.status FROM projects p
     WHERE p.quote_id = c.quote_id AND p.deleted_at IS NULL
     ORDER BY p.created_at DESC LIMIT 1
  ) pr ON true
  LEFT JOIN pending_ledger_entries ple ON ple.id = c.payout_request_id
 WHERE c.deleted_at IS NULL`;

export interface CommissionRow {
  id: string;
  resellerId: string;
  resellerName: string;
  quoteId: string;
  quoteNumber: string;
  acceptedAt: string | null;
  customerId: string;
  customerName: string;
  projectId: string | null;
  projectNumber: string | null;
  projectStatus: string | null;
  basePaise: number;
  ratePercent: number;
  amountPaise: number;
  baseSource: CommissionBaseSource;
  rateSource: CommissionRateSource;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payoutRequestId: string | null;
  payoutRequestNo: string | null;
  payoutRejectedReason: string | null;
  expenseEntryId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  paymentMode: string | null;
  paymentReference: string | null;
  invoiceNumber: string | null;
  recoveredAt: string | null;
  recoveredPaise: number | null;
  recoveryNotes: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: string;
  state: CommissionState;
}

/** pg returns bigint as string; make the paise fields numbers. */
export function toCommissionRow(raw: Record<string, unknown>): CommissionRow {
  const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
  return {
    ...(raw as unknown as CommissionRow),
    basePaise: n(raw.basePaise),
    amountPaise: n(raw.amountPaise),
    ratePercent: n(raw.ratePercent),
    recoveredPaise: raw.recoveredPaise === null ? null : n(raw.recoveredPaise),
  };
}
