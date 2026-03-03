import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestructureQuoteTables1779000000000 implements MigrationInterface {
  name = 'RestructureQuoteTables1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new columns to quote_versions
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS project_type VARCHAR(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS calculator_inputs JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB`,
    );

    // Step 2a: Migrate project_type from quotes to quote_versions
    await queryRunner.query(`
      UPDATE quote_versions qv
      SET project_type = COALESCE(q.project_type, 'residential')
      FROM quotes q
      WHERE qv.quote_id = q.id
    `);

    // Step 2b: Build calculator_inputs from quotes' calculator columns (mostly NULL/defaults)
    await queryRunner.query(`
      UPDATE quote_versions qv
      SET calculator_inputs = jsonb_build_object(
        'phaseType', q.phase_type,
        'dcrPreference', COALESCE(q.dcr_preference, 'auto_split'),
        'calculationMode', COALESCE(q.calculation_mode, 'auto'),
        'dcrSystemSizeKw', q.dcr_system_size_kw,
        'nonDcrSystemSizeKw', q.non_dcr_system_size_kw,
        'floorNumber', COALESCE(q.floor_number, 0),
        'distanceKm', q.distance_km,
        'subsidyApplicable', COALESCE(q.is_subsidy_applicable, false)
      )
      FROM quotes q
      WHERE qv.quote_id = q.id
    `);

    // Step 2c: Build pricing_breakdown from existing version columns
    await queryRunner.query(`
      UPDATE quote_versions
      SET pricing_breakdown = jsonb_build_object(
        'basePrice', COALESCE(base_price, 0),
        'gst12On70Percent', COALESCE(gst_12_on_70_percent, 0),
        'gst18On30Percent', COALESCE(gst_18_on_30_percent, 0),
        'totalGst', COALESCE(total_gst, 0),
        'totalPrice', COALESCE(total_price, 0),
        'discountAmount', COALESCE(discount_amount, 0),
        'subsidyAmount', COALESCE(subsidy_amount, 0),
        'isSubsidyApplicable', COALESCE(
          (SELECT q.is_subsidy_applicable FROM quotes q WHERE q.id = quote_versions.quote_id),
          false
        )
      )
    `);

    // Step 3: Set NOT NULL constraints
    await queryRunner.query(`ALTER TABLE quote_versions ALTER COLUMN project_type SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE quote_versions ALTER COLUMN pricing_breakdown SET NOT NULL`,
    );

    // Step 4: Replace the old two-column partial index with an optimized single-column one
    // (is_current in columns is redundant when already in the WHERE clause)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_quote_versions_current`);
    await queryRunner.query(`
      CREATE INDEX idx_quote_versions_current ON quote_versions(quote_id) WHERE is_current = true
    `);

    // Step 5: Drop 7 pricing columns from quote_versions
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS base_price`);
    await queryRunner.query(
      `ALTER TABLE quote_versions DROP COLUMN IF EXISTS gst_12_on_70_percent`,
    );
    await queryRunner.query(
      `ALTER TABLE quote_versions DROP COLUMN IF EXISTS gst_18_on_30_percent`,
    );
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS total_gst`);
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS total_price`);
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS discount_amount`);
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS subsidy_amount`);

    // Step 6: Drop 19 columns from quotes
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS system_type`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS system_size_kw`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS total_wattage_wp`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS phase_type`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS dcr_preference`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS calculation_mode`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS dcr_system_size_kw`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS non_dcr_system_size_kw`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS floor_number`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS distance_km`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS project_type`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS base_price`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS gst_amount`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS total_price`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS discount_amount`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS final_price`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS is_subsidy_applicable`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS subsidy_amount`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS effective_price`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Re-add 19 columns to quotes
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN system_type VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN system_size_kw DECIMAL(10,2)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN total_wattage_wp INTEGER`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN phase_type VARCHAR(20)`);
    await queryRunner.query(
      `ALTER TABLE quotes ADD COLUMN dcr_preference VARCHAR(20) DEFAULT 'auto_split'`,
    );
    await queryRunner.query(
      `ALTER TABLE quotes ADD COLUMN calculation_mode VARCHAR(20) DEFAULT 'auto'`,
    );
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN dcr_system_size_kw DECIMAL(10,2)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN non_dcr_system_size_kw DECIMAL(10,2)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN floor_number INTEGER DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN distance_km DECIMAL(8,2)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN project_type VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN base_price DECIMAL(15,2)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN gst_amount DECIMAL(15,2)`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN total_price DECIMAL(15,2)`);
    await queryRunner.query(
      `ALTER TABLE quotes ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN final_price DECIMAL(15,2)`);
    await queryRunner.query(
      `ALTER TABLE quotes ADD COLUMN is_subsidy_applicable BOOLEAN DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN subsidy_amount DECIMAL(15,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE quotes ADD COLUMN effective_price DECIMAL(15,2)`);

    // Step 2: Re-add 7 pricing columns to quote_versions
    await queryRunner.query(`ALTER TABLE quote_versions ADD COLUMN base_price DECIMAL(15,2)`);
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN gst_12_on_70_percent DECIMAL(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN gst_18_on_30_percent DECIMAL(15,2)`,
    );
    await queryRunner.query(`ALTER TABLE quote_versions ADD COLUMN total_gst DECIMAL(15,2)`);
    await queryRunner.query(`ALTER TABLE quote_versions ADD COLUMN total_price DECIMAL(15,2)`);
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN subsidy_amount DECIMAL(15,2) DEFAULT 0`,
    );

    // Step 3: Copy data back from JSONB to columns
    await queryRunner.query(`
      UPDATE quote_versions
      SET
        base_price = (pricing_breakdown->>'basePrice')::DECIMAL(15,2),
        gst_12_on_70_percent = (pricing_breakdown->>'gst12On70Percent')::DECIMAL(15,2),
        gst_18_on_30_percent = (pricing_breakdown->>'gst18On30Percent')::DECIMAL(15,2),
        total_gst = (pricing_breakdown->>'totalGst')::DECIMAL(15,2),
        total_price = (pricing_breakdown->>'totalPrice')::DECIMAL(15,2),
        discount_amount = (pricing_breakdown->>'discountAmount')::DECIMAL(15,2),
        subsidy_amount = (pricing_breakdown->>'subsidyAmount')::DECIMAL(15,2)
    `);

    // Step 4: Copy data back from quote_versions to quotes (using current version)
    await queryRunner.query(`
      UPDATE quotes q
      SET
        system_type = qv.system_type,
        system_size_kw = qv.system_size_kw,
        total_wattage_wp = qv.total_wattage_wp,
        project_type = qv.project_type,
        base_price = (qv.pricing_breakdown->>'basePrice')::DECIMAL(15,2),
        gst_amount = (qv.pricing_breakdown->>'totalGst')::DECIMAL(15,2),
        total_price = (qv.pricing_breakdown->>'totalPrice')::DECIMAL(15,2),
        discount_amount = (qv.pricing_breakdown->>'discountAmount')::DECIMAL(15,2),
        final_price = qv.final_price,
        is_subsidy_applicable = COALESCE((qv.pricing_breakdown->>'isSubsidyApplicable')::BOOLEAN, false),
        subsidy_amount = (qv.pricing_breakdown->>'subsidyAmount')::DECIMAL(15,2),
        effective_price = qv.effective_price,
        phase_type = qv.calculator_inputs->>'phaseType',
        dcr_preference = COALESCE(qv.calculator_inputs->>'dcrPreference', 'auto_split'),
        calculation_mode = COALESCE(qv.calculator_inputs->>'calculationMode', 'auto'),
        dcr_system_size_kw = (qv.calculator_inputs->>'dcrSystemSizeKw')::DECIMAL(10,2),
        non_dcr_system_size_kw = (qv.calculator_inputs->>'nonDcrSystemSizeKw')::DECIMAL(10,2),
        floor_number = COALESCE((qv.calculator_inputs->>'floorNumber')::INTEGER, 0),
        distance_km = (qv.calculator_inputs->>'distanceKm')::DECIMAL(8,2)
      FROM quote_versions qv
      WHERE qv.quote_id = q.id AND qv.is_current = true
    `);

    // Step 5: Restore the original two-column partial index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_quote_versions_current`);
    await queryRunner.query(`
      CREATE INDEX idx_quote_versions_current ON quote_versions(quote_id, is_current) WHERE is_current = TRUE
    `);

    // Step 6: Drop new columns from quote_versions
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS project_type`);
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS calculator_inputs`);
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS pricing_breakdown`);
  }
}
