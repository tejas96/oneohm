#!/usr/bin/env ts-node

/**
 * Installation Pricing Data Quality Validation Script
 *
 * Runs data quality checks on the installation_pricing table
 * to ensure the migration and cleanup was successful.
 *
 * Usage: npx ts-node src/scripts/validate-installation-pricing.ts
 */

import { DataSource } from 'typeorm';

async function validateInstallationPricing() {
  console.log('🔍 Starting Installation Pricing Data Quality Validation...\n');

  let dataSource: DataSource | undefined;
  try {
    // Import the data source configuration
    const { default: AppDataSource } = await import('../database/ormconfig');
    dataSource = AppDataSource;

    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    console.log('✅ Database connection established\n');

    // 1. Check for overlapping ranges
    console.log('📊 Checking for overlapping ranges...');
    const overlapping = await dataSource.query(`
      SELECT a.organization_id, COUNT(*) as conflicts
      FROM installation_pricing a JOIN installation_pricing b
        ON a.organization_id = b.organization_id
        AND a.id < b.id AND a.is_active = true AND b.is_active = true
      WHERE (a.min_system_size_kw <= COALESCE(b.max_system_size_kw, 999999) 
             AND COALESCE(a.max_system_size_kw, 999999) >= b.min_system_size_kw)
      GROUP BY a.organization_id;
    `);

    if (overlapping.length > 0) {
      console.log('❌ Found overlapping ranges:', overlapping);
    } else {
      console.log('✅ No overlapping ranges found');
    }

    // 2. Check for invalid ranges
    console.log('\n📊 Checking for invalid size ranges...');
    const [invalidRanges] = await dataSource.query(`
      SELECT COUNT(*) as invalid_size_ranges FROM installation_pricing
      WHERE min_system_size_kw > max_system_size_kw AND is_active = true;
    `);
    console.log(`✅ Invalid ranges: ${invalidRanges.invalid_size_ranges}`);

    // 3. GST rate distribution
    console.log('\n📊 GST Rate Distribution...');
    const gstRates = await dataSource.query(`
      SELECT gst_rate, COUNT(*) as count FROM installation_pricing
      WHERE is_active = true GROUP BY gst_rate ORDER BY gst_rate;
    `);
    console.table(gstRates);

    // 4. Check for empty cost components
    console.log('📊 Checking for empty cost components...');
    const [emptyCosts] = await dataSource.query(`
      SELECT COUNT(*) as empty_costs FROM installation_pricing
      WHERE (cost_components IS NULL OR cost_components = '{}') AND is_active = true;
    `);
    console.log(`✅ Empty cost components: ${emptyCosts.empty_costs}`);

    // 5. Required cost components validation
    console.log('\n📊 Checking required cost components...');
    const [requiredComponents] = await dataSource.query(`
      SELECT COUNT(*) as invalid_cost_components FROM installation_pricing
      WHERE NOT (cost_components ? 'electrical_work' AND cost_components ? 'fixed_material')
         AND is_active = true;
    `);
    console.log(`✅ Missing required components: ${requiredComponents.invalid_cost_components}`);

    // 6. New cost keys (rollback risk)
    console.log('\n📊 Checking new cost keys (rollback risk)...');
    const [newCostKeys] = await dataSource.query(`
      SELECT COUNT(*) as rows_with_new_cost_keys FROM installation_pricing
      WHERE (cost_components ? 'structure_cost'
         OR cost_components ? 'installation_labor'
         OR cost_components ? 'loading_unloading')
         AND is_active = true;
    `);
    console.log(`⚠️  Rows with new cost keys: ${newCostKeys.rows_with_new_cost_keys}`);

    // 7. Missing required fields
    console.log('\n📊 Checking for missing required fields...');
    const [missingFields] = await dataSource.query(`
      SELECT COUNT(*) as missing_required_fields FROM installation_pricing
      WHERE (organization_id IS NULL 
         OR min_system_size_kw IS NULL 
         OR transport_rate_per_km IS NULL
         OR floor_increment_percent IS NULL
         OR gst_rate IS NULL
         OR cost_components IS NULL
         OR effective_from IS NULL
         OR is_active IS NULL);
    `);
    console.log(`✅ Missing required fields: ${missingFields.missing_required_fields}`);

    // 8. Date range validation
    console.log('\n📊 Checking effective date ranges...');
    const [invalidDates] = await dataSource.query(`
      SELECT COUNT(*) as invalid_date_ranges FROM installation_pricing
      WHERE effective_to IS NOT NULL AND effective_from > effective_to;
    `);
    console.log(`✅ Invalid date ranges: ${invalidDates.invalid_date_ranges}`);

    // 9. Check for duplicates
    console.log('\n📊 Checking for duplicates...');
    const duplicates = await dataSource.query(`
      SELECT organization_id, min_system_size_kw, max_system_size_kw, COUNT(*) as duplicates
      FROM installation_pricing
      WHERE is_active = true
      GROUP BY organization_id, min_system_size_kw, max_system_size_kw
      HAVING COUNT(*) > 1;
    `);

    if (duplicates.length > 0) {
      console.log('❌ Found duplicates:', duplicates);
    } else {
      console.log('✅ No duplicates found');
    }

    // 10. Summary statistics
    console.log('\n📊 Summary Statistics...');
    const [summary] = await dataSource.query(`
      SELECT 
          COUNT(*) as total_rows,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_rows,
          COUNT(DISTINCT organization_id) as organizations,
          MIN(min_system_size_kw) as min_size,
          MAX(COALESCE(max_system_size_kw, 999)) as max_size,
          AVG(gst_rate) as avg_gst_rate
      FROM installation_pricing;
    `);
    console.table([summary]);

    // Validation Summary
    const issues =
      (overlapping.length > 0 ? 1 : 0) +
      (invalidRanges.invalid_size_ranges > 0 ? 1 : 0) +
      (emptyCosts.empty_costs > 0 ? 1 : 0) +
      (requiredComponents.invalid_cost_components > 0 ? 1 : 0) +
      (missingFields.missing_required_fields > 0 ? 1 : 0) +
      (invalidDates.invalid_date_ranges > 0 ? 1 : 0) +
      (duplicates.length > 0 ? 1 : 0);

    console.log(`\n${'='.repeat(60)}`);
    if (issues === 0) {
      console.log('🎉 All validation checks passed! Installation pricing data is clean.');
    } else {
      console.log(`❌ Found ${issues} data quality issues that need attention.`);
    }

    if (newCostKeys.rows_with_new_cost_keys > 0) {
      console.log(
        `⚠️  Warning: ${newCostKeys.rows_with_new_cost_keys} rows have new cost keys that would be lost on rollback.`,
      );
    }
  } catch (error) {
    console.error('❌ Error running validation:', error);
    process.exit(1);
  } finally {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  validateInstallationPricing().catch(console.error);
}

export { validateInstallationPricing };
