import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Enables pg_trgm and creates GIN trigram indexes that back the upcoming
 * federated GET /inventory/search endpoint. Without these, every ILIKE '%q%'
 * scan is a sequential scan and the search endpoint will not survive 1000s
 * of projects/month.
 *
 * Indexes (all USING gin (lower(col) gin_trgm_ops)):
 *   - products.name
 *   - vendors.name
 *   - warehouses.name
 *   - purchase_orders.po_number
 *   - material_dispatches.dispatch_number
 *
 * Note on CONCURRENTLY: TypeORM runs migrations inside a transaction and
 * CREATE INDEX CONCURRENTLY is not allowed inside one. On large production
 * tables the operator can run the equivalent CONCURRENTLY statements
 * manually before applying this migration; the IF NOT EXISTS clauses make
 * the migration a no-op in that case.
 */
export class AddInventorySearchTrigramIndexes1824000000000 implements MigrationInterface {
  name = 'AddInventorySearchTrigramIndexes1824000000000';

  private readonly indexes: { name: string; table: string; column: string }[] = [
    { name: 'idx_products_name_trgm', table: 'products', column: 'name' },
    { name: 'idx_vendors_name_trgm', table: 'vendors', column: 'name' },
    { name: 'idx_warehouses_name_trgm', table: 'warehouses', column: 'name' },
    { name: 'idx_purchase_orders_po_number_trgm', table: 'purchase_orders', column: 'po_number' },
    {
      name: 'idx_material_dispatches_dispatch_number_trgm',
      table: 'material_dispatches',
      column: 'dispatch_number',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    for (const { name, table, column } of this.indexes) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS ${name} ON ${table} USING gin (lower(${column}) gin_trgm_ops)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { name } of this.indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${name}`);
    }
  }
}
