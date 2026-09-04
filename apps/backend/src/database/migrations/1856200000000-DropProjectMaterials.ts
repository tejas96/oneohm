import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Task 5 — retire `project_materials`, a complete second bill of materials.
 *
 * It carried its own name, quantity, cost and status columns, a
 * `stock_allocation_id` FK, and nine REST routes at
 * `/projects/:projectId/materials` — but no frontend called any of them
 * (grepping apps/web, oneohm-mobile and oneohm-consumer-mobo-app for the
 * routes, `useMaterials`, and `project-materials` turned up nothing beyond
 * dead type declarations). Two tables cannot both answer "what does this
 * project need"; `bom_items` is becoming the one answer (Phase C).
 *
 * Verified empty before this migration was written: 0 total rows, 0 live,
 * 0 distinct projects (2026-09-03, `oneohm_epc_bom`). Nothing to back up.
 *
 * Irreversible by design: down() recreates the table's shape so a rollback
 * does not break the migration chain, but no data comes back with it.
 */
export class DropProjectMaterials1856200000000 implements MigrationInterface {
  name = 'DropProjectMaterials1856200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensive: this environment has no such trigger, but IF EXISTS keeps
    // this safe to run anywhere the naming convention was actually applied.
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS set_timestamp_project_materials ON project_materials`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS project_materials CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Shape only, matching the table as it stood immediately before this
    // migration (columns, constraints and indexes). The data is not
    // recoverable from here.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_materials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL,
        product_id UUID,
        material_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity_required DECIMAL(10,2) NOT NULL,
        quantity_allocated DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity_used DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL,
        unit_cost DECIMAL(10,2),
        total_cost DECIMAL(12,2),
        status VARCHAR(50) NOT NULL DEFAULT 'required',
        procurement_date DATE,
        allocation_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        created_by UUID,
        updated_by UUID,
        stock_allocation_id UUID,
        CONSTRAINT "FK_materials_project" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT "FK_materials_product" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        CONSTRAINT "project_materials_stock_allocation_id_fkey" FOREIGN KEY (stock_allocation_id) REFERENCES stock_allocations(id) ON DELETE SET NULL,
        CONSTRAINT chk_materials_status CHECK (status IN ('required', 'ordered', 'in_transit', 'allocated', 'used'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_materials_project ON project_materials (project_id) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_materials_status ON project_materials (status) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_project_materials_stock_allocation ON project_materials (stock_allocation_id) WHERE stock_allocation_id IS NOT NULL`,
    );
  }
}
