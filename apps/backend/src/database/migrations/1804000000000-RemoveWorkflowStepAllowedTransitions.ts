import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveWorkflowStepAllowedTransitions1804000000000 implements MigrationInterface {
  name = 'RemoveWorkflowStepAllowedTransitions1804000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE workflow_steps DROP COLUMN IF EXISTS allowed_transitions`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS allowed_transitions JSONB`,
    );
  }
}
