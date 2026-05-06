import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateProjectExpensesTable
 *
 * Plan §2.3 — the cash-outflow ledger. One row per recorded expense
 * (vendor bill, employee out-of-pocket, etc.). Itemization (BOM-keyed
 * product links and off-list items) lives in `expense_product_links`,
 * created by the next migration.
 *
 * DB-level invariants:
 *   - amount > 0
 *   - expense_date <= CURRENT_DATE   (no future-dated expenses)
 *   - currency = 'INR'               (locked in v1)
 *   - category   in known enum values
 *   - paid_by    in (company, employee)
 *   - reimbursement_status in (not_applicable, pending, reimbursed)
 *   - paid_by=employee implies paid_by_employee_id IS NOT NULL
 *
 * The override columns (override_used / override_reason) are added in a
 * dedicated follow-up migration (1830000000005) so they are reversible
 * independently of the table itself.
 */
export class CreateProjectExpensesTable1830000000003 implements MigrationInterface {
  name = 'CreateProjectExpensesTable1830000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        project_id UUID NOT NULL,
        expense_number VARCHAR(50) NOT NULL,
        category VARCHAR(30) NOT NULL,
        vendor_name VARCHAR(255),
        amount NUMERIC(15, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        expense_date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        paid_by VARCHAR(20) NOT NULL DEFAULT 'company',
        paid_by_employee_id UUID,
        reimbursement_status VARCHAR(30) NOT NULL DEFAULT 'not_applicable',
        reimbursed_at TIMESTAMPTZ,
        reimbursed_by UUID,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,

        CONSTRAINT fk_project_expenses_project
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_project_expenses_employee
          FOREIGN KEY (paid_by_employee_id) REFERENCES employee_profiles(id) ON DELETE RESTRICT,

        CONSTRAINT chk_project_expenses_amount_positive CHECK (amount > 0),
        CONSTRAINT chk_project_expenses_date_not_future CHECK (expense_date <= CURRENT_DATE),
        CONSTRAINT chk_project_expenses_currency_inr CHECK (currency = 'INR'),
        CONSTRAINT chk_project_expenses_category
          CHECK (category IN ('materials','labor','travel','equipment','subcontractor','permits','misc')),
        CONSTRAINT chk_project_expenses_paid_by
          CHECK (paid_by IN ('company','employee')),
        CONSTRAINT chk_project_expenses_reimbursement_status
          CHECK (reimbursement_status IN ('not_applicable','pending','reimbursed')),
        CONSTRAINT chk_project_expenses_employee_required
          CHECK (
            (paid_by = 'company') OR
            (paid_by = 'employee' AND paid_by_employee_id IS NOT NULL)
          )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_expenses_project_date
        ON project_expenses(project_id, expense_date)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_expenses_project_category
        ON project_expenses(project_id, category)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_project_expenses_org_number_active
        ON project_expenses(organization_id, expense_number)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_expenses_employee_reimbursement
        ON project_expenses(paid_by_employee_id, reimbursement_status)
        WHERE deleted_at IS NULL AND paid_by_employee_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_project_expenses_updated_at
        BEFORE UPDATE ON project_expenses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_project_expenses_updated_at ON project_expenses;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_expenses_employee_reimbursement;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_project_expenses_org_number_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_expenses_project_category;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_expenses_project_date;`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_expenses;`);
  }
}
