import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task rules on workflow steps, and a marker for tasks the system removes.
 *
 * `loan_only` and `property_types` decide which sites a step's task goes to
 * (stepAppliesToSite in libs/shared). `removal_reason` is written only when the
 * system soft-deletes a task — the loan sync or the one-time cleanup — so a NULL
 * reason on a deleted task means a person deleted it, and the loan sync never
 * brings that task back.
 *
 * Starting rule: every live baseline step typed `loan` becomes loan only. It is
 * keyed on `type`, not on codes: codes in this catalogue have been re-coded
 * before (LIA-0xx → EXE-0xx), and one loan code even carries a space
 * ("LOAN -02"). Property types are left for admins to set on the steps page.
 */
export class AddWorkflowStepRules1857100000000 implements MigrationInterface {
  name = 'AddWorkflowStepRules1857100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS loan_only boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS property_types varchar(50)[] NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS removal_reason varchar(40) NULL`,
    );

    // On postgres, UPDATE … RETURNING comes back as [rows, affectedCount].
    const [rows] = (await queryRunner.query(`
      UPDATE workflow_steps
         SET loan_only = true, updated_at = CURRENT_TIMESTAMP
       WHERE type = 'loan'
         AND deleted_at IS NULL
         AND is_special = false
         AND change_request_type IS NULL
      RETURNING code, name
    `)) as [Array<{ code: string; name: string }>, number];

    console.warn(`[migration] Marked ${rows.length} loan step(s) as loan only.`);
    for (const row of rows) {
      console.warn(`[migration]   ${row.code} — ${row.name}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS removal_reason`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS property_types`);
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS loan_only`);
  }
}
