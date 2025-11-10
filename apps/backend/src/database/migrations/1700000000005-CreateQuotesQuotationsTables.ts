import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Quotes & Quotations Tables
 * Creates tables for quotes, quote_versions, and quote_line_items
 */
export class CreateQuotesQuotationsTables1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // QUOTES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        customer_id UUID NOT NULL REFERENCES customers(id),
        
        -- Quote Info
        quote_number VARCHAR(50) UNIQUE NOT NULL,
        quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
        valid_until DATE NOT NULL,
        
        -- Version Control
        current_version INTEGER DEFAULT 1,
        
        -- System Details
        system_type VARCHAR(50) NOT NULL,
        system_size_kw DECIMAL(10,2) NOT NULL,
        total_wattage_wp INTEGER NOT NULL,
        
        -- Project Type
        project_type VARCHAR(50) NOT NULL,
        
        -- Pricing Summary
        base_price DECIMAL(15,2),
        gst_amount DECIMAL(15,2),
        total_price DECIMAL(15,2),
        discount_amount DECIMAL(15,2) DEFAULT 0,
        final_price DECIMAL(15,2),
        
        -- Subsidy
        is_subsidy_applicable BOOLEAN DEFAULT FALSE,
        subsidy_amount DECIMAL(15,2) DEFAULT 0,
        effective_price DECIMAL(15,2),
        
        -- Status
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
        
        -- Acceptance
        accepted_at TIMESTAMP WITH TIME ZONE,
        accepted_by_customer_signature TEXT,
        rejection_reason TEXT,
        
        -- Notes
        internal_notes TEXT,
        customer_notes TEXT,
        
        -- Assigned To
        sales_person_id UUID REFERENCES users(id),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id)
      );

      -- Indexes for quotes
      CREATE INDEX idx_quotes_organization ON quotes(organization_id) WHERE deleted_at IS NULL;
      CREATE INDEX idx_quotes_customer ON quotes(customer_id) WHERE deleted_at IS NULL;
      CREATE INDEX idx_quotes_number ON quotes(quote_number);
      CREATE INDEX idx_quotes_status ON quotes(status) WHERE deleted_at IS NULL;
      CREATE INDEX idx_quotes_date ON quotes(quote_date);
      CREATE INDEX idx_quotes_sales_person ON quotes(sales_person_id);

      -- Trigger for updated_at
      CREATE TRIGGER set_timestamp_quotes
      BEFORE UPDATE ON quotes
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // ============================================
    // QUOTE_VERSIONS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE quote_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        
        version_number INTEGER NOT NULL,
        
        -- System Details
        system_type VARCHAR(50) NOT NULL,
        system_size_kw DECIMAL(10,2) NOT NULL,
        total_wattage_wp INTEGER NOT NULL,
        
        -- Pricing Details
        base_price DECIMAL(15,2) NOT NULL,
        gst_12_on_70_percent DECIMAL(15,2),
        gst_18_on_30_percent DECIMAL(15,2),
        total_gst DECIMAL(15,2),
        total_price DECIMAL(15,2) NOT NULL,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        final_price DECIMAL(15,2) NOT NULL,
        
        -- Subsidy
        subsidy_amount DECIMAL(15,2) DEFAULT 0,
        effective_price DECIMAL(15,2),
        
        -- Payment Milestones (JSONB)
        payment_milestones JSONB,
        
        -- Timeline
        project_completion_weeks INTEGER DEFAULT 4,
        
        -- Version metadata
        change_summary TEXT,
        is_current BOOLEAN DEFAULT TRUE,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id),
        
        UNIQUE(quote_id, version_number)
      );

      -- Indexes for quote_versions
      CREATE INDEX idx_quote_versions_quote ON quote_versions(quote_id);
      CREATE INDEX idx_quote_versions_current ON quote_versions(quote_id, is_current) WHERE is_current = TRUE;
    `);

    // ============================================
    // QUOTE_LINE_ITEMS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE quote_line_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
        
        -- Item Details
        item_category VARCHAR(50) NOT NULL,
        product_id UUID REFERENCES products(id),
        
        -- Description
        item_name VARCHAR(255) NOT NULL,
        item_description TEXT,
        specifications JSONB,
        
        -- Quantity & Pricing
        quantity INTEGER NOT NULL,
        unit_of_measure VARCHAR(20),
        unit_price DECIMAL(15,2) NOT NULL,
        line_total DECIMAL(15,2) NOT NULL,
        
        -- Tax
        tax_rate DECIMAL(5,2),
        tax_amount DECIMAL(15,2),
        
        -- Sort order
        display_order INTEGER DEFAULT 0,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for quote_line_items
      CREATE INDEX idx_quote_line_items_version ON quote_line_items(quote_version_id);
      CREATE INDEX idx_quote_line_items_product ON quote_line_items(product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS quote_line_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS quote_versions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS quotes CASCADE;`);
  }
}


