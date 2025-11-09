import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Products & Pricing Tables
 * Module: Products & Pricing (Module 6)
 */
export class CreateProductsPricingTables1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // CREATE update_timestamp FUNCTION IF NOT EXISTS
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ============================================
    // PRODUCT_CATEGORIES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE product_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        
        -- Basic Info
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        
        -- Hierarchy (self-referencing, max 3 levels)
        parent_category_id UUID REFERENCES product_categories(id),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        
        UNIQUE(organization_id, code)
      );
    `);

    // Create indexes for product_categories
    await queryRunner.query(`
      CREATE INDEX idx_product_categories_org ON product_categories(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_product_categories_parent ON product_categories(parent_category_id);
    `);

    // ============================================
    // PRODUCTS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        category_id UUID REFERENCES product_categories(id),
        
        -- Basic Info
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Product Type
        type VARCHAR(50) NOT NULL,
        
        -- Specifications (Hybrid: common + flexible)
        specifications JSONB,
        
        -- Brand & Manufacturer
        brand VARCHAR(100),
        manufacturer VARCHAR(255),
        model_number VARCHAR(100),
        
        -- Unit
        unit_of_measure VARCHAR(20) DEFAULT 'pcs',
        
        -- Warranty
        product_warranty_years INTEGER,
        performance_warranty_years INTEGER,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        
        UNIQUE(organization_id, code)
      );
    `);

    // Create indexes for products
    await queryRunner.query(`
      CREATE INDEX idx_products_organization ON products(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_products_type ON products(type) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_products_brand ON products(brand) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_products_status ON products(organization_id, status, deleted_at);
    `);

    // ============================================
    // PRICING_RULES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE pricing_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        
        -- Rule Info
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Rule Type
        rule_type VARCHAR(50) NOT NULL,
        
        -- Applicability
        product_id UUID REFERENCES products(id),
        product_type VARCHAR(50),
        project_type VARCHAR(50),
        
        -- Pricing Formula (flexible JSONB structure)
        formula JSONB NOT NULL,
        
        -- Date Range
        effective_from DATE NOT NULL,
        effective_to DATE,
        
        -- Priority (higher number = higher priority)
        priority INTEGER DEFAULT 0,
        
        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        
        UNIQUE(organization_id, code)
      );
    `);

    // Create indexes for pricing_rules
    await queryRunner.query(`
      CREATE INDEX idx_pricing_rules_organization ON pricing_rules(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pricing_rules_product ON pricing_rules(product_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pricing_rules_type ON pricing_rules(rule_type) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pricing_rules_dates ON pricing_rules(effective_from, effective_to) WHERE is_active = TRUE;
    `);

    // ============================================
    // TRIGGERS FOR UPDATED_AT
    // ============================================
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_product_categories
      BEFORE UPDATE ON product_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_products
      BEFORE UPDATE ON products
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_pricing_rules
      BEFORE UPDATE ON pricing_rules
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_pricing_rules ON pricing_rules;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_products ON products;`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS set_timestamp_product_categories ON product_categories;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS products;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_categories;`);
  }
}
