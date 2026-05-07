import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateProjectPaymentTermsTable
 *
 * Adds the `project_payment_terms` table — the source-of-truth for planned
 * receivable installments per project. Snapshotted from quote_versions at
 * project creation; project owns the data thereafter.
 *
 * Constraints enforced at DB level:
 *   - expected_amount > 0
 *   - paid_amount     >= 0
 *   - currency        = 'INR' (locked in v1)
 *   - source          IN ('quote_snapshot','manual')
 *   - status          IN ('pending','partial','paid','waived','cancelled')
 *
 * Optimistic concurrency via the `version` column (TypeORM @VersionColumn).
 */
export class CreateProjectPaymentTermsTable1830000000000 implements MigrationInterface {
  name = 'CreateProjectPaymentTermsTable1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_payment_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        project_id UUID NOT NULL,
        source_quote_version_id UUID,
        source VARCHAR(30) NOT NULL DEFAULT 'manual',
        stage VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        display_order INTEGER NOT NULL DEFAULT 1,
        expected_amount NUMERIC(15, 2) NOT NULL,
        expected_percentage NUMERIC(5, 2),
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        due_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ,
        waived_reason VARCHAR(500),
        notes TEXT,
        version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,

        CONSTRAINT fk_payment_terms_project
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_payment_terms_quote_version
          FOREIGN KEY (source_quote_version_id) REFERENCES quote_versions(id) ON DELETE SET NULL,

        CONSTRAINT chk_payment_terms_expected_amount_positive CHECK (expected_amount > 0),
        CONSTRAINT chk_payment_terms_paid_amount_non_negative CHECK (paid_amount >= 0),
        CONSTRAINT chk_payment_terms_currency_inr CHECK (currency = 'INR'),
        CONSTRAINT chk_payment_terms_source CHECK (source IN ('quote_snapshot','manual')),
        CONSTRAINT chk_payment_terms_status
          CHECK (status IN ('pending','partial','paid','waived','cancelled'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_terms_project_order
        ON project_payment_terms(project_id, display_order)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_terms_project_status
        ON project_payment_terms(project_id, status)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_terms_due_pending
        ON project_payment_terms(project_id, due_date)
        WHERE deleted_at IS NULL AND status IN ('pending','partial');
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_terms_org
        ON project_payment_terms(organization_id)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_payment_terms_updated_at
        BEFORE UPDATE ON project_payment_terms
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_payment_terms_updated_at ON project_payment_terms;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_terms_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_terms_due_pending;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_terms_project_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_terms_project_order;`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_payment_terms;`);
  }
}
