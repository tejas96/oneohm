import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Spec §4.2 H4 — code uniqueness ignored soft deletes.
 *
 * sql/org-cleanup/03-indexes.sql.ts created these as plain UNIQUE (code) while
 * every one of these tables has a deleted_at column and a softDelete path. A
 * soft-deleted row therefore held its code hostage: re-adding it failed on a
 * unique violation with nothing on screen to explain why.
 *
 * payments and project_expenses in that same file already carry the predicate,
 * so this brings the rest of the family into line.
 */
export class PartialCodeUniqueIndexes1856100000000 implements MigrationInterface {
  name = 'PartialCodeUniqueIndexes1856100000000';

  private readonly targets: Array<{ index: string; table: string; column: string }> = [
    { index: 'uq_products_code', table: 'products', column: 'code' },
    { index: 'uq_product_types_code', table: 'product_types', column: 'code' },
    { index: 'uq_brands_name', table: 'brands', column: 'name' },
    { index: 'uq_vendors_code', table: 'vendors', column: 'code' },
    { index: 'uq_warehouses_code', table: 'warehouses', column: 'code' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const t of this.targets) {
      // Two live rows sharing a code would block the new index. Surface them
      // rather than choosing a survivor here.
      const dupes = (await queryRunner.query(`
        SELECT ${t.column} AS value, COUNT(*) AS n
          FROM ${t.table}
         WHERE deleted_at IS NULL
         GROUP BY ${t.column}
        HAVING COUNT(*) > 1
      `)) as Array<{ value: string; n: string }>;

      if (dupes.length > 0) {
        const detail = dupes.map((d) => `${d.value} (${d.n})`).join(', ');
        throw new Error(`Cannot migrate: ${t.table}.${t.column} has live duplicates: ${detail}`);
      }

      await queryRunner.query(`DROP INDEX IF EXISTS ${t.index}`);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ${t.index}
          ON ${t.table} (${t.column})
          WHERE deleted_at IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const t of this.targets) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${t.index}`);
      await queryRunner.query(`
        CREATE UNIQUE INDEX ${t.index} ON ${t.table} (${t.column})
      `);
    }
  }
}
