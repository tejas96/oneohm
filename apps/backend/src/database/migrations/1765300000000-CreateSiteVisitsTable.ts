import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Site Visits Table
 * Stores field worker site visits for lead qualification (one-to-one with customer_properties)
 */
export class CreateSiteVisitsTable1765300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // SITE VISITS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE site_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- One-to-One with property (UNIQUE constraint)
        customer_property_id UUID NOT NULL REFERENCES customer_properties(id) ON DELETE CASCADE,
        
        -- Visit info
        visit_number VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        
        -- GPS coordinates (JSONB for flexibility with accuracy)
        gps_coordinates JSONB,
        
        -- Site assessment
        available_roof_area_sqft DECIMAL(10, 2),
        shading_analysis JSONB,
        
        -- Photos & Notes
        photos JSONB,
        visit_notes TEXT,
        
        -- Timestamps (from BaseEntity pattern)
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // ============================================
    // INDEXES
    // ============================================

    // Unique constraint on property (one visit per property)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_site_visits_property 
      ON site_visits(customer_property_id) 
      WHERE deleted_at IS NULL;
    `);

    // Unique visit number
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_site_visits_number 
      ON site_visits(visit_number) 
      WHERE deleted_at IS NULL;
    `);

    // Status filtering
    await queryRunner.query(`
      CREATE INDEX idx_site_visits_status 
      ON site_visits(status) 
      WHERE deleted_at IS NULL;
    `);

    // Created timestamp for ordering
    await queryRunner.query(`
      CREATE INDEX idx_site_visits_created_at 
      ON site_visits(created_at DESC);
    `);

    // ============================================
    // TRIGGER: Auto-update updated_at
    // Uses existing update_updated_at_column() function
    // ============================================
    await queryRunner.query(`
      CREATE TRIGGER update_site_visits_updated_at
      BEFORE UPDATE ON site_visits
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_site_visits_updated_at ON site_visits;`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_site_visits_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_site_visits_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_site_visits_number;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_site_visits_property;`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS site_visits;`);
  }
}
