import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TRANSITIONAL — Task 20 must drop `bom_items.item_type` and `bom_items.name`
 * entirely.
 *
 * Both are unmapped legacy columns: Task 11's BomItemEntity reaches catalog
 * attributes by joining `products` instead of snapshotting them onto the item
 * row, so nothing in the new code supplies either value. Neither column's NOT
 * NULL constraint was relaxed to match, so the first real INSERT through the
 * entity raises:
 *
 *   null value in column "item_type" of relation "bom_items"
 *     violates not-null constraint
 *
 * Task 14's BomEditService.addItem and .replaceItem are the first callers to
 * hit it, and Task 15's applyRebaseline follows.
 *
 * This is the THIRD instance of one pattern in this rebuild — a column stayed
 * mandatory after its writer stopped supplying it:
 *   1856600000000  bom_items.source / pricing_basis / unit_price_paise (Task 8)
 *   1856750000000  bom.entity_type / entity_id                        (Task 11)
 *   this one       bom_items.item_type / name                         (Task 14)
 *
 * DROP NOT NULL rather than a DEFAULT, following 1856750000000 rather than
 * 1856600000000: the earlier fix could invent one honest fallback per column,
 * but there is none here. `name` and `item_type` are per-product values that
 * would have to be read from the joined `products` row, and a column default
 * cannot reach another table. A placeholder such as '' or 'other' would be a
 * fabricated fact sitting in a column the whole rebuild exists to remove.
 *
 * Confirmed the readers of both columns are already dead or scheduled: the
 * pre-Task-16 path in bom.service.ts and project.service.ts (both currently
 * failing typecheck against them) is rewritten by Task 16, and Task 20 drops
 * the columns outright.
 *
 * DO NOT re-tighten these. There is no future state where they go back to NOT
 * NULL — Task 20 removes them.
 */
export class BomItemLegacyColsNullable1856760000000 implements MigrationInterface {
  name = 'BomItemLegacyColsNullable1856760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN item_type DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN name DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Honest, not defensive: every row written by BomEditService since up() ran
    // leaves both columns null, so this FAILS LOUDLY on any BOM edited after
    // this migration rather than silently backfilling a made-up value. That is
    // the intended behaviour — reverting past this point means the rows the new
    // writer created have to be dealt with deliberately.
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN name SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN item_type SET NOT NULL`);
  }
}
