import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * A return request must be recordable for a project that has no BOM.
 *
 * `return_requests.bom_id` was NOT NULL, and `stock_allocations.bom_id` is
 * nullable, so material dispatched against an allocation with no BOM — on a
 * project that has none either — could not be written down at all. Project
 * cancellation hit exactly that: it logged "no BOM, recover this by hand" and
 * moved on, leaving panels at a customer's site with nothing tracking them.
 * Since the cleanup checklist reads `return_requests`, the project would then
 * report itself settled while the material was still out.
 *
 * The column is only stored, optionally filtered on, and echoed back — nothing
 * computes with it, and completing a return resolves the allocation, not the
 * BOM. So it can be nullable without weakening anything.
 *
 * REVERTING: `down()` restores NOT NULL and fails if any row has a null
 * `bom_id`. That is deliberate — decide what those rows should point at before
 * reverting, rather than having the migration guess or drop them.
 */
export class ReturnRequestBomOptional1857016000000 implements MigrationInterface {
  name = 'ReturnRequestBomOptional1857016000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE return_requests ALTER COLUMN bom_id DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE return_requests ALTER COLUMN bom_id SET NOT NULL`);
  }
}
