import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Normalize Product Catalog
 *
 * Phase 1: Create new tables, migrate data, flatten specs
 * Phase 3: Drop old tables and columns
 *
 * Creates: product_types, product_type_attributes, brands, brand_product_types, product_prices
 * Alters: products (add product_type_id, brand_id; flatten specifications; drop type, brand, manufacturer, category_id)
 * Drops: pricing_rules, product_categories, quote_line_items
 */
export class NormalizeProductCatalog1790000000000 implements MigrationInterface {
  name = 'NormalizeProductCatalog1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // PRE-MIGRATION: Create backup tables
    // ============================================================
    await queryRunner.query(`CREATE TABLE _backup_products AS SELECT * FROM products;`);
    await queryRunner.query(`CREATE TABLE _backup_pricing_rules AS SELECT * FROM pricing_rules;`);
    await queryRunner.query(
      `CREATE TABLE _backup_product_categories AS SELECT * FROM product_categories;`,
    );
    await queryRunner.query(
      `CREATE TABLE _backup_quote_line_items AS SELECT * FROM quote_line_items;`,
    );

    // ============================================================
    // PHASE 1a: Create product_types table
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE product_types (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id         UUID NOT NULL REFERENCES organizations(id),
        name                    VARCHAR(100) NOT NULL,
        code                    VARCHAR(50)  NOT NULL,
        description             TEXT,
        icon                    VARCHAR(50),
        default_unit_of_measure VARCHAR(20) DEFAULT 'pcs',
        default_pricing_basis   VARCHAR(20) NOT NULL DEFAULT 'per_unit'
          CHECK (default_pricing_basis IN ('per_watt', 'per_unit', 'per_kw')),
        default_gst_rate        DECIMAL(5,2) NOT NULL DEFAULT 12,
        is_active               BOOLEAN DEFAULT true,
        sort_order              INTEGER DEFAULT 0,
        created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at              TIMESTAMPTZ,
        created_by              UUID,
        updated_by              UUID,
        UNIQUE(organization_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_product_types
      BEFORE UPDATE ON product_types
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    `);

    // Seed product_types from existing product type values
    await queryRunner.query(`
      INSERT INTO product_types (organization_id, name, code, default_pricing_basis, default_gst_rate, sort_order)
      SELECT DISTINCT
        p.organization_id,
        CASE p.type
          WHEN 'solar_panel' THEN 'Solar Panel'
          WHEN 'inverter' THEN 'Inverter'
          WHEN 'mounting_structure' THEN 'Mounting Structure'
          WHEN 'battery' THEN 'Battery'
          WHEN 'cable' THEN 'Cable'
          WHEN 'connector' THEN 'Connector'
          WHEN 'junction_box' THEN 'Junction Box'
          WHEN 'meter' THEN 'Meter'
          WHEN 'earthing' THEN 'Earthing'
          WHEN 'accessories' THEN 'Accessories'
          ELSE initcap(replace(p.type, '_', ' '))
        END,
        p.type,
        CASE p.type
          WHEN 'solar_panel' THEN 'per_watt'
          WHEN 'mounting_structure' THEN 'per_kw'
          ELSE 'per_unit'
        END,
        CASE p.type
          WHEN 'mounting_structure' THEN 18
          WHEN 'cable' THEN 18
          WHEN 'accessories' THEN 18
          ELSE 12
        END,
        CASE p.type
          WHEN 'solar_panel' THEN 1
          WHEN 'inverter' THEN 2
          WHEN 'mounting_structure' THEN 3
          WHEN 'battery' THEN 4
          ELSE 10
        END
      FROM products p
      WHERE p.deleted_at IS NULL
      ON CONFLICT (organization_id, code) DO NOTHING;
    `);

    // ============================================================
    // PHASE 1b: Create product_type_attributes table
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE product_type_attributes (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_type_id   UUID NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
        attribute_key     VARCHAR(50) NOT NULL,
        label             VARCHAR(100) NOT NULL,
        data_type         VARCHAR(20) NOT NULL
          CHECK (data_type IN ('string', 'integer', 'decimal', 'boolean', 'enum')),
        is_required       BOOLEAN DEFAULT false,
        is_filterable     BOOLEAN DEFAULT false,
        validation        JSONB,
        default_value     TEXT,
        group_name        VARCHAR(50) DEFAULT 'general',
        sort_order        INTEGER DEFAULT 0,
        help_text         TEXT,
        created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_type_id, attribute_key)
      );
    `);

    // Seed panel attributes
    await queryRunner.query(`
      INSERT INTO product_type_attributes (product_type_id, attribute_key, label, data_type, is_required, is_filterable, validation, group_name, sort_order)
      SELECT pt.id, v.attribute_key, v.label, v.data_type, v.is_required, v.is_filterable, v.validation::jsonb, v.group_name, v.sort_order
      FROM product_types pt
      CROSS JOIN (VALUES
        ('technology',  'Cell Technology',      'enum',    true,  true,  '{"options":["perc","topcon","bifacial","hjt","mono_perc","poly"]}', 'core',       1),
        ('is_dcr',      'DCR Compliant',        'boolean', true,  true,  NULL,                                                               'core',       2),
        ('wattage',     'Nominal Wattage (Wp)', 'integer', true,  true,  '{"min":100,"max":1000}',                                           'power',      3),
        ('min_wattage', 'Min Wattage in Batch', 'integer', true,  false, '{"min":100,"max":1000}',                                           'power',      4),
        ('max_wattage', 'Max Wattage in Batch', 'integer', true,  false, '{"min":100,"max":1000}',                                           'power',      5),
        ('efficiency',  'Efficiency (%)',       'decimal', false, false, '{"min":0,"max":100}',                                              'electrical', 6)
      ) AS v(attribute_key, label, data_type, is_required, is_filterable, validation, group_name, sort_order)
      WHERE pt.code = 'solar_panel';
    `);

    // Seed inverter attributes
    await queryRunner.query(`
      INSERT INTO product_type_attributes (product_type_id, attribute_key, label, data_type, is_required, is_filterable, validation, group_name, sort_order)
      SELECT pt.id, v.attribute_key, v.label, v.data_type, v.is_required, v.is_filterable, v.validation::jsonb, v.group_name, v.sort_order
      FROM product_types pt
      CROSS JOIN (VALUES
        ('capacity_kw',        'Capacity (kW)',        'decimal', true,  true,  '{"min":0.5,"max":500}',                      'core',       1),
        ('phase_type',         'Phase Type',           'enum',    true,  true,  '{"options":["single_phase","three_phase"]}',  'core',       2),
        ('min_system_size_kw', 'Min System Size (kW)', 'decimal', true,  false, '{"min":0}',                                  'sizing',     3),
        ('max_system_size_kw', 'Max System Size (kW)', 'decimal', true,  false, '{"min":0}',                                  'sizing',     4),
        ('mppt_count',         'MPPT Channels',        'integer', false, false, '{"min":1,"max":24}',                         'electrical', 5),
        ('efficiency',         'Efficiency (%)',       'decimal', false, false, '{"min":0,"max":100}',                        'electrical', 6),
        ('voltage',            'Voltage',              'string',  false, false, NULL,                                          'electrical', 7)
      ) AS v(attribute_key, label, data_type, is_required, is_filterable, validation, group_name, sort_order)
      WHERE pt.code = 'inverter';
    `);

    // Seed mounting_structure attributes
    await queryRunner.query(`
      INSERT INTO product_type_attributes (product_type_id, attribute_key, label, data_type, is_required, is_filterable, validation, group_name, sort_order)
      SELECT pt.id, v.attribute_key, v.label, v.data_type, v.is_required, v.is_filterable, v.validation::jsonb, v.group_name, v.sort_order
      FROM product_types pt
      CROSS JOIN (VALUES
        ('structure_type',     'Structure Type',        'enum',    true,  true,  '{"options":["aluminum_rail","rcc_3x6","elevated_6x9","super_elevated","ground_mount"]}', 'core',     1),
        ('material',           'Material',              'string',  true,  false, NULL,                                                                                      'physical', 2),
        ('weight_kg',          'Weight (kg)',           'decimal', false, false, '{"min":0}',                                                                              'physical', 3),
        ('max_wind_speed_kmh', 'Max Wind Speed (km/h)', 'integer', false, false, '{"min":0}',                                                                             'physical', 4)
      ) AS v(attribute_key, label, data_type, is_required, is_filterable, validation, group_name, sort_order)
      WHERE pt.code = 'mounting_structure';
    `);

    // ============================================================
    // PHASE 1c: Create brands table
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE brands (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id   UUID NOT NULL REFERENCES organizations(id),
        name              VARCHAR(100) NOT NULL,
        manufacturer_name VARCHAR(255),
        logo_url          TEXT,
        website           VARCHAR(255),
        support_contact   VARCHAR(255),
        description       TEXT,
        is_active         BOOLEAN DEFAULT true,
        created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at        TIMESTAMPTZ,
        created_by        UUID,
        updated_by        UUID,
        UNIQUE(organization_id, name)
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_brands
      BEFORE UPDATE ON brands
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    `);

    // Populate brands from existing product data
    await queryRunner.query(`
      INSERT INTO brands (organization_id, name, manufacturer_name)
      SELECT DISTINCT
        p.organization_id,
        p.brand,
        p.manufacturer
      FROM products p
      WHERE p.brand IS NOT NULL
        AND p.brand != ''
        AND p.deleted_at IS NULL
      ON CONFLICT (organization_id, name) DO NOTHING;
    `);

    // ============================================================
    // PHASE 1d: Create brand_product_types table
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE brand_product_types (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id         UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
        product_type_id  UUID NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,
        is_active        BOOLEAN DEFAULT true,
        created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(brand_id, product_type_id)
      );
    `);

    // Populate brand_product_types from existing product data
    await queryRunner.query(`
      INSERT INTO brand_product_types (brand_id, product_type_id)
      SELECT DISTINCT b.id, pt.id
      FROM products p
      JOIN brands b ON b.organization_id = p.organization_id AND b.name = p.brand
      JOIN product_types pt ON pt.organization_id = p.organization_id AND pt.code = p.type
      WHERE p.deleted_at IS NULL
        AND p.brand IS NOT NULL
        AND p.brand != ''
      ON CONFLICT (brand_id, product_type_id) DO NOTHING;
    `);

    // ============================================================
    // PHASE 1e: Add product_type_id and brand_id to products
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN product_type_id UUID REFERENCES product_types(id),
        ADD COLUMN brand_id UUID REFERENCES brands(id);
    `);

    // Backfill product_type_id
    await queryRunner.query(`
      UPDATE products p
      SET product_type_id = pt.id
      FROM product_types pt
      WHERE pt.organization_id = p.organization_id
        AND pt.code = p.type;
    `);

    // Backfill brand_id
    await queryRunner.query(`
      UPDATE products p
      SET brand_id = b.id
      FROM brands b
      WHERE b.organization_id = p.organization_id
        AND b.name = p.brand;
    `);

    // For products without a brand, create a placeholder
    await queryRunner.query(`
      INSERT INTO brands (organization_id, name, manufacturer_name)
      SELECT DISTINCT p.organization_id, 'Unbranded', NULL
      FROM products p
      WHERE p.brand_id IS NULL AND p.deleted_at IS NULL
      ON CONFLICT (organization_id, name) DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE products p
      SET brand_id = b.id
      FROM brands b
      WHERE b.organization_id = p.organization_id
        AND b.name = 'Unbranded'
        AND p.brand_id IS NULL;
    `);

    // ============================================================
    // PHASE 1f: Flatten JSONB specifications
    // ============================================================

    // Flatten solar panel specs
    await queryRunner.query(`
      UPDATE products SET specifications = jsonb_build_object(
        'technology',   COALESCE(specifications->'panel'->>'technology', LOWER(specifications->'common'->>'cellType')),
        'is_dcr',       (specifications->'panel'->>'isDcr')::boolean,
        'wattage',      (specifications->'panel'->>'wattage')::int,
        'min_wattage',  (specifications->'panel'->>'minWattage')::int,
        'max_wattage',  (specifications->'panel'->>'maxWattage')::int,
        'efficiency',   (specifications->'common'->>'efficiency')::numeric
      )
      WHERE type = 'solar_panel'
        AND specifications IS NOT NULL
        AND specifications ? 'panel';
    `);

    // Flatten inverter specs
    await queryRunner.query(`
      UPDATE products SET specifications = jsonb_build_object(
        'phase_type',         specifications->'inverter'->>'phaseType',
        'capacity_kw',        (specifications->'inverter'->>'capacityKw')::numeric,
        'min_system_size_kw', (specifications->'inverter'->>'minSystemSizeKw')::numeric,
        'max_system_size_kw', (specifications->'inverter'->>'maxSystemSizeKw')::numeric,
        'voltage',            specifications->'common'->>'voltage'
      )
      WHERE type = 'inverter'
        AND specifications IS NOT NULL
        AND specifications ? 'inverter';
    `);

    // Flatten mounting structure specs
    await queryRunner.query(`
      UPDATE products SET specifications = jsonb_build_object(
        'structure_type', specifications->'structure'->>'structureType',
        'material',       specifications->'structure'->>'material',
        'weight_kg',      (specifications->'common'->>'weight')::numeric
      )
      WHERE type = 'mounting_structure'
        AND specifications IS NOT NULL
        AND specifications ? 'structure';
    `);

    // Set empty specs for products without specifications
    await queryRunner.query(`
      UPDATE products SET specifications = '{}'::jsonb
      WHERE specifications IS NULL;
    `);

    // Make product_type_id and brand_id NOT NULL
    await queryRunner.query(`
      ALTER TABLE products
        ALTER COLUMN product_type_id SET NOT NULL,
        ALTER COLUMN brand_id SET NOT NULL,
        ALTER COLUMN specifications SET NOT NULL,
        ALTER COLUMN specifications SET DEFAULT '{}'::jsonb;
    `);

    // ============================================================
    // PHASE 1g: Create product_prices table and migrate data
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE product_prices (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id  UUID NOT NULL REFERENCES organizations(id),
        product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        project_type     VARCHAR(50),
        unit_price       DECIMAL(12,2) NOT NULL,
        cost_multiplier  DECIMAL(5,2) DEFAULT 1.0,
        gst_rate         DECIMAL(5,2) NOT NULL,
        currency         VARCHAR(3) DEFAULT 'INR',
        effective_from   DATE NOT NULL DEFAULT CURRENT_DATE,
        effective_to     DATE,
        is_active        BOOLEAN DEFAULT true,
        created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_by       UUID,
        updated_by       UUID,
        CHECK (unit_price > 0),
        UNIQUE NULLS NOT DISTINCT (product_id, project_type, effective_from)
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_product_prices
      BEFORE UPDATE ON product_prices
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    `);

    // Migrate pricing_rules data to product_prices
    await queryRunner.query(`
      INSERT INTO product_prices (organization_id, product_id, project_type, unit_price, cost_multiplier, gst_rate, currency, effective_from, is_active)
      SELECT
        p.organization_id,
        p.id,
        NULL,
        COALESCE(
          (pr.formula->>'pricePerWatt')::numeric,
          (pr.formula->>'basePrice')::numeric
        ),
        COALESCE((pr.formula->>'multiplier')::numeric, 1.0),
        COALESCE((pr.formula->>'gstRate')::numeric, 12),
        COALESCE(pr.formula->>'currency', 'INR'),
        COALESCE(pr.effective_from, CURRENT_DATE),
        pr.is_active
      FROM pricing_rules pr
      JOIN products p ON p.id = pr.product_id
      WHERE pr.deleted_at IS NULL;
    `);

    // ============================================================
    // PHASE 1h: Create validation trigger
    // ============================================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_product_specifications()
      RETURNS TRIGGER AS $$
      DECLARE
        attr RECORD;
        val TEXT;
        num_val NUMERIC;
        min_val NUMERIC;
        max_val NUMERIC;
      BEGIN
        FOR attr IN
          SELECT attribute_key, data_type, is_required, validation
          FROM product_type_attributes
          WHERE product_type_id = NEW.product_type_id
        LOOP
          val := NEW.specifications ->> attr.attribute_key;

          IF attr.is_required AND val IS NULL THEN
            RAISE EXCEPTION 'Missing required specification: % for product type',
              attr.attribute_key;
          END IF;

          IF val IS NULL THEN CONTINUE; END IF;

          IF attr.data_type IN ('integer', 'decimal') THEN
            BEGIN
              num_val := val::NUMERIC;
            EXCEPTION WHEN OTHERS THEN
              RAISE EXCEPTION 'Specification % must be a number, got: %',
                attr.attribute_key, val;
            END;

            IF attr.validation IS NOT NULL THEN
              min_val := (attr.validation ->> 'min')::NUMERIC;
              max_val := (attr.validation ->> 'max')::NUMERIC;
              IF min_val IS NOT NULL AND num_val < min_val THEN
                RAISE EXCEPTION 'Specification % must be >= %, got: %',
                  attr.attribute_key, min_val, num_val;
              END IF;
              IF max_val IS NOT NULL AND num_val > max_val THEN
                RAISE EXCEPTION 'Specification % must be <= %, got: %',
                  attr.attribute_key, max_val, num_val;
              END IF;
            END IF;
          END IF;

          IF attr.data_type = 'boolean' AND val NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Specification % must be true or false, got: %',
              attr.attribute_key, val;
          END IF;

          IF attr.data_type = 'enum' AND attr.validation IS NOT NULL THEN
            IF NOT (attr.validation -> 'options') @> to_jsonb(val) THEN
              RAISE EXCEPTION 'Specification % must be one of %, got: %',
                attr.attribute_key,
                attr.validation -> 'options',
                val;
            END IF;
          END IF;
        END LOOP;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_validate_product_specs
        BEFORE INSERT OR UPDATE OF specifications, product_type_id ON products
        FOR EACH ROW EXECUTE FUNCTION validate_product_specifications();
    `);

    // ============================================================
    // PHASE 1i: Create functional indexes
    // ============================================================
    await queryRunner.query(`
      CREATE INDEX idx_products_spec_is_dcr ON products ((specifications ->> 'is_dcr')) WHERE deleted_at IS NULL;
      CREATE INDEX idx_products_spec_technology ON products ((specifications ->> 'technology')) WHERE deleted_at IS NULL;
      CREATE INDEX idx_products_spec_wattage ON products (((specifications ->> 'wattage')::int)) WHERE deleted_at IS NULL;
      CREATE INDEX idx_products_spec_phase_type ON products ((specifications ->> 'phase_type')) WHERE deleted_at IS NULL;
      CREATE INDEX idx_products_spec_capacity_kw ON products (((specifications ->> 'capacity_kw')::numeric)) WHERE deleted_at IS NULL;
      CREATE INDEX idx_products_spec_structure_type ON products ((specifications ->> 'structure_type')) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_products_type_id_status ON products (product_type_id, status) WHERE deleted_at IS NULL;
      CREATE INDEX idx_products_brand_id ON products (brand_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_product_prices_lookup ON product_prices (product_id, is_active, effective_from, effective_to) WHERE is_active = true;
      CREATE INDEX idx_product_prices_project ON product_prices (product_id, project_type, is_active) WHERE is_active = true;
    `);

    // ============================================================
    // POST-MIGRATION VALIDATION
    // ============================================================
    const validationErrors: string[] = [];

    const orphanedProducts = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM products WHERE product_type_id IS NULL AND deleted_at IS NULL;`,
    );
    if (Number(orphanedProducts[0].cnt) > 0) {
      validationErrors.push(`${orphanedProducts[0].cnt} products have NULL product_type_id`);
    }

    const orphanedBrands = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM products WHERE brand_id IS NULL AND deleted_at IS NULL;`,
    );
    if (Number(orphanedBrands[0].cnt) > 0) {
      validationErrors.push(`${orphanedBrands[0].cnt} products have NULL brand_id`);
    }

    const missingPrices = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM products p
       WHERE p.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM product_prices pp WHERE pp.product_id = p.id AND pp.is_active = true);`,
    );
    if (Number(missingPrices[0].cnt) > 0) {
      validationErrors.push(`${missingPrices[0].cnt} products have no active price`);
    }

    if (validationErrors.length > 0) {
      console.warn('Migration validation warnings:', validationErrors);
    }

    // ============================================================
    // PHASE 2b: Standardize audit columns
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE subsidy_configurations
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_by UUID,
        ADD COLUMN IF NOT EXISTS updated_by UUID;
    `);
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_by UUID,
        ADD COLUMN IF NOT EXISTS updated_by UUID;
    `);
    await queryRunner.query(`
      ALTER TABLE quote_configurations
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS created_by UUID,
        ADD COLUMN IF NOT EXISTS updated_by UUID;
    `);

    // Convert timestamp to timestamptz for consistency
    await queryRunner.query(`
      ALTER TABLE subsidy_configurations
        ALTER COLUMN created_at TYPE TIMESTAMPTZ,
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
    `);
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        ALTER COLUMN created_at TYPE TIMESTAMPTZ,
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
    `);
    await queryRunner.query(`
      ALTER TABLE quote_configurations
        ALTER COLUMN created_at TYPE TIMESTAMPTZ,
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
    `);

    // ============================================================
    // PHASE 3: Drop old tables and columns
    // ============================================================

    // Drop quote_line_items first (references quote_versions, not products directly)
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_quote_line_items_updated_at ON quote_line_items;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS quote_line_items CASCADE;`);

    // Drop pricing_rules
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_pricing_rules ON pricing_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_rules CASCADE;`);

    // Drop product_categories
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS set_timestamp_product_categories ON product_categories;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS product_categories CASCADE;`);

    // Drop old columns from products
    await queryRunner.query(`
      ALTER TABLE products
        DROP COLUMN IF EXISTS type,
        DROP COLUMN IF EXISTS brand,
        DROP COLUMN IF EXISTS manufacturer,
        DROP COLUMN IF EXISTS category_id;
    `);

    // Drop old indexes that reference removed columns
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_brand;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_category;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_prices_project;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_prices_lookup;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_brand_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_type_id_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_spec_structure_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_spec_capacity_kw;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_spec_phase_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_spec_wattage;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_spec_technology;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_spec_is_dcr;`);

    // Drop trigger and function
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_validate_product_specs ON products;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS validate_product_specifications();`);

    // Drop new tables
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS set_timestamp_product_prices ON product_prices;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS product_prices CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS brand_product_types CASCADE;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_brands ON brands;`);
    await queryRunner.query(`DROP TABLE IF EXISTS brands CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_type_attributes CASCADE;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_product_types ON product_types;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_types CASCADE;`);

    // Restore from backups if they exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_products') THEN
          -- Re-add old columns
          ALTER TABLE products
            ADD COLUMN IF NOT EXISTS type VARCHAR(50),
            ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
            ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
            ADD COLUMN IF NOT EXISTS category_id UUID;

          -- Restore data from backup
          UPDATE products p SET
            type = bp.type,
            brand = bp.brand,
            manufacturer = bp.manufacturer,
            category_id = bp.category_id,
            specifications = bp.specifications
          FROM _backup_products bp WHERE bp.id = p.id;

          -- Drop product_type_id and brand_id
          ALTER TABLE products
            DROP COLUMN IF EXISTS product_type_id,
            DROP COLUMN IF EXISTS brand_id;
        END IF;
      END $$;
    `);

    // Recreate old tables from backups
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_product_categories') THEN
          CREATE TABLE IF NOT EXISTS product_categories AS SELECT * FROM _backup_product_categories;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_pricing_rules') THEN
          CREATE TABLE IF NOT EXISTS pricing_rules AS SELECT * FROM _backup_pricing_rules;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_quote_line_items') THEN
          CREATE TABLE IF NOT EXISTS quote_line_items AS SELECT * FROM _backup_quote_line_items;
        END IF;
      END $$;
    `);

    // Recreate old indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_type ON products(type) WHERE deleted_at IS NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand) WHERE deleted_at IS NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE deleted_at IS NULL;`,
    );
  }
}
