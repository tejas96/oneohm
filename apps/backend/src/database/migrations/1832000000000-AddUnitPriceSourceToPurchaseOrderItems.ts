import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive, nullable column tracking whether the unit price on a purchase
 * order line was suggested by the catalog (PricingService) or manually
 * overridden by the buyer at PO creation time. Pure variance/audit signal;
 * no existing flow reads or writes this column today.
 *
 * Values written by the app:
 *   - 'suggested'        -- prefilled from PricingService and untouched
 *   - 'manual_override'  -- user edited the prefilled price (or had no
 *                           catalog price to begin with)
 *   - NULL               -- legacy rows + any external creator that doesn't
 *                           know about this column (no behavior change)
 */
export class AddUnitPriceSourceToPurchaseOrderItems1832000000000 implements MigrationInterface {
  name = 'AddUnitPriceSourceToPurchaseOrderItems1832000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_order_items"
        ADD COLUMN IF NOT EXISTS "unit_price_source" VARCHAR(20) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "purchase_order_items"
        ADD CONSTRAINT "chk_po_items_unit_price_source"
        CHECK ("unit_price_source" IS NULL OR "unit_price_source" IN ('suggested', 'manual_override'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP CONSTRAINT IF EXISTS "chk_po_items_unit_price_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "unit_price_source"`,
    );
  }
}
