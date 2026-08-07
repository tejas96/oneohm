import { ProductStatus, ProjectType, SubsidySchemeType } from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

/**
 * Seed Quote Calculator Data
 *
 * This seed creates:
 * 1. Product types (solar_panel, inverter, mounting_structure)
 * 2. Brands (Adani, Waaree, Navitas, Sungrow, Goodwe, Generic)
 * 3. Sample solar panels (DCR and Non-DCR, different brands)
 * 4. Sample inverters (1-phase and 3-phase, different capacities)
 * 5. Sample mounting structures
 * 6. Product prices for all products
 * 7. Subsidy configurations
 * 8. Installation pricing tiers
 * 9. Quote configuration
 */
export async function seedQuoteCalculatorData(
  dataSource: DataSource,
): Promise<void> {
  console.log('🌱 Seeding Quote Calculator data...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // =====================================================
    // 1. SEED PRODUCT TYPES
    // =====================================================
    console.log('📁 Creating product types...');

    const productTypeRows = [
      {
        code: 'solar_panel',
        name: 'Solar Panel',
        description: 'Solar photovoltaic panels',
        pricingBasis: 'per_watt',
        gstRate: 5.0,
        uom: 'pcs',
        sort: 1,
      },
      {
        code: 'inverter',
        name: 'Inverter',
        description: 'Solar inverters for power conversion',
        pricingBasis: 'per_unit',
        gstRate: 5.0,
        uom: 'pcs',
        sort: 2,
      },
      {
        code: 'mounting_structure',
        name: 'Mounting Structure',
        description: 'Panel mounting structures',
        pricingBasis: 'per_kw',
        gstRate: 18.0,
        uom: 'set',
        sort: 3,
      },
    ];

    const productTypeIds: Record<string, string> = {};
    for (const pt of productTypeRows) {
      const result = await queryRunner.query(
        `INSERT INTO product_types (organization_id, name, code, description, default_pricing_basis, default_gst_rate, unit_of_measure, is_active, sort_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, NOW(), NOW())
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id`,
        [
          pt.name,
          pt.code,
          pt.description,
          pt.pricingBasis,
          pt.gstRate,
          pt.uom,
          pt.sort,
        ],
      );
      productTypeIds[pt.code] = result[0].id;
    }
    console.log(`✅ Created ${productTypeRows.length} product types`);

    // =====================================================
    // 2. SEED BRANDS
    // =====================================================
    console.log('🏷️ Creating brands...');

    const brandRows = [
      { name: 'Adani', manufacturer: 'Adani Solar' },
      { name: 'Waaree', manufacturer: 'Waaree Energies' },
      { name: 'Navitas', manufacturer: 'Navitas Solar' },
      { name: 'Sungrow', manufacturer: 'Sungrow Power' },
      { name: 'Goodwe', manufacturer: 'Goodwe Power' },
      { name: 'Generic', manufacturer: 'OneOhm' },
    ];

    const brandIds: Record<string, string> = {};
    for (const brand of brandRows) {
      const result = await queryRunner.query(
        `INSERT INTO brands (organization_id, name, manufacturer_name, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, TRUE, NOW(), NOW())
        ON CONFLICT (organization_id, name) DO UPDATE SET
          manufacturer_name = EXCLUDED.manufacturer_name
        RETURNING id`,
        [brand.name, brand.manufacturer],
      );
      brandIds[brand.name] = result[0].id;
    }

    // Brand-Product Type mappings
    const brandProductTypeMappings = [
      { brand: 'Adani', type: 'solar_panel' },
      { brand: 'Waaree', type: 'solar_panel' },
      { brand: 'Navitas', type: 'solar_panel' },
      { brand: 'Sungrow', type: 'inverter' },
      { brand: 'Goodwe', type: 'inverter' },
      { brand: 'Generic', type: 'mounting_structure' },
    ];

    for (const m of brandProductTypeMappings) {
      await queryRunner.query(
        `INSERT INTO brand_product_types (brand_id, product_type_id, is_active, created_at)
        VALUES ($1, $2, TRUE, NOW())
        ON CONFLICT (brand_id, product_type_id) DO NOTHING`,
        [brandIds[m.brand], productTypeIds[m.type]],
      );
    }
    console.log(`✅ Created ${brandRows.length} brands`);

    // =====================================================
    // 3. SEED SOLAR PANELS
    // =====================================================
    console.log('📦 Creating solar panels...');
    const panelData = [
      {
        name: 'Adani PERC DCR 540W',
        code: 'ADANI-DCR-540',
        brand: 'Adani',
        isDcr: true,
        technology: 'perc',
        wattage: 540,
        minWattage: 530,
        maxWattage: 550,
        efficiency: 21.5,
        pricePerWatt: 24,
      },
      {
        name: 'Waaree PERC DCR 545W',
        code: 'WAAREE-DCR-545',
        brand: 'Waaree',
        isDcr: true,
        technology: 'perc',
        wattage: 545,
        minWattage: 535,
        maxWattage: 555,
        efficiency: 21.3,
        pricePerWatt: 23.5,
      },
      {
        name: 'Navitas TOPCon DCR 580W',
        code: 'NAVITAS-DCR-580',
        brand: 'Navitas',
        isDcr: true,
        technology: 'topcon',
        wattage: 580,
        minWattage: 570,
        maxWattage: 590,
        efficiency: 22.4,
        pricePerWatt: 26,
      },
      {
        name: 'Adani PERC Non-DCR 540W',
        code: 'ADANI-NONDCR-540',
        brand: 'Adani',
        isDcr: false,
        technology: 'perc',
        wattage: 540,
        minWattage: 530,
        maxWattage: 550,
        efficiency: 21.5,
        pricePerWatt: 20,
      },
      {
        name: 'Waaree TOPCon Non-DCR 580W',
        code: 'WAAREE-NONDCR-580',
        brand: 'Waaree',
        isDcr: false,
        technology: 'topcon',
        wattage: 580,
        minWattage: 570,
        maxWattage: 590,
        efficiency: 22.3,
        pricePerWatt: 22,
      },
    ];

    const panelIds: string[] = [];
    for (const panel of panelData) {
      const result = await queryRunner.query(
        `INSERT INTO products (
          organization_id, product_type_id, brand_id, name, code, status,
          specifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          specifications = EXCLUDED.specifications
        RETURNING id`,
        [
          productTypeIds['solar_panel'],
          brandIds[panel.brand],
          panel.name,
          panel.code,
          ProductStatus.ACTIVE,
          JSON.stringify({
            wattage: panel.wattage,
            technology: panel.technology,
            is_dcr: panel.isDcr,
            min_wattage: panel.minWattage,
            max_wattage: panel.maxWattage,
            efficiency: panel.efficiency,
          }),
        ],
      );
      panelIds.push(result[0].id);

      // Create product price for panel
      await queryRunner.query(
        `INSERT INTO product_prices (
          organization_id, product_id, project_type, unit_price, cost_multiplier,
          gst_rate, currency, effective_from, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT DO NOTHING`,
        [
          result[0].id,
          panel.isDcr ? 'residential' : 'commercial',
          panel.pricePerWatt,
          1.0,
          5.0,
          'INR',
          new Date().toISOString().split('T')[0],
          true,
        ],
      );
    }
    console.log(`✅ Created ${panelData.length} solar panels`);

    // =====================================================
    // 4. SEED INVERTERS
    // =====================================================
    console.log('🔌 Creating inverters...');
    const inverterData = [
      {
        name: 'Sungrow 3KW 1-Phase',
        code: 'SG-3K-1P',
        brand: 'Sungrow',
        capacity: 3,
        phase: 'single_phase',
        voltage: '230V',
        price: 35000,
      },
      {
        name: 'Sungrow 5KW 1-Phase',
        code: 'SG-5K-1P',
        brand: 'Sungrow',
        capacity: 5,
        phase: 'single_phase',
        voltage: '230V',
        price: 45000,
      },
      {
        name: 'Sungrow 6KW 1-Phase',
        code: 'SG-6K-1P',
        brand: 'Sungrow',
        capacity: 6,
        phase: 'single_phase',
        voltage: '230V',
        price: 52000,
      },
      {
        name: 'Sungrow 8KW 1-Phase',
        code: 'SG-8K-1P',
        brand: 'Sungrow',
        capacity: 8,
        phase: 'single_phase',
        voltage: '230V',
        price: 65000,
      },
      {
        name: 'Sungrow 10KW 1-Phase',
        code: 'SG-10K-1P',
        brand: 'Sungrow',
        capacity: 10,
        phase: 'single_phase',
        voltage: '230V',
        price: 75000,
      },
      {
        name: 'Sungrow 10KW 3-Phase',
        code: 'SG-10K-3P',
        brand: 'Sungrow',
        capacity: 10,
        phase: 'three_phase',
        voltage: '415V',
        price: 85000,
      },
      {
        name: 'Sungrow 15KW 3-Phase',
        code: 'SG-15K-3P',
        brand: 'Sungrow',
        capacity: 15,
        phase: 'three_phase',
        voltage: '415V',
        price: 110000,
      },
      {
        name: 'Sungrow 20KW 3-Phase',
        code: 'SG-20K-3P',
        brand: 'Sungrow',
        capacity: 20,
        phase: 'three_phase',
        voltage: '415V',
        price: 140000,
      },
      {
        name: 'Sungrow 25KW 3-Phase',
        code: 'SG-25K-3P',
        brand: 'Sungrow',
        capacity: 25,
        phase: 'three_phase',
        voltage: '415V',
        price: 170000,
      },
      {
        name: 'Sungrow 30KW 3-Phase',
        code: 'SG-30K-3P',
        brand: 'Sungrow',
        capacity: 30,
        phase: 'three_phase',
        voltage: '415V',
        price: 200000,
      },
      {
        name: 'Sungrow 50KW 3-Phase',
        code: 'SG-50K-3P',
        brand: 'Sungrow',
        capacity: 50,
        phase: 'three_phase',
        voltage: '415V',
        price: 320000,
      },
      {
        name: 'Goodwe 5KW 1-Phase',
        code: 'GW-5K-1P',
        brand: 'Goodwe',
        capacity: 5,
        phase: 'single_phase',
        voltage: '230V',
        price: 42000,
      },
      {
        name: 'Goodwe 10KW 3-Phase',
        code: 'GW-10K-3P',
        brand: 'Goodwe',
        capacity: 10,
        phase: 'three_phase',
        voltage: '415V',
        price: 80000,
      },
    ];

    for (const inverter of inverterData) {
      const result = await queryRunner.query(
        `INSERT INTO products (
          organization_id, product_type_id, brand_id, name, code, status,
          specifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          specifications = EXCLUDED.specifications
        RETURNING id`,
        [
          productTypeIds['inverter'],
          brandIds[inverter.brand],
          inverter.name,
          inverter.code,
          ProductStatus.ACTIVE,
          JSON.stringify({
            capacity_kw: inverter.capacity,
            phase_type: inverter.phase,
            min_system_size_kw: inverter.capacity - 1,
            max_system_size_kw: inverter.capacity + 2,
            voltage: inverter.voltage,
          }),
        ],
      );

      // Create product price for inverter
      await queryRunner.query(
        `INSERT INTO product_prices (
          organization_id, product_id, project_type, unit_price, cost_multiplier,
          gst_rate, currency, effective_from, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT DO NOTHING`,
        [
          result[0].id,
          null,
          inverter.price,
          1.0,
          5.0,
          'INR',
          new Date().toISOString().split('T')[0],
          true,
        ],
      );
    }
    console.log(`✅ Created ${inverterData.length} inverters`);

    // =====================================================
    // 6. SEED SUBSIDY CONFIGURATION
    // =====================================================
    console.log('💰 Creating subsidy configurations...');
    await queryRunner.query(
      `INSERT INTO subsidy_configurations (
        organization_id, scheme_name, scheme_type, project_type,
        max_subsidy_kw, requires_dcr, is_active,
        tiers, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING`,
      [
        'PM Surya Ghar - Residential',
        SubsidySchemeType.PM_SURYA_GHAR,
        ProjectType.RESIDENTIAL,
        3,
        true,
        true,
        JSON.stringify([
          { fromKw: 0, toKw: 2, ratePerKw: 30000 },
          { fromKw: 2, toKw: 3, ratePerKw: 18000 },
        ]),
        'PM Surya Ghar subsidy for individual residential installations up to 3KW',
      ],
    );

    await queryRunner.query(
      `INSERT INTO subsidy_configurations (
        organization_id, scheme_name, scheme_type, project_type,
        max_subsidy_kw, requires_dcr, is_active,
        tiers, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING`,
      [
        'PM Surya Ghar - Commercial',
        SubsidySchemeType.PM_SURYA_GHAR,
        ProjectType.COMMERCIAL,
        0,
        false,
        true,
        JSON.stringify([]),
        'No subsidy for commercial installations',
      ],
    );
    console.log('✅ Created subsidy configurations');

    // =====================================================
    // 7. SEED INSTALLATION PRICING
    // =====================================================
    console.log('🔧 Creating installation pricing...');
    const installationPricing = [
      {
        min: 1,
        max: 3,
        electrical: 12000,
        fixed: 6000,
        floor: 1500,
        structure: 13336,
        labor: 3000,
        msedcl: 4000,
        loading: 1500,
        transport: 25,
      },
      {
        min: 3,
        max: 5,
        electrical: 15000,
        fixed: 8000,
        floor: 2000,
        structure: 16670,
        labor: 5000,
        msedcl: 5000,
        loading: 2000,
        transport: 30,
      },
      {
        min: 5,
        max: 10,
        electrical: 20000,
        fixed: 10000,
        floor: 2500,
        structure: 22000,
        labor: 8000,
        msedcl: 6000,
        loading: 2500,
        transport: 35,
      },
      {
        min: 10,
        max: 20,
        electrical: 30000,
        fixed: 15000,
        floor: 3000,
        structure: 33000,
        labor: 12000,
        msedcl: 8000,
        loading: 3000,
        transport: 40,
      },
      {
        min: 20,
        max: 50,
        electrical: 50000,
        fixed: 25000,
        floor: 4000,
        structure: 55000,
        labor: 20000,
        msedcl: 12000,
        loading: 5000,
        transport: 50,
      },
      {
        min: 50,
        max: null,
        electrical: 80000,
        fixed: 40000,
        floor: 5000,
        structure: 88000,
        labor: 35000,
        msedcl: 20000,
        loading: 8000,
        transport: 60,
      },
    ];

    for (const pricing of installationPricing) {
      const costComponents = JSON.stringify({
        electrical_work: pricing.electrical,
        fixed_material: pricing.fixed,
        variable_floor: pricing.floor,
        structure_cost: pricing.structure,
        installation_labor: pricing.labor,
        msedcl_charges: pricing.msedcl,
        loading_unloading: pricing.loading,
      });

      await queryRunner.query(
        `INSERT INTO installation_pricing (
          organization_id, min_system_size_kw, max_system_size_kw,
          transport_rate_per_km, floor_increment_percent, gst_rate,
          cost_components, effective_from, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW(), NOW())
        ON CONFLICT (organization_id, min_system_size_kw, max_system_size_kw) DO UPDATE SET
          transport_rate_per_km = EXCLUDED.transport_rate_per_km,
          floor_increment_percent = EXCLUDED.floor_increment_percent,
          gst_rate = EXCLUDED.gst_rate,
          cost_components = EXCLUDED.cost_components,
          effective_from = EXCLUDED.effective_from,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()`,
        [
          pricing.min,
          pricing.max,
          pricing.transport,
          25,
          18,
          costComponents,
          new Date().toISOString().split('T')[0],
          true,
        ],
      );
    }
    console.log(`✅ Created ${installationPricing.length} installation pricing tiers`);

    // =====================================================
    // 8. SEED QUOTE CONFIGURATION
    // =====================================================
    console.log('⚙️ Creating quote configuration...');
    await queryRunner.query(
      `INSERT INTO quote_configurations (
        organization_id, default_validity_days, max_versions,
        default_completion_weeks, gst_config,
        payment_milestones, show_inventory_stock, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING`,
      [
        30,
        3,
        4,
        JSON.stringify({
          rate1: 5,
          rate1Percentage: 70,
          rate2: 18,
          rate2Percentage: 30,
        }),
        JSON.stringify([
          { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
          {
            stage: 'installation_complete',
            name: 'Installation Complete',
            percentage: 85,
            order: 2,
          },
          { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
        ]),
        true,
        true,
      ],
    );
    console.log('✅ Created quote configuration');

    await queryRunner.commitTransaction();
    console.log('🎉 Quote Calculator data seeded successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error seeding Quote Calculator data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Main execution
 * Run with: npx ts-node src/database/seeds/seed-quote-calculator.ts
 */
async function main() {
  const dataSource = (await import('../ormconfig')).default;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const organizationId = process.argv[2] || 'YOUR_ORGANIZATION_ID';

  if (organizationId === 'YOUR_ORGANIZATION_ID') {
    console.log('Usage: npx ts-node src/database/seeds/seed-quote-calculator.ts <organization_id>');
    console.log('');
    console.log('Getting first organization from database...');

    const result = await dataSource.query('SELECT id FROM organizations LIMIT 1');
    if (result.length === 0) {
      console.error('No organizations found. Please create an organization first.');
      process.exit(1);
    }

    const orgId = result[0].id;
    console.log(`Using organization ID: ${orgId}`);
    await seedQuoteCalculatorData(dataSource);
  } else {
    await seedQuoteCalculatorData(dataSource);
  }

  await dataSource.destroy();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
