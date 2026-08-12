-- =============================================================================
-- Before/after record for RealignDriftedMilestoneSchedules1854200000000
-- =============================================================================
--
-- Read-only. Run BEFORE the migration to produce the record finance signs off,
-- and again AFTER to confirm it comes back empty.
--
-- Section 1 is the customer-facing summary: what each customer agreed to pay,
-- what the schedule currently bills them, and the difference. Positive
-- "overbilled_by" means the customer is being asked for more than they agreed.
--
-- Section 2 is the per-milestone detail the migration will write.
--
-- USAGE
--   docker exec -i oneohm-postgres psql -U root -d oneohm_epc \
--     < apps/backend/src/database/scripts/realign-drifted-milestones-preview.sql
--
--   Add   \pset format csv   at the top to capture it as a CSV.
-- =============================================================================

\echo ''
\echo '=== 1. CUSTOMER IMPACT — empty after the migration has run ==============='

WITH m AS (
  SELECT project_id, SUM(amount_paise) AS s
  FROM payment_milestones WHERE source = 'quote_snapshot' GROUP BY project_id
)
SELECT
  pr.project_number,
  NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')            AS customer,
  qv.final_price                                                          AS agreed,
  (m.s / 100.0)::numeric(12, 2)                                           AS billed_by_schedule,
  ((m.s / 100.0) - qv.final_price)::numeric(12, 2)                        AS overbilled_by,
  (COALESCE((SELECT SUM(e.amount_paise) FROM ledger_entries e
              WHERE e.project_id = pr.id AND e.direction = 'in'), 0) / 100.0)::numeric(12, 2) AS paid_so_far,
  (COALESCE((SELECT SUM(v.balance_paise) FROM v_milestone_balance v
              WHERE v.project_id = pr.id AND v.status = 'active'
                AND v.balance_paise > 0), 0) / 100.0)::numeric(12, 2)      AS still_chased
FROM projects pr
JOIN m                        ON m.project_id = pr.id
JOIN quote_versions qv        ON qv.id = pr.contract_quote_version_id
LEFT JOIN customer_properties prop ON prop.id = pr.property_id
LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
WHERE pr.deleted_at IS NULL
  AND ABS(ROUND(qv.final_price * 100)::bigint - m.s) > 100
ORDER BY ((m.s / 100.0) - qv.final_price) DESC;

\echo ''
\echo '=== 2. PER-MILESTONE BEFORE/AFTER ========================================'

WITH drift AS (
  SELECT pr.id AS project_id, pr.project_number,
         ROUND(qv.final_price * 100)::bigint AS target_paise,
         SUM(pm.amount_paise)                AS current_paise
  FROM projects pr
  JOIN quote_versions qv     ON qv.id = pr.contract_quote_version_id
  JOIN payment_milestones pm ON pm.project_id = pr.id AND pm.source = 'quote_snapshot'
  WHERE pr.deleted_at IS NULL
  GROUP BY pr.id, pr.project_number, qv.final_price
  HAVING ABS(ROUND(qv.final_price * 100)::bigint - SUM(pm.amount_paise)) > 100
),
scaled AS (
  SELECT
    d.project_number, d.target_paise,
    pm.display_order, pm.name, pm.amount_paise AS before_paise,
    ROUND(pm.amount_paise::numeric * d.target_paise / d.current_paise)::bigint AS scaled_paise,
    ROW_NUMBER() OVER (PARTITION BY d.project_id ORDER BY pm.display_order DESC, pm.id DESC) AS rn_from_end,
    SUM(ROUND(pm.amount_paise::numeric * d.target_paise / d.current_paise)::bigint)
      OVER (PARTITION BY d.project_id) AS scaled_sum
  FROM drift d
  JOIN payment_milestones pm ON pm.project_id = d.project_id AND pm.source = 'quote_snapshot'
)
SELECT
  project_number,
  display_order AS ord,
  LEFT(name, 24) AS milestone,
  (before_paise / 100.0)::numeric(12, 2) AS before_rupees,
  ((CASE WHEN rn_from_end = 1 THEN scaled_paise + (target_paise - scaled_sum) ELSE scaled_paise END)
    / 100.0)::numeric(12, 2)             AS after_rupees,
  (((CASE WHEN rn_from_end = 1 THEN scaled_paise + (target_paise - scaled_sum) ELSE scaled_paise END)
    - before_paise) / 100.0)::numeric(12, 2) AS change_rupees
FROM scaled
ORDER BY project_number, display_order;

\echo ''
\echo '=== 3. TOTALS ============================================================'

WITH m AS (
  SELECT project_id, SUM(amount_paise) AS s
  FROM payment_milestones WHERE source = 'quote_snapshot' GROUP BY project_id
),
d AS (
  SELECT ((m.s / 100.0) - qv.final_price)::numeric(12, 2) AS diff
  FROM projects pr
  JOIN m ON m.project_id = pr.id
  JOIN quote_versions qv ON qv.id = pr.contract_quote_version_id
  WHERE pr.deleted_at IS NULL
    AND ABS(ROUND(qv.final_price * 100)::bigint - m.s) > 100
)
SELECT
  COUNT(*)                            AS projects,
  COUNT(*) FILTER (WHERE diff > 0)    AS overbilling_customers,
  SUM(diff) FILTER (WHERE diff > 0)   AS overbilled_total,
  COUNT(*) FILTER (WHERE diff < 0)    AS underbilling_company,
  SUM(diff) FILTER (WHERE diff < 0)   AS underbilled_total
FROM d;

\echo ''
