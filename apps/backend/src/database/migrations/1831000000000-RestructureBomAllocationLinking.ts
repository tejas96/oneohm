import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestructureBomAllocationLinking1831000000000 implements MigrationInterface {
  name = 'RestructureBomAllocationLinking1831000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Warehouse moves from BOM to Project
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "default_warehouse_id" UUID REFERENCES "warehouses"("id") ON DELETE SET NULL
    `);

    // 2. Drop the now-superseded warehouse column from BOM
    //    (was allocated_warehouse_id, used only in local dev)
    await queryRunner.query(`
      ALTER TABLE "bom"
        DROP COLUMN IF EXISTS "allocated_warehouse_id"
    `);

    // 3. Link stock_allocations back to the BOM that spawned them.
    //    ON DELETE RESTRICT: DB refuses to drop a BOM with active allocations,
    //    forcing callers through the reconcile/cancel path.
    await queryRunner.query(`
      ALTER TABLE "stock_allocations"
        ADD COLUMN "bom_id" UUID REFERENCES "bom"("id") ON DELETE RESTRICT
    `);

    // 4. Partial unique index: only one active allocation per (bom, product).
    //    Cancelled allocations are excluded so a fresh one can be created after cancellation.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uniq_stock_alloc_bom_product_active"
        ON "stock_allocations" ("bom_id", "product_id")
        WHERE status NOT IN ('cancelled')
    `);

    // 5. General lookup index on bom_id for reconcile queries
    await queryRunner.query(`
      CREATE INDEX "idx_stock_alloc_bom"
        ON "stock_allocations" ("bom_id")
    `);

    // 6. Return requests — created automatically when required qty drops below dispatched qty.
    //    PM must confirm physical return (complete) or write off (cancel).
    await queryRunner.query(`
      CREATE TABLE "return_requests" (
        "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" UUID        NOT NULL REFERENCES "organizations"("id"),
        "allocation_id"   UUID        NOT NULL REFERENCES "stock_allocations"("id"),
        "bom_id"          UUID        NOT NULL REFERENCES "bom"("id"),
        "quantity"        NUMERIC(15,3) NOT NULL CHECK ("quantity" > 0),
        "reason"          TEXT        NOT NULL,
        "status"          VARCHAR(20) NOT NULL DEFAULT 'pending',
        "completed_at"    TIMESTAMPTZ,
        "completed_by"    UUID        REFERENCES "users"("id"),
        "created_by"      UUID        NOT NULL REFERENCES "users"("id"),
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_return_requests" PRIMARY KEY ("id"),
        CONSTRAINT "chk_return_requests_status" CHECK ("status" IN ('pending', 'completed', 'cancelled'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_return_requests_allocation"
        ON "return_requests" ("allocation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_return_requests_status"
        ON "return_requests" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_return_requests_bom"
        ON "return_requests" ("bom_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_return_requests_bom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_return_requests_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_return_requests_allocation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "return_requests"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_stock_alloc_bom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_stock_alloc_bom_product_active"`);
    await queryRunner.query(`ALTER TABLE "stock_allocations" DROP COLUMN IF EXISTS "bom_id"`);
    await queryRunner.query(`
      ALTER TABLE "bom"
        ADD COLUMN IF NOT EXISTS "allocated_warehouse_id" UUID REFERENCES "warehouses"("id")
    `);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "default_warehouse_id"`);
  }
}
