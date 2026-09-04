import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { CREATE_BOM_VARIANCE } from './sql/bom/bom-variance.sql';

/**
 * CreateBomVarianceView — the database-level guarantee that bom_changes
 * reconstructs the current BOM value, on every project.
 *
 * v_project_bom_variance computes current BOM value two independent ways —
 * summing bom_items and summing bom_changes.cost_impact_paise — and this
 * migration asserts they agree, in the same shape v_project_balance asserts
 * quoted + change_order = contract (1851000000012-ContractComposition.ts).
 * bom_changes is append-only (1856300000000-AddBomChangeLogAndSerials.ts), so
 * a divergence can never be repaired after the fact — this makes a future
 * write-without-logging fail loudly, at migration time, instead of drifting
 * silently until someone notices the numbers don't add up.
 *
 * A new view with nothing depending on it yet: down() only needs to drop it.
 */
export class CreateBomVarianceView1856800000000 implements MigrationInterface {
  name = 'CreateBomVarianceView1856800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of CREATE_BOM_VARIANCE) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_project_bom_variance`);
  }
}
