import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Customer Properties Table
 * Separates property/site data from customer profiles (one customer -> many properties)
 * Also adds property_id to quotes table
 */
export class CreateCustomerPropertiesTable1765200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // CUSTOMER PROPERTIES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE customer_properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        
        -- Property Details
        property_name VARCHAR(255),
        property_type VARCHAR(50) DEFAULT 'residential',
        
        -- Address
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        pincode VARCHAR(10),
        location_coordinates POINT,
        
        -- Electricity/Consumer Details
        consumer_number VARCHAR(50),
        consumer_name VARCHAR(255),
        current_load VARCHAR(50),
        discom_name VARCHAR(100),
        connection_type VARCHAR(20),
        sanctioned_load DECIMAL(10,2),
        meter_number VARCHAR(50),
        
        -- Site Details
        monthly_bill DECIMAL(10,2),
        roof_area_sqft DECIMAL(10,2),
        
        -- Lead Tracking
        lead_temperature VARCHAR(20) DEFAULT 'warm',
        next_follow_up_date DATE,
        last_contact_date TIMESTAMP WITH TIME ZONE,
        follow_up_notes TEXT,
        
        -- Flags
        is_primary BOOLEAN DEFAULT FALSE,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active',
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by UUID,
        updated_by UUID
      );
    `);

    // ============================================
    // INDEXES FOR CUSTOMER PROPERTIES
    // ============================================
    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_customer_org 
      ON customer_properties(customer_id, organization_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_org_status 
      ON customer_properties(organization_id, status, deleted_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_org_temperature 
      ON customer_properties(organization_id, lead_temperature, deleted_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_follow_up 
      ON customer_properties(next_follow_up_date);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_consumer_number 
      ON customer_properties(consumer_number) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_pincode 
      ON customer_properties(pincode);
    `);

    // ============================================
    // ADD PROPERTY_ID TO QUOTES TABLE
    // ============================================
    await queryRunner.query(`
      ALTER TABLE quotes 
      ADD COLUMN property_id UUID REFERENCES customer_properties(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_quotes_property_id ON quotes(property_id);
    `);

    // ============================================
    // DROP DEPRECATED COLUMNS FROM CUSTOMER_PROFILES
    // ============================================
    // These columns have been moved to customer_properties

    // Drop consumer details (moved to properties)
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS consumer_number;
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS consumer_name;
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS current_load;
    `);

    // Drop property details (moved to properties)
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS property_name;
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS property_type;
    `);

    // Drop location_coordinates (now only on properties)
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS location_coordinates;
    `);

    // Drop reseller_id (now on quotes/projects)
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS FK_customer_profiles_reseller_id;
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS reseller_id;
    `);

    // Drop the consumer_number index (column no longer exists)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_profiles_consumer_number;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // RESTORE COLUMNS TO CUSTOMER_PROFILES
    // ============================================
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS consumer_number VARCHAR(50);
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS consumer_name VARCHAR(255);
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS current_load VARCHAR(50);
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS property_name VARCHAR(255);
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS location_coordinates POINT;
    `);
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN IF NOT EXISTS reseller_id UUID;
    `);

    // Restore index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_profiles_consumer_number 
      ON customer_profiles(consumer_number) WHERE deleted_at IS NULL;
    `);

    // Restore FK constraint
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD CONSTRAINT FK_customer_profiles_reseller_id 
      FOREIGN KEY (reseller_id) REFERENCES reseller_profiles(id) ON DELETE SET NULL;
    `);

    // ============================================
    // REMOVE PROPERTY_ID FROM QUOTES
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS idx_quotes_property_id;`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS property_id;`);

    // ============================================
    // DROP CUSTOMER_PROPERTIES TABLE
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_pincode;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_consumer_number;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_follow_up;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_org_temperature;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_org_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_customer_org;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_properties;`);
  }
}

