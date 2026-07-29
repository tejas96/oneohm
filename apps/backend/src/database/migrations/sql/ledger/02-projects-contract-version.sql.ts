/**
 * Pins each project to the quote version its payment schedule came from.
 *
 * `projects` currently stores only `quote_id`, with no version reference and no
 * money columns at all. Every consumer of "contract value" therefore re-derives
 * it by sorting `project.quote.versions` and taking the LATEST
 * (`consumer-project-quote.utils.ts:14-25`). So revising a quote after the
 * project exists silently re-prices a signed deal — which is exactly why 12 of
 * 219 production projects have a milestone schedule that no longer sums to the
 * quote their customer is being shown.
 *
 * Note what this column is NOT: it is not a cached contract total. Contract
 * value stays derived as `SUM(payment_milestones.amount_paise)`. Storing the
 * total would reintroduce the same class of bug as
 * `project_payment_terms.paid_amount`, which is the thing this rebuild deletes.
 * This column is provenance only — which version the schedule, subsidy figure
 * and system size should be read from.
 */

export const ADD_CONTRACT_QUOTE_VERSION_COLUMN = `
  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS contract_quote_version_id UUID
`;

export const ADD_CONTRACT_QUOTE_VERSION_FK = `
  ALTER TABLE projects
    ADD CONSTRAINT fk_projects_contract_quote_version
    FOREIGN KEY (contract_quote_version_id)
    REFERENCES quote_versions(id) ON DELETE RESTRICT
`;

/**
 * Backfill preference order:
 *   1. The version the existing payment terms were snapshotted from — this is
 *      the actual contract, whatever the quote has since become.
 *   2. Failing that, the EARLIEST version of the project's quote, i.e. the state
 *      at conversion time.
 *
 * Deliberately never the latest version: that is the bug being fixed.
 */
export const BACKFILL_CONTRACT_QUOTE_VERSION = `
  UPDATE projects p
     SET contract_quote_version_id = COALESCE(
       (SELECT t.source_quote_version_id
          FROM project_payment_terms t
         WHERE t.project_id = p.id
           AND t.deleted_at IS NULL
           AND t.source_quote_version_id IS NOT NULL
         ORDER BY t.display_order, t.id
         LIMIT 1),
       (SELECT qv.id
          FROM quote_versions qv
         WHERE qv.quote_id = p.quote_id
         ORDER BY qv.created_at ASC, qv.version_number ASC
         LIMIT 1)
     )
   WHERE p.contract_quote_version_id IS NULL
`;

export const CREATE_CONTRACT_QUOTE_VERSION_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_projects_contract_quote_version
    ON projects (contract_quote_version_id) WHERE deleted_at IS NULL
`;

export const ADD_CONTRACT_QUOTE_VERSION: string[] = [
  ADD_CONTRACT_QUOTE_VERSION_COLUMN,
  ADD_CONTRACT_QUOTE_VERSION_FK,
  BACKFILL_CONTRACT_QUOTE_VERSION,
  CREATE_CONTRACT_QUOTE_VERSION_INDEX,
];

export const DROP_CONTRACT_QUOTE_VERSION: string[] = [
  `DROP INDEX IF EXISTS idx_projects_contract_quote_version`,
  `ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_contract_quote_version`,
  `ALTER TABLE projects DROP COLUMN IF EXISTS contract_quote_version_id`,
];
