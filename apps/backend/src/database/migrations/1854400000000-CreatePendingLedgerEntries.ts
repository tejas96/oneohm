import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Staging table for money awaiting verification.
 *
 * Deliberately NOT a status column on `ledger_entries`. That table is
 * INSERT-only — the append-only trigger from migration 1851000000006 rejects
 * UPDATE — and it carries no status machine on purpose, because a status
 * machine is what made `project_payment_terms.paid_amount` drift in the system
 * the ledger replaced. Pending money therefore lives here, and approval is the
 * act that inserts the ledger row.
 *
 * The consequence worth stating plainly: nothing in this table counts towards
 * any balance. `v_project_balance`, `v_milestone_balance`, the AR and
 * outstanding queries and the KPIs all read `ledger_entries`, which this table
 * never touches until approval. No existing query needed changing.
 *
 * Existing ledger entries are implicitly approved. Nothing is backfilled, so no
 * customer balance moves when this ships.
 */
export class CreatePendingLedgerEntries1854400000000 implements MigrationInterface {
  name = 'CreatePendingLedgerEntries1854400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pending_ledger_entries" (
        "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_no"         varchar(30)  NOT NULL,
        "kind"               varchar(20)  NOT NULL,
        "status"             varchar(20)  NOT NULL DEFAULT 'pending',

        "project_id"         uuid         NOT NULL REFERENCES "projects"("id"),
        "customer_id"        uuid         NULL,
        "entry_type"         varchar(30)  NOT NULL,
        "direction"          varchar(3)   NOT NULL,
        "amount_paise"       bigint       NOT NULL,
        "value_date"         date         NOT NULL,
        "payment_method"     varchar(50)  NULL,
        "counterparty"       varchar(255) NULL,
        "category"           varchar(30)  NULL,
        "reference"          varchar(255) NULL,
        "notes"              text         NULL,

        "reverses_entry_id"  uuid         NULL REFERENCES "ledger_entries"("id"),
        "reversal_reason"    varchar(500) NULL,

        "proof_document_id"  uuid         NULL REFERENCES "documents"("id"),
        "submitted_by"       uuid         NOT NULL,
        "submitted_at"       timestamptz  NOT NULL DEFAULT now(),
        "reviewed_by"        uuid         NULL,
        "reviewed_at"        timestamptz  NULL,
        "rejection_reason"   varchar(500) NULL,
        "ledger_entry_id"    uuid         NULL REFERENCES "ledger_entries"("id"),

        "created_at"         timestamptz  NOT NULL DEFAULT now(),
        "updated_at"         timestamptz  NOT NULL DEFAULT now(),

        CONSTRAINT "uq_ple_request_no"     UNIQUE ("request_no"),
        CONSTRAINT "uq_ple_ledger_entry"   UNIQUE ("ledger_entry_id"),

        CONSTRAINT "chk_ple_kind"      CHECK ("kind" IN ('receipt','expense','reversal')),
        CONSTRAINT "chk_ple_status"    CHECK ("status" IN ('pending','approved','rejected','cancelled')),
        CONSTRAINT "chk_ple_direction" CHECK ("direction" IN ('in','out')),

        -- Four eyes. Enforced here and not only in the service, so the rule
        -- survives any future code path that writes this table.
        CONSTRAINT "chk_ple_four_eyes"
          CHECK ("reviewed_by" IS NULL OR "reviewed_by" <> "submitted_by"),

        -- An approved row without a ledger entry would be money that the UI
        -- claims was banked but which no balance reflects.
        CONSTRAINT "chk_ple_approved_has_entry"
          CHECK ("status" <> 'approved' OR "ledger_entry_id" IS NOT NULL),

        CONSTRAINT "chk_ple_rejected_has_reason"
          CHECK ("status" <> 'rejected' OR "rejection_reason" IS NOT NULL),

        CONSTRAINT "chk_ple_reversal_has_target"
          CHECK ("kind" <> 'reversal' OR "reverses_entry_id" IS NOT NULL)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_ple_status_submitted" ON "pending_ledger_entries" ("status", "submitted_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ple_project" ON "pending_ledger_entries" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ple_customer" ON "pending_ledger_entries" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ple_submitted_by" ON "pending_ledger_entries" ("submitted_by")`,
    );

    // At most one queued reversal per ledger entry. Without this, two approvers
    // could each approve a reversal of the same payment and reverse it twice.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ple_one_pending_reversal"
        ON "pending_ledger_entries" ("reverses_entry_id")
        WHERE "status" = 'pending' AND "kind" = 'reversal'
    `);

    // Duplicate detection probes this on every submit.
    await queryRunner.query(`
      CREATE INDEX "idx_ple_dup_probe"
        ON "pending_ledger_entries" ("project_id", "amount_paise", "value_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pending_ledger_entries"`);
  }
}
