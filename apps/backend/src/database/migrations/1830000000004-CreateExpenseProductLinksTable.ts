import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CreateExpenseProductLinksTable
 *
 * Plan §2.4 — itemization of an expense. A row may link to either:
 *   (a) a catalog product (`product_id` populated) → participates in BOM
 *       procurement aggregation and inventory transactions, or
 *   (b) an off-list item (`product_id` NULL, `item_name` populated) →
 *       recorded for transparency only, no BOM/inventory impact.
 *
 * Deliberately no FK to `bom_items.id` (so BOM re-syncs don't cascade
 * here) and no FK to the product catalog (so deleted/historical products
 * still resolve as soft references).
 */
export class CreateExpenseProductLinksTable1830000000004 implements MigrationInterface {
  name = 'CreateExpenseProductLinksTable1830000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expense_product_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_id UUID NOT NULL,
        product_id UUID,
        item_name VARCHAR(255),
        unit VARCHAR(20),
        quantity NUMERIC(15, 3) NOT NULL,
        unit_price NUMERIC(15, 2),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_expense_product_links_expense
          FOREIGN KEY (expense_id) REFERENCES project_expenses(id) ON DELETE CASCADE,

        CONSTRAINT chk_expense_product_links_quantity_positive CHECK (quantity > 0),
        CONSTRAINT chk_expense_product_links_identity
          CHECK (product_id IS NOT NULL OR item_name IS NOT NULL)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_expense_product_links_expense
        ON expense_product_links(expense_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_expense_product_links_product
        ON expense_product_links(product_id)
        WHERE product_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_expense_product_links_product;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_expense_product_links_expense;`);
    await queryRunner.query(`DROP TABLE IF EXISTS expense_product_links;`);
  }
}
