import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TRANSITIONAL — Task 20 must drop `bom.entity_type` and `bom.entity_id`
 * entirely.
 *
 * Task 11 stopped mapping either column on BomEntity (project_id replaced the
 * polymorphic reference), but neither column's NOT NULL constraint was
 * relaxed to match — they were left exactly as strict as when they were the
 * only reference a BOM had. BomRepository.createForProject only ever writes
 * project_id, so the first real INSERT through it raises a not-null
 * violation on entity_type. Task 15 is the first caller that would hit it.
 *
 * Same shape as 1856600000000-BomItemTransitionalDefaults: a column stayed
 * mandatory after its writer stopped supplying it. That fix used a DEFAULT
 * because each of bom_items' three columns has one honest fallback value.
 * These two don't — entity_id would have to equal project_id, and a column
 * default cannot read another column of the same row — so the fix here is
 * DROP NOT NULL instead of inventing a value.
 *
 * Confirmed nothing outside bom.controller.ts, bom-response.dto.ts and
 * bom.service.ts still reads either column; all three are deleted or
 * rewritten by Task 16.
 *
 * DO NOT re-tighten these. Task 20 drops both columns outright once Task 16
 * ships — there is no future state where they go back to NOT NULL.
 */
export class BomEntityRefNullable1856750000000 implements MigrationInterface {
  name = 'BomEntityRefNullable1856750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE bom ALTER COLUMN entity_type DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE bom ALTER COLUMN entity_id DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Honest, not defensive: this fails loudly if any row has picked up a
    // null in either column since up() ran, rather than silently coercing one.
    await queryRunner.query(`ALTER TABLE bom ALTER COLUMN entity_type SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE bom ALTER COLUMN entity_id SET NOT NULL`);
  }
}
