import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BackfillPaymentTermsFromQuotes
 *
 * Plan §7 — for every project that has no `project_payment_terms` rows
 * yet, snapshot installments from the project's quote's LATEST quote
 * version's `payment_milestones` jsonb. Each milestone produces one term:
 *
 *   display_order   = milestone array index + 1
 *   name            = milestone.label || milestone.name || "Installment N"
 *   stage           = milestone.stage   (nullable)
 *   expected_amount = milestone.amount  (must be > 0; rows with zero/null
 *                                        are skipped)
 *   currency        = 'INR'             (v1 lock)
 *   due_date        = milestone.dueDate (nullable; cast to date)
 *   status          = 'pending'
 *   source          = 'quote_snapshot'
 *   source_quote_version_id = quote_version.id
 *   notes           = milestone.notes   (nullable)
 *
 * Idempotency:
 *   - The outer WHERE filters out projects that already have at least
 *     one (non-soft-deleted) payment term row.
 *   - The migration is read-only against quotes/projects/quote_versions
 *     so re-running is safe.
 *   - A migration row in `migrations` prevents accidental re-execution
 *     by TypeORM's normal flow; this safety check here protects against
 *     manual re-runs.
 *
 * Down migration is a no-op — backfilled terms are indistinguishable
 * from terms created at runtime (both carry source='quote_snapshot' and
 * the same source_quote_version_id), and we never want to lose
 * legitimate term/receipt history. To wipe backfilled terms manually,
 * delete project_payment_terms rows where created_at < the migration
 * deploy time.
 */
export class BackfillPaymentTermsFromQuotes1830000000006 implements MigrationInterface {
  name = 'BackfillPaymentTermsFromQuotes1830000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // We work in pure SQL via a CTE chain so the entire backfill is one
    // transaction and we don't load the world into Node memory. The
    // jsonb_array_elements expansion gives us one row per milestone with
    // its array index (ordinality), which becomes display_order.
    await queryRunner.query(`
      INSERT INTO project_payment_terms (
        organization_id,
        project_id,
        source_quote_version_id,
        source,
        display_order,
        stage,
        name,
        expected_amount,
        currency,
        due_date,
        status,
        paid_amount,
        notes,
        created_at,
        updated_at,
        version
      )
      SELECT
        prop.organization_id                                AS organization_id,
        p.id                                                AS project_id,
        latest_qv.id                                        AS source_quote_version_id,
        'quote_snapshot'                                    AS source,
        m.ordinality::int                                   AS display_order,
        NULLIF(m.milestone->>'stage', '')                   AS stage,
        COALESCE(
          NULLIF(m.milestone->>'label', ''),
          NULLIF(m.milestone->>'name', ''),
          'Installment ' || m.ordinality::text
        )                                                   AS name,
        (m.milestone->>'amount')::numeric                   AS expected_amount,
        'INR'                                               AS currency,
        NULLIF(m.milestone->>'dueDate','')::date            AS due_date,
        'pending'                                           AS status,
        0                                                   AS paid_amount,
        NULLIF(m.milestone->>'notes', '')                   AS notes,
        CURRENT_TIMESTAMP                                   AS created_at,
        CURRENT_TIMESTAMP                                   AS updated_at,
        1                                                   AS version
      FROM projects p
      JOIN customer_properties prop ON prop.id = p.property_id
      JOIN quotes q ON q.id = p.quote_id
      -- Pick the LATEST quote_version per quote (highest version_number).
      JOIN LATERAL (
        SELECT qv.*
          FROM quote_versions qv
         WHERE qv.quote_id = q.id
         ORDER BY qv.version_number DESC
         LIMIT 1
      ) latest_qv ON TRUE
      -- Expand its payment_milestones jsonb array into one row per milestone.
      JOIN LATERAL jsonb_array_elements(
        COALESCE(latest_qv.payment_milestones, '[]'::jsonb)
      ) WITH ORDINALITY AS m(milestone, ordinality) ON TRUE
      WHERE prop.organization_id IS NOT NULL
        -- Only project rows that don't have any term yet (idempotency).
        AND NOT EXISTS (
          SELECT 1
            FROM project_payment_terms ppt
           WHERE ppt.project_id = p.id
             AND ppt.deleted_at IS NULL
        )
        -- Skip zero/blank/non-numeric amounts so the CHECK (amount > 0)
        -- constraint never fires on garbage milestone rows.
        AND (m.milestone->>'amount') ~ '^[0-9]+(\\.[0-9]+)?$'
        AND (m.milestone->>'amount')::numeric > 0;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: backfilled rows are indistinguishable from runtime-created
    // terms with the same source_quote_version_id. See the class doc
    // for the manual wipe procedure if absolutely needed.
  }
}
