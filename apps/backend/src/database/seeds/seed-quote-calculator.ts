import {
  ProductType,
  ProductStatus,
  PhaseType,
  PanelTechnology,
  StructureType,
  ProjectType,
  SubsidySchemeType,
  PricingRuleType,
} from '@oneohm-epc/shared/types';
import { DataSource } from 'typeorm';

/**
 * Seed Quote Calculator Data
 *
 * This seed creates:
 * 1. Sample solar panels (DCR and Non-DCR, different brands)
 * 2. Sample inverters (1-phase and 3-phase, different capacities)
 * 3. Sample mounting structures
 * 4. Pricing rules for all products
 * 5. Subsidy configurations
 * 6. Installation pricing tiers
 * 7. Quote configuration
 */
export async function seedQuoteCalculatorData(
  dataSource: DataSource,
  organizationId: string,
): Promise<void> {
  console.log('🌱 Seeding Quote Calculator data...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // =====================================================
    // 1. SEED SOLAR PANELS
    // =====================================================
    console.log('📦 Creating solar panels...');
    const panelData = [
      // DCR Panels
      {
        name: 'Adani PERC DCR 540W',
        code: 'ADANI-DCR-540',
        brand: 'Adani',
        isDcr: true,
        technology: PanelTechnology.PERC,
        wattage: 540,
        minWattage: 530,
        maxWattage: 550,
        pricePerWatt: 24,
      },
      {
        name: 'Waaree PERC DCR 545W',
        code: 'WAAREE-DCR-545',
        brand: 'Waaree',
        isDcr: true,
        technology: PanelTechnology.PERC,
        wattage: 545,
        minWattage: 535,
        maxWattage: 555,
        pricePerWatt: 23.5,
      },
      {
        name: 'Navitas TOPCon DCR 580W',
        code: 'NAVITAS-DCR-580',
        brand: 'Navitas',
        isDcr: true,
        technology: PanelTechnology.TOPCON,
        wattage: 580,
        minWattage: 570,
        maxWattage: 590,
        pricePerWatt: 26,
      },
      // Non-DCR Panels
      {
        name: 'Adani PERC Non-DCR 540W',
        code: 'ADANI-NONDCR-540',
        brand: 'Adani',
        isDcr: false,
        technology: PanelTechnology.PERC,
        wattage: 540,
        minWattage: 530,
        maxWattage: 550,
        pricePerWatt: 20,
      },
      {
        name: 'Waaree TOPCon Non-DCR 580W',
        code: 'WAAREE-NONDCR-580',
        brand: 'Waaree',
        isDcr: false,
        technology: PanelTechnology.TOPCON,
        wattage: 580,
        minWattage: 570,
        maxWattage: 590,
        pricePerWatt: 22,
      },
    ];

    const panelIds: string[] = [];
    for (const panel of panelData) {
      const result = await queryRunner.query(
        `INSERT INTO products (
          organization_id, name, code, type, brand, status,
          specifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          specifications = EXCLUDED.specifications
        RETURNING id`,
        [
          organizationId,
          panel.name,
          panel.code,
          ProductType.SOLAR_PANEL,
          panel.brand,
          ProductStatus.ACTIVE,
          JSON.stringify({
            panel: {
              isDcr: panel.isDcr,
              technology: panel.technology,
              wattage: panel.wattage,
              minWattage: panel.minWattage,
              maxWattage: panel.maxWattage,
            },
          }),
        ],
      );
      panelIds.push(result[0].id);

      // Create pricing rule for panel
      await queryRunner.query(
        `INSERT INTO pricing_rules (
          organization_id, name, code, rule_type, product_id, is_active,
          formula, effective_from, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (organization_id, code) DO UPDATE SET
          formula = EXCLUDED.formula`,
        [
          organizationId,
          `${panel.name} Price`,
          `PRICE-${panel.code}`,
          PricingRuleType.BASE_PRICE,
          result[0].id,
          true,
          JSON.stringify({
            pricePerWatt: panel.pricePerWatt,
            gstRate: 12,
            isDcr: panel.isDcr,
          }),
          new Date().toISOString().split('T')[0],
          10,
        ],
      );
    }
    console.log(`✅ Created ${panelData.length} solar panels`);

    // =====================================================
    // 2. SEED INVERTERS
    // =====================================================
    console.log('🔌 Creating inverters...');
    const inverterData = [
      // 1-Phase Inverters (Sungrow)
      {
        name: 'Sungrow 3KW 1-Phase',
        code: 'SG-3K-1P',
        brand: 'Sungrow',
        capacity: 3,
        phase: PhaseType.SINGLE_PHASE,
        price: 35000,
      },
      {
        name: 'Sungrow 5KW 1-Phase',
        code: 'SG-5K-1P',
        brand: 'Sungrow',
        capacity: 5,
        phase: PhaseType.SINGLE_PHASE,
        price: 45000,
      },
      {
        name: 'Sungrow 6KW 1-Phase',
        code: 'SG-6K-1P',
        brand: 'Sungrow',
        capacity: 6,
        phase: PhaseType.SINGLE_PHASE,
        price: 52000,
      },
      {
        name: 'Sungrow 8KW 1-Phase',
        code: 'SG-8K-1P',
        brand: 'Sungrow',
        capacity: 8,
        phase: PhaseType.SINGLE_PHASE,
        price: 65000,
      },
      {
        name: 'Sungrow 10KW 1-Phase',
        code: 'SG-10K-1P',
        brand: 'Sungrow',
        capacity: 10,
        phase: PhaseType.SINGLE_PHASE,
        price: 75000,
      },
      // 3-Phase Inverters (Sungrow)
      {
        name: 'Sungrow 10KW 3-Phase',
        code: 'SG-10K-3P',
        brand: 'Sungrow',
        capacity: 10,
        phase: PhaseType.THREE_PHASE,
        price: 85000,
      },
      {
        name: 'Sungrow 15KW 3-Phase',
        code: 'SG-15K-3P',
        brand: 'Sungrow',
        capacity: 15,
        phase: PhaseType.THREE_PHASE,
        price: 110000,
      },
      {
        name: 'Sungrow 20KW 3-Phase',
        code: 'SG-20K-3P',
        brand: 'Sungrow',
        capacity: 20,
        phase: PhaseType.THREE_PHASE,
        price: 140000,
      },
      {
        name: 'Sungrow 25KW 3-Phase',
        code: 'SG-25K-3P',
        brand: 'Sungrow',
        capacity: 25,
        phase: PhaseType.THREE_PHASE,
        price: 170000,
      },
      {
        name: 'Sungrow 30KW 3-Phase',
        code: 'SG-30K-3P',
        brand: 'Sungrow',
        capacity: 30,
        phase: PhaseType.THREE_PHASE,
        price: 200000,
      },
      {
        name: 'Sungrow 50KW 3-Phase',
        code: 'SG-50K-3P',
        brand: 'Sungrow',
        capacity: 50,
        phase: PhaseType.THREE_PHASE,
        price: 320000,
      },
      // Goodwe Inverters
      {
        name: 'Goodwe 5KW 1-Phase',
        code: 'GW-5K-1P',
        brand: 'Goodwe',
        capacity: 5,
        phase: PhaseType.SINGLE_PHASE,
        price: 42000,
      },
      {
        name: 'Goodwe 10KW 3-Phase',
        code: 'GW-10K-3P',
        brand: 'Goodwe',
        capacity: 10,
        phase: PhaseType.THREE_PHASE,
        price: 80000,
      },
    ];

    for (const inverter of inverterData) {
      const result = await queryRunner.query(
        `INSERT INTO products (
          organization_id, name, code, type, brand, status,
          specifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          specifications = EXCLUDED.specifications
        RETURNING id`,
        [
          organizationId,
          inverter.name,
          inverter.code,
          ProductType.INVERTER,
          inverter.brand,
          ProductStatus.ACTIVE,
          JSON.stringify({
            inverter: {
              capacityKw: inverter.capacity,
              phaseType: inverter.phase,
              minSystemSizeKw: inverter.capacity - 1,
              maxSystemSizeKw: inverter.capacity + 2,
            },
          }),
        ],
      );

      // Create pricing rule for inverter
      await queryRunner.query(
        `INSERT INTO pricing_rules (
          organization_id, name, code, rule_type, product_id, is_active,
          formula, effective_from, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (organization_id, code) DO UPDATE SET
          formula = EXCLUDED.formula`,
        [
          organizationId,
          `${inverter.name} Price`,
          `PRICE-${inverter.code}`,
          PricingRuleType.BASE_PRICE,
          result[0].id,
          true,
          JSON.stringify({
            basePrice: inverter.price,
            gstRate: 18,
            phaseType: inverter.phase,
          }),
          new Date().toISOString().split('T')[0],
          10,
        ],
      );
    }
    console.log(`✅ Created ${inverterData.length} inverters`);

    // =====================================================
    // 3. SEED MOUNTING STRUCTURES
    // =====================================================
    console.log('🏗️ Creating mounting structures...');
    const structureResult = await queryRunner.query(
      `INSERT INTO products (
        organization_id, name, code, type, brand, status,
        specifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (organization_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        specifications = EXCLUDED.specifications
      RETURNING id`,
      [
        organizationId,
        'Aluminum Rail Mount',
        'STRUCT-ALUM-RAIL',
        ProductType.MOUNTING_STRUCTURE,
        'Generic',
        ProductStatus.ACTIVE,
        JSON.stringify({
          structure: {
            structureType: StructureType.ALUMINUM_RAIL,
            material: 'Aluminum',
            maxWindSpeedKmh: 150,
          },
        }),
      ],
    );

    // Create pricing rule for structure
    await queryRunner.query(
      `INSERT INTO pricing_rules (
        organization_id, name, code, rule_type, product_id, is_active,
        formula, effective_from, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (organization_id, code) DO UPDATE SET
        formula = EXCLUDED.formula`,
      [
        organizationId,
        'Aluminum Rail Mount Price',
        'PRICE-STRUCT-ALUM-RAIL',
        PricingRuleType.BASE_PRICE,
        structureResult[0].id,
        true,
        JSON.stringify({
          pricePerKw: 3500,
          gstRate: 18,
          structureType: StructureType.ALUMINUM_RAIL,
        }),
        new Date().toISOString().split('T')[0],
        10,
      ],
    );
    console.log('✅ Created mounting structure');

    // =====================================================
    // 4. SEED SUBSIDY CONFIGURATION
    // =====================================================
    console.log('💰 Creating subsidy configurations...');
    await queryRunner.query(
      `INSERT INTO subsidy_configurations (
        organization_id, scheme_name, scheme_type, project_type,
        max_subsidy_kw, requires_dcr, auto_split_enabled, is_active,
        tiers, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING`,
      [
        organizationId,
        'PM Surya Ghar - Residential',
        SubsidySchemeType.PM_SURYA_GHAR,
        ProjectType.RESIDENTIAL,
        3,
        true,
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
        max_subsidy_kw, requires_dcr, auto_split_enabled, is_active,
        tiers, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING`,
      [
        organizationId,
        'PM Surya Ghar - Commercial',
        SubsidySchemeType.PM_SURYA_GHAR,
        ProjectType.COMMERCIAL,
        0,
        false,
        false,
        true,
        JSON.stringify([]),
        'No subsidy for commercial installations',
      ],
    );
    console.log('✅ Created subsidy configurations');

    // =====================================================
    // 5. SEED INSTALLATION PRICING
    // =====================================================
    console.log('🔧 Creating installation pricing...');
    const installationPricing = [
      {
        min: 1,
        max: 3,
        electrical: 12000,
        fixed: 6000,
        floor: 1500,
        msedcl: 4000,
        supervision: 2000,
        transport: 25,
      },
      {
        min: 3,
        max: 5,
        electrical: 15000,
        fixed: 8000,
        floor: 2000,
        msedcl: 5000,
        supervision: 3000,
        transport: 30,
      },
      {
        min: 5,
        max: 10,
        electrical: 20000,
        fixed: 10000,
        floor: 2500,
        msedcl: 6000,
        supervision: 4000,
        transport: 35,
      },
      {
        min: 10,
        max: 20,
        electrical: 30000,
        fixed: 15000,
        floor: 3000,
        msedcl: 8000,
        supervision: 5000,
        transport: 40,
      },
      {
        min: 20,
        max: 50,
        electrical: 50000,
        fixed: 25000,
        floor: 4000,
        msedcl: 12000,
        supervision: 8000,
        transport: 50,
      },
      {
        min: 50,
        max: null,
        electrical: 80000,
        fixed: 40000,
        floor: 5000,
        msedcl: 20000,
        supervision: 12000,
        transport: 60,
      },
    ];

    for (const pricing of installationPricing) {
      await queryRunner.query(
        `INSERT INTO installation_pricing (
          organization_id, min_system_size_kw, max_system_size_kw,
          project_type, electrical_work_cost, fixed_material_cost,
          variable_floor_cost, floor_increment_percent, msedcl_charges,
          supervision_charges, transport_cost_per_km, gst_rate, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING`,
        [
          organizationId,
          pricing.min,
          pricing.max,
          ProjectType.RESIDENTIAL,
          pricing.electrical,
          pricing.fixed,
          pricing.floor,
          5, // 5% floor increment
          pricing.msedcl,
          pricing.supervision,
          pricing.transport,
          12,
          true,
        ],
      );
    }
    console.log(`✅ Created ${installationPricing.length} installation pricing tiers`);

    // =====================================================
    // 6. SEED QUOTE CONFIGURATION
    // =====================================================
    console.log('⚙️ Creating quote configuration...');
    await queryRunner.query(
      `INSERT INTO quote_configurations (
        organization_id, default_validity_days, max_versions,
        default_completion_weeks, gst_config, wattage_rounding,
        payment_milestones, show_inventory_stock, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING`,
      [
        organizationId,
        30,
        3,
        4,
        JSON.stringify({
          rate1: 12,
          rate1Percentage: 70,
          rate2: 18,
          rate2Percentage: 30,
        }),
        JSON.stringify({
          roundTo: 10,
          roundUpThreshold: 5,
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
  // Import datasource using the same pattern as other seed files
  const dataSource = (await import('../ormconfig')).default;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  // Get organization ID from command line or use default
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
    await seedQuoteCalculatorData(dataSource, orgId);
  } else {
    await seedQuoteCalculatorData(dataSource, organizationId);
  }

  await dataSource.destroy();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
