import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Add propertyId to Projects, Migrate Data, and Remove Redundant Columns
 *
 * This migration:
 * 1. Ensures the updated_at trigger function exists
 * 2. Adds property_id column to projects table
 * 3. Migrates existing data from metadata.propertyId to the new column
 * 4. Validates all projects have property_id (fails if any NULL)
 * 5. Makes property_id NOT NULL
 * 6. Adds updated_by column for audit tracking
 * 7. Creates trigger for auto-updating updated_at
 * 8. Standardizes timestamp columns to timestamptz
 * 9. Drops foreign keys for organization_id and customer_id
 * 10. Drops indexes for organization_id and customer_id
 * 11. Drops redundant columns: organization_id, customer_id, site_address, site_coordinates
 */
export class AddPropertyIdToProjectsAndMigrateData1769862461000 implements MigrationInterface {
  name = 'AddPropertyIdToProjectsAndMigrateData1769862461000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. ENSURE TRIGGER FUNCTION EXISTS
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ============================================
    // 2. ADD property_id COLUMN (nullable first for data migration)
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN "property_id" UUID REFERENCES customer_properties(id) ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_projects_property_id" ON "projects"("property_id") 
      WHERE deleted_at IS NULL
    `);

    // ============================================
    // 3. MIGRATE DATA FROM metadata.propertyId
    // ============================================
    await queryRunner.query(`
      UPDATE "projects" 
      SET property_id = (metadata->>'propertyId')::UUID
      WHERE metadata->>'propertyId' IS NOT NULL
        AND property_id IS NULL
    `);

    // ============================================
    // 4. VALIDATE: All active projects must have property_id
    // ============================================
    const nullCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM "projects" 
      WHERE property_id IS NULL AND deleted_at IS NULL
    `);
    if (parseInt(nullCount[0].count, 10) > 0) {
      throw new Error(
        `Cannot proceed with migration: ${nullCount[0].count} active projects have NULL property_id. ` +
          `Please ensure all projects have a valid property_id before running this migration.`,
      );
    }

    // ============================================
    // 5. MAKE property_id NOT NULL
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "property_id" SET NOT NULL
    `);

    // ============================================
    // 6. ADD updated_by COLUMN
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN "updated_by" UUID REFERENCES users(id) ON DELETE SET NULL
    `);

    // ============================================
    // 7. ADD TRIGGER FOR updated_at AUTO-UPDATE
    // ============================================
    await queryRunner.query(`
      CREATE TRIGGER update_projects_updated_at
      BEFORE UPDATE ON "projects"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // ============================================
    // 8. STANDARDIZE TIMESTAMPS (projects only)
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE,
      ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE,
      ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE
    `);

    // ============================================
    // 9. DROP FOREIGN KEYS (organization_id, customer_id)
    // ============================================
    // Try multiple possible constraint names (TypeORM generates different names)
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_organizations"`,
    );

    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_customer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_customer_profiles"`,
    );

    // Drop any auto-generated FK constraints by TypeORM pattern
    const fkConstraints = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'projects' 
        AND constraint_type = 'FOREIGN KEY'
        AND (constraint_name LIKE '%organization%' OR constraint_name LIKE '%customer%')
    `);

    for (const fk of fkConstraints) {
      await queryRunner.query(
        `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`,
      );
    }

    // ============================================
    // 10. DROP INDEXES (organization_id, customer_id)
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_organization"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_organization_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_customer_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_customer_id"`);

    // ============================================
    // 11. DROP REDUNDANT COLUMNS
    // ============================================
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "customer_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "site_address"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "site_coordinates"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. RE-ADD COLUMNS
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN IF NOT EXISTS "organization_id" UUID,
      ADD COLUMN IF NOT EXISTS "customer_id" UUID,
      ADD COLUMN IF NOT EXISTS "site_address" TEXT,
      ADD COLUMN IF NOT EXISTS "site_coordinates" JSONB
    `);

    // ============================================
    // 2. POPULATE FROM property relation
    // ============================================
    await queryRunner.query(`
      UPDATE "projects" p
      SET 
        organization_id = cp.organization_id,
        customer_id = cp.customer_id,
        site_address = COALESCE(cp.address, 'Address not available')
      FROM customer_properties cp
      WHERE p.property_id = cp.id
    `);

    // Handle any projects that might not have matching properties
    await queryRunner.query(`
      UPDATE "projects" 
      SET site_address = 'Address not available' 
      WHERE site_address IS NULL
    `);

    // ============================================
    // 3. MAKE NOT NULL where needed
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "organization_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "customer_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "site_address" SET NOT NULL
    `);

    // ============================================
    // 4. RE-CREATE INDEXES
    // ============================================
    await queryRunner.query(`
      CREATE INDEX "idx_projects_organization_id" ON "projects"("organization_id") 
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_projects_customer_id" ON "projects"("customer_id") 
      WHERE deleted_at IS NULL
    `);

    // ============================================
    // 5. RE-CREATE FOREIGN KEYS
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_organization_id" 
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_customer_id" 
      FOREIGN KEY ("customer_id") REFERENCES "customer_profiles"("id") ON DELETE RESTRICT
    `);

    // ============================================
    // 6. MAKE property_id NULLABLE again
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "property_id" DROP NOT NULL
    `);

    // ============================================
    // 7. DROP trigger
    // ============================================
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_projects_updated_at ON "projects"`);

    // ============================================
    // 8. DROP index
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_property_id"`);

    // ============================================
    // 9. DROP columns added by this migration
    // ============================================
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "property_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "updated_by"`);

    // ============================================
    // 10. REVERT timestamp types
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ALTER COLUMN "created_at" TYPE TIMESTAMP,
      ALTER COLUMN "updated_at" TYPE TIMESTAMP,
      ALTER COLUMN "deleted_at" TYPE TIMESTAMP
    `);
  }
}
