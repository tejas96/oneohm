import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec §4.2 H1 — product prices could overlap and nothing broke the tie.
 *
 * `findActiveForProduct` ordered only by a CASE on project_type before calling
 * getOne(), so two active rows for one product/project_type/date window resolved
 * to whichever row Postgres happened to return. That price is then stamped
 * permanently onto a BOM line, so an arbitrary pick is wrong forever.
 *
 * COALESCE(project_type, '') is required: NULL <> NULL in a unique index, so
 * two universal rows sharing an effective_from would otherwise both be allowed.
 */
export class ProductPriceIntegrity1856000000000 implements MigrationInterface {
  name = 'ProductPriceIntegrity1856000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fail loudly rather than silently dropping data if duplicates already exist.
    const dupes = (await queryRunner.query(`
      SELECT product_id, COALESCE(project_type, '') AS pt, effective_from, COUNT(*) AS n
        FROM product_prices
       WHERE is_active = true
       GROUP BY product_id, COALESCE(project_type, ''), effective_from
      HAVING COUNT(*) > 1
    `)) as Array<{ product_id: string; pt: string; effective_from: string; n: string }>;

    if (dupes.length > 0) {
      const detail = dupes
        .map((d) => `product=${d.product_id} project_type='${d.pt}' from=${d.effective_from} (${d.n} rows)`)
        .join('; ');
      throw new Error(
        `Cannot migrate: duplicate active product_prices rows exist. ` +
          `Deactivate the wrong row in the product admin, then re-run: ${detail}`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_product_prices_active_from
        ON product_prices (product_id, COALESCE(project_type, ''), effective_from)
        WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_product_prices_active_from`);
  }
}
