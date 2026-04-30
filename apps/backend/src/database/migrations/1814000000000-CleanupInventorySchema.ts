import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: CleanupInventorySchema
 *
 * Addresses issues found in the original CreateInventoryTables migration:
 * 1. Multi-tenant uniqueness: po_number and dispatch_number must be org-scoped
 * 2. Missing CHECK on inventory_transactions.transaction_type
 * 3. Missing indexes on transactions, allocations, dispatches, POs, stock
 * 4. Missing columns: warehouses.country, stock_allocations.returned_at,
 *    project_vendors.currency, purchase_orders.discount_amount
 * 5. Missing FK on purchase_orders.approval_request_id
 * 6. Audit user FKs on warehouses, stock_allocations, project_vendors
 * 7. project_vendors NULL vendor_role uniqueness fix
 *
 * All status/type columns remain VARCHAR + CHECK — zero Postgres ENUMs.
 */
export class CleanupInventorySchema1814000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. Fix po_number uniqueness: global → org-scoped
    // ============================================================
    // Pre-flight: detect cross-org duplicates (logs them; migration fails loudly if found)
    const duplicatePos = await queryRunner.query(`
      SELECT po_number, COUNT(DISTINCT organization_id) as org_count
      FROM purchase_orders
      WHERE deleted_at IS NULL
      GROUP BY po_number
      HAVING COUNT(DISTINCT organization_id) > 1
    `);
    if (duplicatePos.length > 0) {
      throw new Error(
        `Cannot migrate po_number uniqueness — cross-org duplicates found: ${JSON.stringify(duplicatePos)}. Rename conflicting PO numbers before re-running.`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_po_number_key`,
    );
    await queryRunner.query(
      `ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS uq_purchase_orders_po_number`,
    );
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD CONSTRAINT uq_purchase_orders_org_po_number UNIQUE (organization_id, po_number)
    `);

    // ============================================================
    // 2. Fix dispatch_number uniqueness: global → org-scoped
    // ============================================================
    const hasMaterialDispatchDeletedAt = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'material_dispatches'
        AND column_name = 'deleted_at'
    `);
    const duplicateDispatches = await queryRunner.query(`
      SELECT dispatch_number, COUNT(DISTINCT organization_id) as org_count
      FROM material_dispatches
      ${hasMaterialDispatchDeletedAt.length > 0 ? 'WHERE deleted_at IS NULL' : ''}
      GROUP BY dispatch_number
      HAVING COUNT(DISTINCT organization_id) > 1
    `);
    if (duplicateDispatches.length > 0) {
      throw new Error(
        `Cannot migrate dispatch_number uniqueness — cross-org duplicates found: ${JSON.stringify(duplicateDispatches)}. Rename before re-running.`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE material_dispatches DROP CONSTRAINT IF EXISTS material_dispatches_dispatch_number_key`,
    );
    await queryRunner.query(
      `ALTER TABLE material_dispatches DROP CONSTRAINT IF EXISTS uq_material_dispatches_dispatch_number`,
    );
    await queryRunner.query(`
      ALTER TABLE material_dispatches
      ADD CONSTRAINT uq_material_dispatches_org_dispatch_number UNIQUE (organization_id, dispatch_number)
    `);

    // ============================================================
    // 3. Add CHECK on inventory_transactions.transaction_type
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      ADD CONSTRAINT chk_inventory_transactions_type
      CHECK (transaction_type IN (
        'purchase', 'sale', 'transfer_in', 'transfer_out',
        'adjustment', 'allocation', 'dispatch', 'return',
        'PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT',
        'ADJUSTMENT', 'ALLOCATION', 'DISPATCH', 'RETURN'
      ))
    `);

    // ============================================================
    // 4. Add missing indexes
    // ============================================================

    // inventory_transactions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_org
      ON inventory_transactions(organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_org_date
      ON inventory_transactions(organization_id, transaction_date DESC)
    `);

    // stock_allocations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_allocations_org
      ON stock_allocations(organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_allocations_org_status
      ON stock_allocations(organization_id, status)
    `);

    // material_dispatches
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_dispatches_org
      ON material_dispatches(organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_material_dispatches_org_status
      ON material_dispatches(organization_id, status)
    `);

    // purchase_orders
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status
      ON purchase_orders(organization_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_vendor
      ON purchase_orders(organization_id, vendor_id)
    `);

    // inventory_stock
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_stock_org_warehouse
      ON inventory_stock(organization_id, warehouse_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_stock_org_product
      ON inventory_stock(organization_id, product_id)
    `);

    // ============================================================
    // 5. Add missing columns
    // ============================================================

    // warehouses.country
    await queryRunner.query(`
      ALTER TABLE warehouses
      ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India'
    `);

    // stock_allocations.returned_at
    await queryRunner.query(`
      ALTER TABLE stock_allocations
      ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE
    `);

    // project_vendors.currency
    await queryRunner.query(`
      ALTER TABLE project_vendors
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR'
    `);

    // ============================================================
    // 6. Add FK on purchase_orders.approval_request_id (NOT VALID to avoid blocking)
    // ============================================================
    const hasApprovalRequestId = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'purchase_orders' AND column_name = 'approval_request_id'
    `);
    if (hasApprovalRequestId.length > 0) {
      await queryRunner.query(`
        ALTER TABLE purchase_orders
        ADD CONSTRAINT fk_purchase_orders_approval_request
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id)
        ON DELETE SET NULL
        NOT VALID
      `);
      await queryRunner.query(`
        ALTER TABLE purchase_orders
        VALIDATE CONSTRAINT fk_purchase_orders_approval_request
      `);
    }

    // ============================================================
    // 7. project_vendors NULL vendor_role uniqueness fix
    //    Add partial unique index for rows where vendor_role IS NULL
    //    to prevent (project_id, vendor_id, NULL) duplicates
    // ============================================================
    const hasProjectVendorsDeletedAt = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'project_vendors'
        AND column_name = 'deleted_at'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_project_vendors_null_role
      ON project_vendors (project_id, vendor_id)
      WHERE vendor_role IS NULL ${hasProjectVendorsDeletedAt.length > 0 ? 'AND deleted_at IS NULL' : ''}
    `);

    // ============================================================
    // 8. Add audit user FKs where missing
    // ============================================================
    const hasWarehousesCreatedBy = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'warehouses' AND column_name = 'created_by'
    `);
    if (hasWarehousesCreatedBy.length > 0) {
      await queryRunner.query(`
        ALTER TABLE warehouses
        ADD CONSTRAINT fk_warehouses_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        NOT VALID
      `);
    }

    const hasWarehousesUpdatedBy = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'warehouses' AND column_name = 'updated_by'
    `);
    if (hasWarehousesUpdatedBy.length > 0) {
      await queryRunner.query(`
        ALTER TABLE warehouses
        ADD CONSTRAINT fk_warehouses_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        NOT VALID
      `);
    }

    const hasStockAllocationsCreatedBy = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stock_allocations' AND column_name = 'created_by'
    `);
    if (hasStockAllocationsCreatedBy.length > 0) {
      await queryRunner.query(`
        ALTER TABLE stock_allocations
        ADD CONSTRAINT fk_stock_allocations_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        NOT VALID
      `);
    }

    const hasStockAllocationsUpdatedBy = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'stock_allocations' AND column_name = 'updated_by'
    `);
    if (hasStockAllocationsUpdatedBy.length > 0) {
      await queryRunner.query(`
        ALTER TABLE stock_allocations
        ADD CONSTRAINT fk_stock_allocations_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        NOT VALID
      `);
    }

    const hasProjectVendorsCreatedBy = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'project_vendors' AND column_name = 'created_by'
    `);
    if (hasProjectVendorsCreatedBy.length > 0) {
      await queryRunner.query(`
        ALTER TABLE project_vendors
        ADD CONSTRAINT fk_project_vendors_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        NOT VALID
      `);
    }

    const hasProjectVendorsUpdatedBy = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'project_vendors' AND column_name = 'updated_by'
    `);
    if (hasProjectVendorsUpdatedBy.length > 0) {
      await queryRunner.query(`
        ALTER TABLE project_vendors
        ADD CONSTRAINT fk_project_vendors_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        NOT VALID
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove partial unique index
    await queryRunner.query(`DROP INDEX IF EXISTS uq_project_vendors_null_role`);

    // Restore global uniqueness constraints
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      DROP CONSTRAINT IF EXISTS uq_purchase_orders_org_po_number
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD CONSTRAINT uq_purchase_orders_po_number UNIQUE (po_number)
    `);

    await queryRunner.query(`
      ALTER TABLE material_dispatches
      DROP CONSTRAINT IF EXISTS uq_material_dispatches_org_dispatch_number
    `);
    await queryRunner.query(`
      ALTER TABLE material_dispatches
      ADD CONSTRAINT uq_material_dispatches_dispatch_number UNIQUE (dispatch_number)
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_org`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_org_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_allocations_org`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_allocations_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_dispatches_org`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_dispatches_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_orders_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_orders_org_vendor`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_stock_org_warehouse`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_stock_org_product`);

    // Drop CHECK constraint
    await queryRunner.query(
      `ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS chk_inventory_transactions_type`,
    );

    // Drop added columns
    await queryRunner.query(`ALTER TABLE warehouses DROP COLUMN IF EXISTS country`);
    await queryRunner.query(`ALTER TABLE stock_allocations DROP COLUMN IF EXISTS returned_at`);
    await queryRunner.query(`ALTER TABLE project_vendors DROP COLUMN IF EXISTS currency`);

    // Drop FKs
    await queryRunner.query(
      `ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS fk_purchase_orders_approval_request`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS fk_warehouses_created_by`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS fk_warehouses_updated_by`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_allocations DROP CONSTRAINT IF EXISTS fk_stock_allocations_created_by`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_allocations DROP CONSTRAINT IF EXISTS fk_stock_allocations_updated_by`,
    );
    await queryRunner.query(
      `ALTER TABLE project_vendors DROP CONSTRAINT IF EXISTS fk_project_vendors_created_by`,
    );
    await queryRunner.query(
      `ALTER TABLE project_vendors DROP CONSTRAINT IF EXISTS fk_project_vendors_updated_by`,
    );
  }
}
