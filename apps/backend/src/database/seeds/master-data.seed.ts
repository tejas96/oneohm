import { DataSource, type QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import loadConfig from '../../config/configuration';

/**
 * Master Data Seed for Organization: OneOhm EPC
 *
 * Seeds:
 * 1. Product Categories (12)
 * 2. Products (56 - panels, inverters, structures)
 *    - DCR Panels: 9 (including new Adani TOPCon DCR 600-620Wp)
 *    - Non-DCR Panels: 9
 *    - 1-Phase Inverters: 13
 *    - 3-Phase Inverters: 20
 *    - Structures: 5 (Rail Mount, RCC 3X6, Elevated 6X9, Super Elevated, Ground Mount)
 * 3. Pricing Rules (51)
 * 4. Installation Pricing (100 - 1KW to 100KW)
 * 5. Subsidy Configurations (3 - residential, apartment, commercial/industrial)
 * 6. Quote Configuration (1)
 */

const ORG_ID = loadConfig().seed.organizationId;

// =====================================================
// Category IDs (Pre-generated for reference)
// =====================================================
const CATEGORY_IDS = {
  SOLAR: uuidv4(),
  PANELS: uuidv4(),
  DCR_PANELS: uuidv4(),
  NON_DCR_PANELS: uuidv4(),
  INVERTERS: uuidv4(),
  INV_1P: uuidv4(),
  INV_3P: uuidv4(),
  STRUCTURES: uuidv4(),
  ROOF_STRUCT: uuidv4(),
  GROUND_STRUCT: uuidv4(),
  CABLES: uuidv4(),
  ACCESSORIES: uuidv4(),
};

// =====================================================
// Product IDs (Pre-generated for pricing rule references)
// =====================================================
const PRODUCT_IDS: Record<string, string> = {};

// Generate product IDs upfront
const productCodes = [
  'ADANI-PERC-DCR',
  'ADANI-TOPCON-DCR',
  'ADANI-TOPCON-DCR-600',
  'ADANI-PERC-NONDCR',
  'ADANI-TOPCON-NONDCR',
  'WAAREE-PERC-DCR',
  'WAAREE-TOPCON-DCR',
  'WAAREE-PERC-NONDCR',
  'WAAREE-TOPCON-NONDCR',
  'PREMIER-PERC-DCR',
  'PREMIER-TOPCON-DCR',
  'PREMIER-PERC-NONDCR',
  'PREMIER-TOPCON-NONDCR',
  'NAVITAS-PERC-DCR',
  'NAVITAS-TOPCON-NONDCR',
  'VIKRAM-PERC-DCR',
  'VIKRAM-TOPCON-NONDCR',
  'RENEWSYS-TOPCON-NONDCR',
  'SUNGROW-1KW-1P',
  'SUNGROW-2KW-1P',
  'SUNGROW-3KW-1P',
  'SUNGROW-4KW-1P',
  'SUNGROW-5KW-1P',
  'SUNGROW-6KW-1P',
  'SUNGROW-8KW-3P',
  'SUNGROW-10KW-3P',
  'SUNGROW-12KW-3P',
  'SUNGROW-15KW-3P',
  'SUNGROW-20KW-3P',
  'SUNGROW-33KW-3P',
  'SUNGROW-50KW-3P',
  'SUNGROW-75KW-3P',
  'SUNGROW-100KW-3P',
  'GOODWE-2KW-1P',
  'GOODWE-3KW-1P',
  'GOODWE-4KW-1P',
  'GOODWE-5KW-1P',
  'GOODWE-6KW-1P',
  'GOODWE-8KW-3P',
  'GOODWE-10KW-3P',
  'GOODWE-15KW-3P',
  'GOODWE-20KW-3P',
  'GOODWE-25KW-3P',
  'GOODWE-36KW-3P',
  'GOODWE-50KW-3P',
  'GOODWE-80KW-3P',
  'GOODWE-100KW-3P',
  'SOLAREDGE-3KW-1P',
  'SOLAREDGE-5KW-1P',
  'SOLAREDGE-8KW-3P',
  'SOLAREDGE-10KW-3P',
  'STRUCT-RAIL-MOUNT',
  'STRUCT-RCC-3X6',
  'STRUCT-ELEVATED-6X9',
  'STRUCT-SUPER-ELEVATED',
  'STRUCT-GROUND-MOUNT',
];

productCodes.forEach((code) => {
  PRODUCT_IDS[code] = uuidv4();
});

export async function seedMasterData(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('🌱 Seeding master data for organization:', ORG_ID);

    // =====================================================
    // 0. CLEANUP EXISTING DATA (in correct order for FK constraints)
    // =====================================================
    console.log('🧹 Cleaning up existing master data...');

    // Delete in reverse dependency order
    // First, clean up quote-related tables that reference products
    // quote_line_items -> quote_versions -> quotes (cascade delete path)
    await queryRunner.query(
      `
      DELETE FROM quote_line_items 
      WHERE quote_version_id IN (
        SELECT qv.id FROM quote_versions qv 
        JOIN quotes q ON qv.quote_id = q.id 
        WHERE q.organization_id = $1
      )`,
      [ORG_ID],
    );
    await queryRunner.query(
      `
      DELETE FROM quote_versions 
      WHERE quote_id IN (SELECT id FROM quotes WHERE organization_id = $1)`,
      [ORG_ID],
    );
    await queryRunner.query(`DELETE FROM quotes WHERE organization_id = $1`, [ORG_ID]);

    // Then clean up master data tables
    await queryRunner.query(`DELETE FROM quote_configurations WHERE organization_id = $1`, [
      ORG_ID,
    ]);
    await queryRunner.query(`DELETE FROM subsidy_configurations WHERE organization_id = $1`, [
      ORG_ID,
    ]);
    await queryRunner.query(`DELETE FROM installation_pricing WHERE organization_id = $1`, [
      ORG_ID,
    ]);
    await queryRunner.query(`DELETE FROM pricing_rules WHERE organization_id = $1`, [ORG_ID]);
    await queryRunner.query(`DELETE FROM products WHERE organization_id = $1`, [ORG_ID]);
    await queryRunner.query(`DELETE FROM product_categories WHERE organization_id = $1`, [ORG_ID]);

    console.log('✅ Cleanup completed');

    // =====================================================
    // 1. PRODUCT CATEGORIES
    // =====================================================
    console.log('📁 Inserting product categories...');
    await insertProductCategories(queryRunner);

    // =====================================================
    // 2. PRODUCTS
    // =====================================================
    console.log('📦 Inserting products...');
    await insertProducts(queryRunner);

    // =====================================================
    // 3. PRICING RULES
    // =====================================================
    console.log('💰 Inserting pricing rules...');
    await insertPricingRules(queryRunner);

    // =====================================================
    // 3b. STRUCTURE PRICING RULES (must run after products are inserted)
    // =====================================================
    console.log('🏗️ Inserting structure pricing rules...');
    await insertStructurePricingRules(queryRunner);

    // =====================================================
    // 4. INSTALLATION PRICING
    // =====================================================
    console.log('🔧 Inserting installation pricing (1-100 KW)...');
    await insertInstallationPricing(queryRunner);

    // =====================================================
    // 5. SUBSIDY CONFIGURATIONS
    // =====================================================
    console.log('🏛️ Inserting subsidy configurations...');
    await insertSubsidyConfigurations(queryRunner);

    // =====================================================
    // 6. QUOTE CONFIGURATION
    // =====================================================
    console.log('📋 Inserting quote configuration...');
    await insertQuoteConfiguration(queryRunner);

    await queryRunner.commitTransaction();
    console.log('✅ Master data seeding completed successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error seeding master data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// =====================================================
// PRODUCT CATEGORIES
// =====================================================
async function insertProductCategories(queryRunner: QueryRunner): Promise<void> {
  const categories = [
    {
      id: CATEGORY_IDS.SOLAR,
      name: 'Solar Equipment',
      code: 'SOLAR',
      description: 'All solar equipment and components',
      parentId: null,
    },
    {
      id: CATEGORY_IDS.PANELS,
      name: 'Solar Panels',
      code: 'PANELS',
      description: 'Solar photovoltaic panels',
      parentId: CATEGORY_IDS.SOLAR,
    },
    {
      id: CATEGORY_IDS.DCR_PANELS,
      name: 'DCR Panels',
      code: 'DCR-PANELS',
      description: 'Domestic Content Requirement panels for subsidy projects',
      parentId: CATEGORY_IDS.PANELS,
    },
    {
      id: CATEGORY_IDS.NON_DCR_PANELS,
      name: 'Non-DCR Panels',
      code: 'NON-DCR-PANELS',
      description: 'Non-DCR panels for commercial and industrial projects',
      parentId: CATEGORY_IDS.PANELS,
    },
    {
      id: CATEGORY_IDS.INVERTERS,
      name: 'Inverters',
      code: 'INVERTERS',
      description: 'Solar inverters for power conversion',
      parentId: CATEGORY_IDS.SOLAR,
    },
    {
      id: CATEGORY_IDS.INV_1P,
      name: '1-Phase Inverters',
      code: 'INV-1P',
      description: 'Single phase inverters for residential',
      parentId: CATEGORY_IDS.INVERTERS,
    },
    {
      id: CATEGORY_IDS.INV_3P,
      name: '3-Phase Inverters',
      code: 'INV-3P',
      description: 'Three phase inverters for commercial and industrial',
      parentId: CATEGORY_IDS.INVERTERS,
    },
    {
      id: CATEGORY_IDS.STRUCTURES,
      name: 'Mounting Structures',
      code: 'STRUCTURES',
      description: 'Panel mounting structures',
      parentId: CATEGORY_IDS.SOLAR,
    },
    {
      id: CATEGORY_IDS.ROOF_STRUCT,
      name: 'Rooftop Structures',
      code: 'ROOF-STRUCT',
      description: 'Rooftop mounting structures',
      parentId: CATEGORY_IDS.STRUCTURES,
    },
    {
      id: CATEGORY_IDS.GROUND_STRUCT,
      name: 'Ground Mount Structures',
      code: 'GROUND-STRUCT',
      description: 'Ground mounting structures',
      parentId: CATEGORY_IDS.STRUCTURES,
    },
    {
      id: CATEGORY_IDS.CABLES,
      name: 'Cables and Wiring',
      code: 'CABLES',
      description: 'Electrical cables and wiring',
      parentId: CATEGORY_IDS.SOLAR,
    },
    {
      id: CATEGORY_IDS.ACCESSORIES,
      name: 'Accessories',
      code: 'ACCESSORIES',
      description: 'Solar system accessories',
      parentId: CATEGORY_IDS.SOLAR,
    },
  ];

  for (const cat of categories) {
    await queryRunner.query(
      `
      INSERT INTO product_categories (id, organization_id, name, code, description, parent_category_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING
    `,
      [cat.id, ORG_ID, cat.name, cat.code, cat.description, cat.parentId],
    );
  }
  console.log(`  ✓ Inserted ${categories.length} categories`);
}

// =====================================================
// PRODUCTS
// =====================================================
async function insertProducts(queryRunner: QueryRunner): Promise<void> {
  // DCR Panels
  const dcrPanels = [
    {
      code: 'ADANI-PERC-DCR',
      name: 'Adani Solar Panel PERC DCR 530-550Wp',
      brand: 'Adani',
      manufacturer: 'Adani Solar',
      model: 'PERC-545-DCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.5,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'ADANI-TOPCON-DCR',
      name: 'Adani Solar Panel TOPCon DCR 560-580Wp',
      brand: 'Adani',
      manufacturer: 'Adani Solar',
      model: 'TOPCON-570-DCR',
      wattage: 570,
      minW: 560,
      maxW: 580,
      tech: 'topcon',
      eff: 22.5,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'ADANI-TOPCON-DCR-600',
      name: 'Adani Solar Panel TOPCon DCR 600-620Wp',
      brand: 'Adani',
      manufacturer: 'Adani Solar',
      model: 'TOPCON-610-DCR',
      wattage: 610,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 22.5,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'WAAREE-PERC-DCR',
      name: 'Waaree Solar Panel PERC DCR 530-550Wp',
      brand: 'Waaree',
      manufacturer: 'Waaree Energies',
      model: 'PERC-545-DCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.3,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'WAAREE-TOPCON-DCR',
      name: 'Waaree Solar Panel TOPCon DCR 560-580Wp',
      brand: 'Waaree',
      manufacturer: 'Waaree Energies',
      model: 'TOPCON-570-DCR',
      wattage: 570,
      minW: 560,
      maxW: 580,
      tech: 'topcon',
      eff: 22.3,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'PREMIER-PERC-DCR',
      name: 'Premier Solar Panel PERC DCR 530-550Wp',
      brand: 'Premier',
      manufacturer: 'Premier Energies',
      model: 'PERC-545-DCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.2,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'PREMIER-TOPCON-DCR',
      name: 'Premier Solar Panel TOPCon DCR 600-620Wp',
      brand: 'Premier',
      manufacturer: 'Premier Energies',
      model: 'TOPCON-600-DCR',
      wattage: 600,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 21.2,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'NAVITAS-PERC-DCR',
      name: 'Navitas Solar Panel PERC DCR 530-550Wp',
      brand: 'Navitas',
      manufacturer: 'Navitas Solar',
      model: 'PERC-545-DCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.4,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'VIKRAM-PERC-DCR',
      name: 'Vikram Solar Panel PERC DCR 530-550Wp',
      brand: 'Vikram',
      manufacturer: 'Vikram Solar',
      model: 'PERC-545-DCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.3,
      warranty: 12,
      perfWarranty: 30,
    },
  ];

  // Non-DCR Panels
  const nonDcrPanels = [
    {
      code: 'ADANI-PERC-NONDCR',
      name: 'Adani Solar Panel PERC Non-DCR 530-550Wp',
      brand: 'Adani',
      manufacturer: 'Adani Solar',
      model: 'PERC-545-NONDCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.5,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'ADANI-TOPCON-NONDCR',
      name: 'Adani Solar Panel TOPCon Non-DCR 600-620Wp',
      brand: 'Adani',
      manufacturer: 'Adani Solar',
      model: 'TOPCON-610-NONDCR',
      wattage: 610,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 22.5,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'WAAREE-PERC-NONDCR',
      name: 'Waaree Solar Panel PERC Non-DCR 530-550Wp',
      brand: 'Waaree',
      manufacturer: 'Waaree Energies',
      model: 'PERC-545-NONDCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.3,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'WAAREE-TOPCON-NONDCR',
      name: 'Waaree Solar Panel TOPCon Non-DCR 600-620Wp',
      brand: 'Waaree',
      manufacturer: 'Waaree Energies',
      model: 'TOPCON-610-NONDCR',
      wattage: 610,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 22.3,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'PREMIER-PERC-NONDCR',
      name: 'Premier Solar Panel PERC Non-DCR 530-550Wp',
      brand: 'Premier',
      manufacturer: 'Premier Energies',
      model: 'PERC-545-NONDCR',
      wattage: 540,
      minW: 530,
      maxW: 550,
      tech: 'perc',
      eff: 21.2,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'PREMIER-TOPCON-NONDCR',
      name: 'Premier Solar Panel TOPCon Non-DCR 600-620Wp',
      brand: 'Premier',
      manufacturer: 'Premier Energies',
      model: 'TOPCON-610-NONDCR',
      wattage: 610,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 22.2,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'NAVITAS-TOPCON-NONDCR',
      name: 'Navitas Solar Panel TOPCon Non-DCR 600-620Wp',
      brand: 'Navitas',
      manufacturer: 'Navitas Solar',
      model: 'TOPCON-610-NONDCR',
      wattage: 610,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 22.4,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'VIKRAM-TOPCON-NONDCR',
      name: 'Vikram Solar Panel TOPCon Non-DCR 600-620Wp',
      brand: 'Vikram',
      manufacturer: 'Vikram Solar',
      model: 'TOPCON-610-NONDCR',
      wattage: 610,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 22.3,
      warranty: 12,
      perfWarranty: 30,
    },
    {
      code: 'RENEWSYS-TOPCON-NONDCR',
      name: 'Renewsys Solar Panel TOPCon Non-DCR 600-620Wp',
      brand: 'Renewsys',
      manufacturer: 'Renewsys India',
      model: 'TOPCON-610-NONDCR',
      wattage: 610,
      minW: 600,
      maxW: 620,
      tech: 'topcon',
      eff: 22.1,
      warranty: 12,
      perfWarranty: 30,
    },
  ];

  // Insert DCR Panels
  for (const panel of dcrPanels) {
    const specs = JSON.stringify({
      common: { wattage: panel.wattage, cellType: panel.tech.toUpperCase(), efficiency: panel.eff },
      panel: {
        isDcr: true,
        technology: panel.tech,
        wattage: panel.wattage,
        minWattage: panel.minW,
        maxWattage: panel.maxW,
      },
    });
    await queryRunner.query(
      `
      INSERT INTO products (id, organization_id, category_id, name, code, description, type, brand, manufacturer, model_number, unit_of_measure, product_warranty_years, performance_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING
    `,
      [
        PRODUCT_IDS[panel.code],
        ORG_ID,
        CATEGORY_IDS.DCR_PANELS,
        panel.name,
        panel.code,
        `${panel.brand} DCR approved ${panel.tech.toUpperCase()} technology panel for subsidy projects`,
        'solar_panel',
        panel.brand,
        panel.manufacturer,
        panel.model,
        'pcs',
        panel.warranty,
        panel.perfWarranty,
        'active',
        specs,
      ],
    );
  }

  // Insert Non-DCR Panels
  for (const panel of nonDcrPanels) {
    const specs = JSON.stringify({
      common: { wattage: panel.wattage, cellType: panel.tech.toUpperCase(), efficiency: panel.eff },
      panel: {
        isDcr: false,
        technology: panel.tech,
        wattage: panel.wattage,
        minWattage: panel.minW,
        maxWattage: panel.maxW,
      },
    });
    await queryRunner.query(
      `
      INSERT INTO products (id, organization_id, category_id, name, code, description, type, brand, manufacturer, model_number, unit_of_measure, product_warranty_years, performance_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING
    `,
      [
        PRODUCT_IDS[panel.code],
        ORG_ID,
        CATEGORY_IDS.NON_DCR_PANELS,
        panel.name,
        panel.code,
        `${panel.brand} Non-DCR ${panel.tech.toUpperCase()} panel for commercial projects`,
        'solar_panel',
        panel.brand,
        panel.manufacturer,
        panel.model,
        'pcs',
        panel.warranty,
        panel.perfWarranty,
        'active',
        specs,
      ],
    );
  }

  // 1-Phase Inverters
  const inverters1P = [
    {
      code: 'SUNGROW-1KW-1P',
      name: 'Sungrow 1KW 1-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG1K-S',
      capacity: 1,
      minSize: 1,
      maxSize: 1,
      warranty: 8,
    },
    {
      code: 'SUNGROW-2KW-1P',
      name: 'Sungrow 2KW 1-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG2K-S',
      capacity: 2,
      minSize: 2,
      maxSize: 2,
      warranty: 8,
    },
    {
      code: 'SUNGROW-3KW-1P',
      name: 'Sungrow 3KW 1-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG3K-S',
      capacity: 3,
      minSize: 3,
      maxSize: 3,
      warranty: 8,
    },
    {
      code: 'SUNGROW-4KW-1P',
      name: 'Sungrow 4KW 1-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG4K-S',
      capacity: 4,
      minSize: 4,
      maxSize: 4,
      warranty: 8,
    },
    {
      code: 'SUNGROW-5KW-1P',
      name: 'Sungrow 5KW 1-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG5K-S',
      capacity: 5,
      minSize: 5,
      maxSize: 5,
      warranty: 8,
    },
    {
      code: 'SUNGROW-6KW-1P',
      name: 'Sungrow 6KW 1-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG6K-S',
      capacity: 6,
      minSize: 6,
      maxSize: 6,
      warranty: 8,
    },
    {
      code: 'GOODWE-2KW-1P',
      name: 'Goodwe 2KW 1-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW2K-NS',
      capacity: 2,
      minSize: 2,
      maxSize: 2,
      warranty: 7,
    },
    {
      code: 'GOODWE-3KW-1P',
      name: 'Goodwe 3KW 1-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW3K-NS',
      capacity: 3,
      minSize: 3,
      maxSize: 3,
      warranty: 7,
    },
    {
      code: 'GOODWE-4KW-1P',
      name: 'Goodwe 4KW 1-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW4K-NS',
      capacity: 4,
      minSize: 4,
      maxSize: 4,
      warranty: 7,
    },
    {
      code: 'GOODWE-5KW-1P',
      name: 'Goodwe 5KW 1-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW5K-NS',
      capacity: 5,
      minSize: 5,
      maxSize: 5,
      warranty: 7,
    },
    {
      code: 'GOODWE-6KW-1P',
      name: 'Goodwe 6KW 1-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW6K-NS',
      capacity: 6,
      minSize: 6,
      maxSize: 6,
      warranty: 7,
    },
    {
      code: 'SOLAREDGE-3KW-1P',
      name: 'SolarEdge 3KW 1-Phase On-Grid Inverter',
      brand: 'SolarEdge',
      manufacturer: 'SolarEdge Technologies',
      model: 'SE3K',
      capacity: 3,
      minSize: 3,
      maxSize: 3,
      warranty: 8,
    },
    {
      code: 'SOLAREDGE-5KW-1P',
      name: 'SolarEdge 5KW 1-Phase On-Grid Inverter',
      brand: 'SolarEdge',
      manufacturer: 'SolarEdge Technologies',
      model: 'SE5K',
      capacity: 5,
      minSize: 4,
      maxSize: 6,
      warranty: 8,
    },
  ];

  // 3-Phase Inverters
  const inverters3P = [
    {
      code: 'SUNGROW-8KW-3P',
      name: 'Sungrow 8KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG8KTL-M',
      capacity: 8,
      minSize: 7,
      maxSize: 8,
      warranty: 5,
    },
    {
      code: 'SUNGROW-10KW-3P',
      name: 'Sungrow 10KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG10KTL-M',
      capacity: 10,
      minSize: 9,
      maxSize: 11,
      warranty: 5,
    },
    {
      code: 'SUNGROW-12KW-3P',
      name: 'Sungrow 12KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG12KTL-M',
      capacity: 12,
      minSize: 12,
      maxSize: 13,
      warranty: 5,
    },
    {
      code: 'SUNGROW-15KW-3P',
      name: 'Sungrow 15KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG15KTL-M',
      capacity: 15,
      minSize: 14,
      maxSize: 17,
      warranty: 5,
    },
    {
      code: 'SUNGROW-20KW-3P',
      name: 'Sungrow 20KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG20KTL-M',
      capacity: 20,
      minSize: 18,
      maxSize: 25,
      warranty: 5,
    },
    {
      code: 'SUNGROW-33KW-3P',
      name: 'Sungrow 33KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG33KTL-M',
      capacity: 33,
      minSize: 26,
      maxSize: 39,
      warranty: 5,
    },
    {
      code: 'SUNGROW-50KW-3P',
      name: 'Sungrow 50KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG50KTL-M',
      capacity: 50,
      minSize: 40,
      maxSize: 60,
      warranty: 5,
    },
    {
      code: 'SUNGROW-75KW-3P',
      name: 'Sungrow 75KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG75KTL-M',
      capacity: 75,
      minSize: 61,
      maxSize: 90,
      warranty: 5,
    },
    {
      code: 'SUNGROW-100KW-3P',
      name: 'Sungrow 100KW 3-Phase On-Grid Inverter',
      brand: 'Sungrow',
      manufacturer: 'Sungrow Power',
      model: 'SG100KTL-M',
      capacity: 100,
      minSize: 91,
      maxSize: 100,
      warranty: 5,
    },
    {
      code: 'GOODWE-8KW-3P',
      name: 'Goodwe 8KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW8K-DT',
      capacity: 8,
      minSize: 7,
      maxSize: 8,
      warranty: 7,
    },
    {
      code: 'GOODWE-10KW-3P',
      name: 'Goodwe 10KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW10K-DT',
      capacity: 10,
      minSize: 9,
      maxSize: 11,
      warranty: 5,
    },
    {
      code: 'GOODWE-15KW-3P',
      name: 'Goodwe 15KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW15K-DT',
      capacity: 15,
      minSize: 12,
      maxSize: 16,
      warranty: 5,
    },
    {
      code: 'GOODWE-20KW-3P',
      name: 'Goodwe 20KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW20K-DT',
      capacity: 20,
      minSize: 17,
      maxSize: 22,
      warranty: 5,
    },
    {
      code: 'GOODWE-25KW-3P',
      name: 'Goodwe 25KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW25K-DT',
      capacity: 25,
      minSize: 23,
      maxSize: 27,
      warranty: 5,
    },
    {
      code: 'GOODWE-36KW-3P',
      name: 'Goodwe 36KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW36K-DT',
      capacity: 36,
      minSize: 28,
      maxSize: 38,
      warranty: 5,
    },
    {
      code: 'GOODWE-50KW-3P',
      name: 'Goodwe 50KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW50K-MT',
      capacity: 50,
      minSize: 39,
      maxSize: 55,
      warranty: 5,
    },
    {
      code: 'GOODWE-80KW-3P',
      name: 'Goodwe 80KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW80K-MT',
      capacity: 80,
      minSize: 56,
      maxSize: 90,
      warranty: 5,
    },
    {
      code: 'GOODWE-100KW-3P',
      name: 'Goodwe 100KW 3-Phase On-Grid Inverter',
      brand: 'Goodwe',
      manufacturer: 'Goodwe Power',
      model: 'GW100K-MT',
      capacity: 100,
      minSize: 91,
      maxSize: 100,
      warranty: 5,
    },
    {
      code: 'SOLAREDGE-8KW-3P',
      name: 'SolarEdge 8KW 3-Phase On-Grid Inverter',
      brand: 'SolarEdge',
      manufacturer: 'SolarEdge Technologies',
      model: 'SE8K',
      capacity: 8,
      minSize: 7,
      maxSize: 8,
      warranty: 8,
    },
    {
      code: 'SOLAREDGE-10KW-3P',
      name: 'SolarEdge 10KW 3-Phase On-Grid Inverter',
      brand: 'SolarEdge',
      manufacturer: 'SolarEdge Technologies',
      model: 'SE10K',
      capacity: 10,
      minSize: 9,
      maxSize: 17,
      warranty: 8,
    },
  ];

  // Insert 1-Phase Inverters
  for (const inv of inverters1P) {
    const specs = JSON.stringify({
      common: { capacity: inv.capacity, phases: 1, voltage: '230V' },
      inverter: {
        capacityKw: inv.capacity,
        phaseType: 'single_phase',
        minSystemSizeKw: inv.minSize,
        maxSystemSizeKw: inv.maxSize,
      },
    });
    await queryRunner.query(
      `
      INSERT INTO products (id, organization_id, category_id, name, code, description, type, brand, manufacturer, model_number, unit_of_measure, product_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING
    `,
      [
        PRODUCT_IDS[inv.code],
        ORG_ID,
        CATEGORY_IDS.INV_1P,
        inv.name,
        inv.code,
        `${inv.brand} ${inv.capacity}KW single phase on-grid inverter`,
        'inverter',
        inv.brand,
        inv.manufacturer,
        inv.model,
        'pcs',
        inv.warranty,
        'active',
        specs,
      ],
    );
  }

  // Insert 3-Phase Inverters
  for (const inv of inverters3P) {
    const specs = JSON.stringify({
      common: { capacity: inv.capacity, phases: 3, voltage: '415V' },
      inverter: {
        capacityKw: inv.capacity,
        phaseType: 'three_phase',
        minSystemSizeKw: inv.minSize,
        maxSystemSizeKw: inv.maxSize,
      },
    });
    await queryRunner.query(
      `
      INSERT INTO products (id, organization_id, category_id, name, code, description, type, brand, manufacturer, model_number, unit_of_measure, product_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING
    `,
      [
        PRODUCT_IDS[inv.code],
        ORG_ID,
        CATEGORY_IDS.INV_3P,
        inv.name,
        inv.code,
        `${inv.brand} ${inv.capacity}KW three phase on-grid inverter`,
        'inverter',
        inv.brand,
        inv.manufacturer,
        inv.model,
        'pcs',
        inv.warranty,
        'active',
        specs,
      ],
    );
  }

  // Mounting Structures
  // Note: Pricing multipliers are stored in pricing_rules table, not here
  const structures = [
    {
      code: 'STRUCT-RAIL-MOUNT',
      name: 'Aluminum Rail Mount Structure',
      type: 'aluminum_rail',
      weight: 15,
      catId: CATEGORY_IDS.ROOF_STRUCT,
    },
    {
      code: 'STRUCT-RCC-3X6',
      name: '3 feet X 6 Feet Structure',
      type: 'rcc_3x6',
      weight: 20,
      catId: CATEGORY_IDS.ROOF_STRUCT,
    },
    {
      code: 'STRUCT-ELEVATED-6X9',
      name: 'Elevated 6x9 Feet Structure',
      type: 'elevated_6x9',
      weight: 35,
      catId: CATEGORY_IDS.ROOF_STRUCT,
    },
    {
      code: 'STRUCT-SUPER-ELEVATED',
      name: 'Super Elevated 10x14 Feet Structure',
      type: 'super_elevated',
      weight: 50,
      catId: CATEGORY_IDS.ROOF_STRUCT,
    },
    {
      code: 'STRUCT-GROUND-MOUNT',
      name: 'Ground Mount Structure',
      type: 'ground_mount',
      weight: 40,
      catId: CATEGORY_IDS.GROUND_STRUCT,
    },
  ];

  for (const struct of structures) {
    const specs = JSON.stringify({
      common: { weight: struct.weight },
      structure: {
        structureType: struct.type,
        material: 'Aluminum',
        // Note: costMultiplier removed - pricing is in pricing_rules table
      },
    });
    await queryRunner.query(
      `
      INSERT INTO products (id, organization_id, category_id, name, code, description, type, brand, manufacturer, model_number, unit_of_measure, product_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING
    `,
      [
        PRODUCT_IDS[struct.code],
        ORG_ID,
        struct.catId,
        struct.name,
        struct.code,
        `${struct.name} for solar installation`,
        'mounting_structure',
        'Generic',
        'OneOhm',
        struct.code,
        'set',
        10,
        'active',
        specs,
      ],
    );
  }

  console.log(
    `  ✓ Inserted ${dcrPanels.length + nonDcrPanels.length + inverters1P.length + inverters3P.length + structures.length} products`,
  );
}

// =====================================================
// PRICING RULES
// =====================================================
async function insertPricingRules(queryRunner: QueryRunner): Promise<void> {
  // Panel Pricing Rules (DCR - Residential)
  const panelPricing = [
    {
      productCode: 'ADANI-PERC-DCR',
      code: 'ADANI-PERC-DCR-RES',
      name: 'Adani PERC DCR Panel - Residential Price',
      pricePerWatt: 25.75,
      projectType: 'residential',
    },
    {
      productCode: 'ADANI-TOPCON-DCR',
      code: 'ADANI-TOPCON-DCR-RES',
      name: 'Adani TOPCon DCR Panel - Residential Price',
      pricePerWatt: 26.4,
      projectType: 'residential',
    },
    {
      productCode: 'ADANI-TOPCON-DCR-600',
      code: 'ADANI-TOPCON-DCR-600-RES',
      name: 'Adani TOPCon DCR 600Wp Panel - Residential Price',
      pricePerWatt: 26.4,
      projectType: 'residential',
    },
    {
      productCode: 'ADANI-PERC-NONDCR',
      code: 'ADANI-PERC-NONDCR-COM',
      name: 'Adani PERC Non-DCR Panel - Commercial Price',
      pricePerWatt: 15.0,
      projectType: 'commercial',
    },
    {
      productCode: 'ADANI-TOPCON-NONDCR',
      code: 'ADANI-TOPCON-NONDCR-COM',
      name: 'Adani TOPCon Non-DCR Panel - Commercial Price',
      pricePerWatt: 15.5,
      projectType: 'commercial',
    },
    {
      productCode: 'WAAREE-PERC-DCR',
      code: 'WAAREE-PERC-DCR-RES',
      name: 'Waaree PERC DCR Panel - Residential Price',
      pricePerWatt: 24.5,
      projectType: 'residential',
    },
    {
      productCode: 'WAAREE-TOPCON-DCR',
      code: 'WAAREE-TOPCON-DCR-RES',
      name: 'Waaree TOPCon DCR Panel - Residential Price',
      pricePerWatt: 25.0,
      projectType: 'residential',
    },
    {
      productCode: 'WAAREE-PERC-NONDCR',
      code: 'WAAREE-PERC-NONDCR-COM',
      name: 'Waaree PERC Non-DCR Panel - Commercial Price',
      pricePerWatt: 14.0,
      projectType: 'commercial',
    },
    {
      productCode: 'WAAREE-TOPCON-NONDCR',
      code: 'WAAREE-TOPCON-NONDCR-COM',
      name: 'Waaree TOPCon Non-DCR Panel - Commercial Price',
      pricePerWatt: 14.5,
      projectType: 'commercial',
    },
    {
      productCode: 'PREMIER-PERC-DCR',
      code: 'PREMIER-PERC-DCR-RES',
      name: 'Premier PERC DCR Panel - Residential Price',
      pricePerWatt: 24.25,
      projectType: 'residential',
    },
    {
      productCode: 'PREMIER-TOPCON-DCR',
      code: 'PREMIER-TOPCON-DCR-RES',
      name: 'Premier TOPCon DCR Panel - Residential Price',
      pricePerWatt: 24.5,
      projectType: 'residential',
    },
    {
      productCode: 'PREMIER-PERC-NONDCR',
      code: 'PREMIER-PERC-NONDCR-COM',
      name: 'Premier PERC Non-DCR Panel - Commercial Price',
      pricePerWatt: 14.0,
      projectType: 'commercial',
    },
    {
      productCode: 'PREMIER-TOPCON-NONDCR',
      code: 'PREMIER-TOPCON-NONDCR-COM',
      name: 'Premier TOPCon Non-DCR Panel - Commercial Price',
      pricePerWatt: 14.5,
      projectType: 'commercial',
    },
    {
      productCode: 'NAVITAS-PERC-DCR',
      code: 'NAVITAS-PERC-DCR-RES',
      name: 'Navitas PERC DCR Panel - Residential Price',
      pricePerWatt: 24.0,
      projectType: 'residential',
    },
    {
      productCode: 'NAVITAS-TOPCON-NONDCR',
      code: 'NAVITAS-TOPCON-NONDCR-COM',
      name: 'Navitas TOPCon Non-DCR Panel - Commercial Price',
      pricePerWatt: 14.0,
      projectType: 'commercial',
    },
    {
      productCode: 'VIKRAM-PERC-DCR',
      code: 'VIKRAM-PERC-DCR-RES',
      name: 'Vikram PERC DCR Panel - Residential Price',
      pricePerWatt: 27.0,
      projectType: 'residential',
    },
    {
      productCode: 'VIKRAM-TOPCON-NONDCR',
      code: 'VIKRAM-TOPCON-NONDCR-COM',
      name: 'Vikram TOPCon Non-DCR Panel - Commercial Price',
      pricePerWatt: 16.0,
      projectType: 'commercial',
    },
    {
      productCode: 'RENEWSYS-TOPCON-NONDCR',
      code: 'RENEWSYS-TOPCON-NONDCR-COM',
      name: 'Renewsys TOPCon Non-DCR Panel - Commercial Price',
      pricePerWatt: 14.5,
      projectType: 'commercial',
    },
  ];

  for (const price of panelPricing) {
    const formula = JSON.stringify({
      pricePerWatt: price.pricePerWatt,
      gstRate: 5,
      currency: 'INR',
    });
    await queryRunner.query(
      `
      INSERT INTO pricing_rules (id, organization_id, name, code, description, rule_type, product_id, product_type, project_type, formula, effective_from, priority, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `,
      [
        uuidv4(),
        ORG_ID,
        price.name,
        price.code,
        `Base price for ${price.name}`,
        'base_price',
        PRODUCT_IDS[price.productCode],
        'solar_panel',
        price.projectType,
        formula,
        '2024-01-01',
        10,
        true,
      ],
    );
  }

  // Inverter Pricing Rules
  const inverterPricing = [
    {
      productCode: 'SUNGROW-1KW-1P',
      code: 'SUNGROW-1KW-1P-PRICE',
      name: 'Sungrow 1KW 1-Phase Inverter Price',
      basePrice: 13500,
    },
    {
      productCode: 'SUNGROW-2KW-1P',
      code: 'SUNGROW-2KW-1P-PRICE',
      name: 'Sungrow 2KW 1-Phase Inverter Price',
      basePrice: 14500,
    },
    {
      productCode: 'SUNGROW-3KW-1P',
      code: 'SUNGROW-3KW-1P-PRICE',
      name: 'Sungrow 3KW 1-Phase Inverter Price',
      basePrice: 15800,
    },
    {
      productCode: 'SUNGROW-4KW-1P',
      code: 'SUNGROW-4KW-1P-PRICE',
      name: 'Sungrow 4KW 1-Phase Inverter Price',
      basePrice: 26500,
    },
    {
      productCode: 'SUNGROW-5KW-1P',
      code: 'SUNGROW-5KW-1P-PRICE',
      name: 'Sungrow 5KW 1-Phase Inverter Price',
      basePrice: 29000,
    },
    {
      productCode: 'SUNGROW-6KW-1P',
      code: 'SUNGROW-6KW-1P-PRICE',
      name: 'Sungrow 6KW 1-Phase Inverter Price',
      basePrice: 30000,
    },
    {
      productCode: 'SUNGROW-8KW-3P',
      code: 'SUNGROW-8KW-3P-PRICE',
      name: 'Sungrow 8KW 3-Phase Inverter Price',
      basePrice: 52000,
    },
    {
      productCode: 'SUNGROW-10KW-3P',
      code: 'SUNGROW-10KW-3P-PRICE',
      name: 'Sungrow 10KW 3-Phase Inverter Price',
      basePrice: 56000,
    },
    {
      productCode: 'SUNGROW-12KW-3P',
      code: 'SUNGROW-12KW-3P-PRICE',
      name: 'Sungrow 12KW 3-Phase Inverter Price',
      basePrice: 62000,
    },
    {
      productCode: 'SUNGROW-15KW-3P',
      code: 'SUNGROW-15KW-3P-PRICE',
      name: 'Sungrow 15KW 3-Phase Inverter Price',
      basePrice: 67000,
    },
    {
      productCode: 'SUNGROW-20KW-3P',
      code: 'SUNGROW-20KW-3P-PRICE',
      name: 'Sungrow 20KW 3-Phase Inverter Price',
      basePrice: 77000,
    },
    {
      productCode: 'SUNGROW-33KW-3P',
      code: 'SUNGROW-33KW-3P-PRICE',
      name: 'Sungrow 33KW 3-Phase Inverter Price',
      basePrice: 126000,
    },
    {
      productCode: 'SUNGROW-50KW-3P',
      code: 'SUNGROW-50KW-3P-PRICE',
      name: 'Sungrow 50KW 3-Phase Inverter Price',
      basePrice: 148000,
    },
    {
      productCode: 'SUNGROW-75KW-3P',
      code: 'SUNGROW-75KW-3P-PRICE',
      name: 'Sungrow 75KW 3-Phase Inverter Price',
      basePrice: 222000,
    },
    {
      productCode: 'SUNGROW-100KW-3P',
      code: 'SUNGROW-100KW-3P-PRICE',
      name: 'Sungrow 100KW 3-Phase Inverter Price',
      basePrice: 265000,
    },
    {
      productCode: 'GOODWE-2KW-1P',
      code: 'GOODWE-2KW-1P-PRICE',
      name: 'Goodwe 2KW 1-Phase Inverter Price',
      basePrice: 15400,
    },
    {
      productCode: 'GOODWE-3KW-1P',
      code: 'GOODWE-3KW-1P-PRICE',
      name: 'Goodwe 3KW 1-Phase Inverter Price',
      basePrice: 15600,
    },
    {
      productCode: 'GOODWE-4KW-1P',
      code: 'GOODWE-4KW-1P-PRICE',
      name: 'Goodwe 4KW 1-Phase Inverter Price',
      basePrice: 30700,
    },
    {
      productCode: 'GOODWE-5KW-1P',
      code: 'GOODWE-5KW-1P-PRICE',
      name: 'Goodwe 5KW 1-Phase Inverter Price',
      basePrice: 31800,
    },
    {
      productCode: 'GOODWE-6KW-1P',
      code: 'GOODWE-6KW-1P-PRICE',
      name: 'Goodwe 6KW 1-Phase Inverter Price',
      basePrice: 33000,
    },
    {
      productCode: 'GOODWE-8KW-3P',
      code: 'GOODWE-8KW-3P-PRICE',
      name: 'Goodwe 8KW 3-Phase Inverter Price',
      basePrice: 53400,
    },
    {
      productCode: 'GOODWE-10KW-3P',
      code: 'GOODWE-10KW-3P-PRICE',
      name: 'Goodwe 10KW 3-Phase Inverter Price',
      basePrice: 54300,
    },
    {
      productCode: 'GOODWE-15KW-3P',
      code: 'GOODWE-15KW-3P-PRICE',
      name: 'Goodwe 15KW 3-Phase Inverter Price',
      basePrice: 62900,
    },
    {
      productCode: 'GOODWE-20KW-3P',
      code: 'GOODWE-20KW-3P-PRICE',
      name: 'Goodwe 20KW 3-Phase Inverter Price',
      basePrice: 65800,
    },
    {
      productCode: 'GOODWE-25KW-3P',
      code: 'GOODWE-25KW-3P-PRICE',
      name: 'Goodwe 25KW 3-Phase Inverter Price',
      basePrice: 98000,
    },
    {
      productCode: 'GOODWE-36KW-3P',
      code: 'GOODWE-36KW-3P-PRICE',
      name: 'Goodwe 36KW 3-Phase Inverter Price',
      basePrice: 124000,
    },
    {
      productCode: 'GOODWE-50KW-3P',
      code: 'GOODWE-50KW-3P-PRICE',
      name: 'Goodwe 50KW 3-Phase Inverter Price',
      basePrice: 159600,
    },
    {
      productCode: 'GOODWE-80KW-3P',
      code: 'GOODWE-80KW-3P-PRICE',
      name: 'Goodwe 80KW 3-Phase Inverter Price',
      basePrice: 220500,
    },
    {
      productCode: 'GOODWE-100KW-3P',
      code: 'GOODWE-100KW-3P-PRICE',
      name: 'Goodwe 100KW 3-Phase Inverter Price',
      basePrice: 260000,
    },
    {
      productCode: 'SOLAREDGE-3KW-1P',
      code: 'SOLAREDGE-3KW-1P-PRICE',
      name: 'SolarEdge 3KW 1-Phase Inverter Price',
      basePrice: 18500,
    },
    {
      productCode: 'SOLAREDGE-5KW-1P',
      code: 'SOLAREDGE-5KW-1P-PRICE',
      name: 'SolarEdge 5KW 1-Phase Inverter Price',
      basePrice: 29000,
    },
    {
      productCode: 'SOLAREDGE-8KW-3P',
      code: 'SOLAREDGE-8KW-3P-PRICE',
      name: 'SolarEdge 8KW 3-Phase Inverter Price',
      basePrice: 58000,
    },
    {
      productCode: 'SOLAREDGE-10KW-3P',
      code: 'SOLAREDGE-10KW-3P-PRICE',
      name: 'SolarEdge 10KW 3-Phase Inverter Price',
      basePrice: 63000,
    },
  ];

  for (const price of inverterPricing) {
    const formula = JSON.stringify({ basePrice: price.basePrice, gstRate: 5, currency: 'INR' });
    await queryRunner.query(
      `
      INSERT INTO pricing_rules (id, organization_id, name, code, description, rule_type, product_id, product_type, formula, effective_from, priority, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `,
      [
        uuidv4(),
        ORG_ID,
        price.name,
        price.code,
        `Base price for ${price.name}`,
        'base_price',
        PRODUCT_IDS[price.productCode],
        'inverter',
        formula,
        '2024-01-01',
        10,
        true,
      ],
    );
  }

  console.log(`  ✓ Inserted ${panelPricing.length + inverterPricing.length} pricing rules`);
}

// =====================================================
// STRUCTURE PRICING RULES
// =====================================================
/**
 * Insert pricing rules for mounting structures
 * Uses the formula: basePrice × multiplier × systemSizeKw
 *
 * Multipliers:
 * - Aluminum Rail: 1.0
 * - RCC 3X6: 2.2
 * - Elevated 6X9: 2.5
 * - Super Elevated: 3.2
 * - Ground Mount: 3.5
 */
async function insertStructurePricingRules(queryRunner: QueryRunner): Promise<void> {
  // Map product CODE to pricing rule config
  // Product codes are stable identifiers in the database
  // Formula: basePrice × multiplier × systemSizeKw
  // Updated multipliers as per business requirements (2026-01-16)
  const structurePricingRules = [
    {
      productCode: 'STRUCT-RAIL-MOUNT',
      ruleCode: 'PRICE-STRUCT-RAIL',
      name: 'Aluminum Rail Mount I&C',
      formula: { basePrice: 700, multiplier: 1.2, gstRate: 18 }, // 700 × 1.2 = ₹840/KW
    },
    {
      productCode: 'STRUCT-RCC-3X6',
      ruleCode: 'PRICE-STRUCT-3X6',
      name: '3 feet X 6 Feet Structure I&C',
      formula: { basePrice: 700, multiplier: 4, gstRate: 18 }, // 700 × 4 = ₹2,800/KW
    },
    {
      productCode: 'STRUCT-ELEVATED-6X9',
      ruleCode: 'PRICE-STRUCT-6X9',
      name: 'Elevated 6x9 Feet Structure I&C',
      formula: { basePrice: 700, multiplier: 8, gstRate: 18 }, // 700 × 8 = ₹5,600/KW
    },
    {
      productCode: 'STRUCT-SUPER-ELEVATED',
      ruleCode: 'PRICE-STRUCT-SE',
      name: 'Super Elevated Structure I&C',
      formula: { basePrice: 700, multiplier: 12, gstRate: 18 }, // 700 × 12 = ₹8,400/KW
    },
    {
      productCode: 'STRUCT-GROUND-MOUNT',
      ruleCode: 'PRICE-STRUCT-GM',
      name: 'Ground Mount Structure I&C',
      formula: { basePrice: 700, multiplier: 10, gstRate: 18 }, // 700 × 10 = ₹7,000/KW
    },
  ];

  let insertedCount = 0;

  for (const rule of structurePricingRules) {
    // Look up product ID by CODE (stable identifier, not sample UUIDs)
    const productResult = await queryRunner.query(
      `SELECT id FROM products 
       WHERE organization_id = $1 
       AND code = $2
       AND deleted_at IS NULL
       LIMIT 1`,
      [ORG_ID, rule.productCode],
    );

    if (productResult.length > 0) {
      const productId = productResult[0].id;
      const formulaJson = JSON.stringify(rule.formula);

      // Insert pricing rule linked to actual product ID from database
      await queryRunner.query(
        `INSERT INTO pricing_rules (
          id, organization_id, name, code, description, rule_type, 
          product_id, product_type, formula, effective_from, priority, is_active, 
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
        ) ON CONFLICT (organization_id, code) DO UPDATE SET
          formula = $9,
          updated_at = NOW()`,
        [
          uuidv4(), // id
          ORG_ID, // organization_id
          rule.name, // name
          rule.ruleCode, // code
          `Installation charges for ${rule.name}`, // description
          'base_price', // rule_type
          productId, // product_id (from DB lookup)
          'mounting_structure', // product_type
          formulaJson, // formula
          '2024-01-01', // effective_from
          10, // priority
          true, // is_active
        ],
      );
      insertedCount++;
    } else {
      console.warn(`  ⚠ Product not found for structure pricing rule: ${rule.productCode}`);
    }
  }

  console.log(`  ✓ Inserted ${insertedCount} structure pricing rules`);
}

// =====================================================
// INSTALLATION PRICING (1-100 KW)
// =====================================================

/**
 * Get profitability percentage based on system size
 * Profitability tiers:
 * - 1 KW: 25%
 * - 2 KW: 20%
 * - 3 KW: 18%
 * - 4-5 KW: 16%
 * - 6-10 KW: 15%
 * - 11-30 KW: 15%
 * - 31-70 KW: 14%
 * - 71-100 KW: 13%
 */
function getProfitabilityPercent(kw: number): number {
  if (kw === 1) return 25;
  if (kw === 2) return 20;
  if (kw === 3) return 18;
  if (kw >= 4 && kw <= 5) return 16;
  if (kw >= 6 && kw <= 10) return 15;
  if (kw >= 11 && kw <= 30) return 15;
  if (kw >= 31 && kw <= 70) return 14;
  if (kw >= 71 && kw <= 100) return 13;
  return 13; // Default for > 100 KW
}

async function insertInstallationPricing(queryRunner: QueryRunner): Promise<void> {
  // Installation pricing data - structure costs are now calculated separately via pricing rules
  // Structure pricing uses formula: basePrice × multiplier × systemSizeKw (see insertStructurePricingRules)
  const installationData = [
    {
      kw: 1,
      electrical: 3500,
      material: 8500,
      floor: 1516,
      labor: 1500,
      msedcl: 1500,
      loading: 1500,
    },
    {
      kw: 2,
      electrical: 3500,
      material: 8500,
      floor: 3032,
      labor: 3000,
      msedcl: 1500,
      loading: 1500,
    },
    {
      kw: 3,
      electrical: 4200,
      material: 8500,
      floor: 4548,
      labor: 4400,
      msedcl: 1500,
      loading: 1500,
    },
    {
      kw: 4,
      electrical: 4800,
      material: 8500,
      floor: 6064,
      labor: 5600,
      msedcl: 1500,
      loading: 2000,
    },
    {
      kw: 5,
      electrical: 6000,
      material: 8500,
      floor: 7580,
      labor: 7000,
      msedcl: 2000,
      loading: 2000,
    },
    {
      kw: 6,
      electrical: 6500,
      material: 8500,
      floor: 9096,
      labor: 8400,
      msedcl: 2000,
      loading: 2000,
    },
    {
      kw: 7,
      electrical: 7200,
      material: 17807,
      floor: 10612,
      labor: 9000,
      msedcl: 2000,
      loading: 2000,
    },
    {
      kw: 8,
      electrical: 8000,
      material: 17807,
      floor: 12128,
      labor: 9600,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 9,
      electrical: 8500,
      material: 17857,
      floor: 13644,
      labor: 10800,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 10,
      electrical: 8500,
      material: 17857,
      floor: 15160,
      labor: 12000,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 11,
      electrical: 10000,
      material: 17857,
      floor: 16676,
      labor: 13000,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 12,
      electrical: 10000,
      material: 17857,
      floor: 18192,
      labor: 14400,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 13,
      electrical: 12000,
      material: 17857,
      floor: 19708,
      labor: 15600,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 14,
      electrical: 12000,
      material: 17857,
      floor: 21224,
      labor: 17000,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 15,
      electrical: 12000,
      material: 22711,
      floor: 22740,
      labor: 18000,
      msedcl: 2500,
      loading: 2500,
    },
    {
      kw: 16,
      electrical: 12000,
      material: 22711,
      floor: 16825,
      labor: 18000,
      msedcl: 2200,
      loading: 2500,
    },
    {
      kw: 17,
      electrical: 12000,
      material: 22711,
      floor: 16825,
      labor: 19000,
      msedcl: 2200,
      loading: 2500,
    },
    {
      kw: 18,
      electrical: 15000,
      material: 22711,
      floor: 19225,
      labor: 20000,
      msedcl: 2200,
      loading: 2500,
    },
    {
      kw: 19,
      electrical: 15000,
      material: 22711,
      floor: 19225,
      labor: 22000,
      msedcl: 2200,
      loading: 2500,
    },
    {
      kw: 20,
      electrical: 15000,
      material: 22711,
      floor: 19225,
      labor: 24000,
      msedcl: 2200,
      loading: 3000,
    },
    {
      kw: 21,
      electrical: 15000,
      material: 22711,
      floor: 27580,
      labor: 25200,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 22,
      electrical: 15000,
      material: 22711,
      floor: 27580,
      labor: 26400,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 23,
      electrical: 15000,
      material: 22711,
      floor: 27580,
      labor: 27600,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 24,
      electrical: 15000,
      material: 22711,
      floor: 27580,
      labor: 28800,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 25,
      electrical: 20000,
      material: 22711,
      floor: 27580,
      labor: 30000,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 26,
      electrical: 20000,
      material: 60939,
      floor: 27580,
      labor: 31200,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 27,
      electrical: 20000,
      material: 60939,
      floor: 27580,
      labor: 32400,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 28,
      electrical: 20000,
      material: 60939,
      floor: 27580,
      labor: 33600,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 29,
      electrical: 20000,
      material: 60939,
      floor: 27580,
      labor: 34800,
      msedcl: 4800,
      loading: 3500,
    },
    {
      kw: 30,
      electrical: 20000,
      material: 60939,
      floor: 27580,
      labor: 36000,
      msedcl: 4800,
      loading: 4000,
    },
    {
      kw: 31,
      electrical: 25000,
      material: 60939,
      floor: 44500,
      labor: 37200,
      msedcl: 7000,
      loading: 4000,
    },
    {
      kw: 32,
      electrical: 25000,
      material: 60939,
      floor: 44500,
      labor: 38400,
      msedcl: 7000,
      loading: 4000,
    },
    {
      kw: 33,
      electrical: 25000,
      material: 60939,
      floor: 44500,
      labor: 39600,
      msedcl: 7000,
      loading: 4000,
    },
    {
      kw: 34,
      electrical: 25000,
      material: 60939,
      floor: 44500,
      labor: 40800,
      msedcl: 7000,
      loading: 4000,
    },
    {
      kw: 35,
      electrical: 25000,
      material: 60939,
      floor: 44500,
      labor: 42000,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 36,
      electrical: 25000,
      material: 60939,
      floor: 44500,
      labor: 43200,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 37,
      electrical: 25000,
      material: 60939,
      floor: 44500,
      labor: 44400,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 38,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 45600,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 39,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 46800,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 40,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 48000,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 41,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 49200,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 42,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 50400,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 43,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 51600,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 44,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 52800,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 45,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 54000,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 46,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 55200,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 47,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 56400,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 48,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 57600,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 49,
      electrical: 30000,
      material: 60939,
      floor: 44500,
      labor: 58800,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 50,
      electrical: 30000,
      material: 63456,
      floor: 44500,
      labor: 60000,
      msedcl: 7000,
      loading: 5000,
    },
    {
      kw: 51,
      electrical: 30000,
      material: 63456,
      floor: 60000,
      labor: 61200,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 52,
      electrical: 30000,
      material: 63456,
      floor: 60000,
      labor: 62400,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 53,
      electrical: 30000,
      material: 63456,
      floor: 60000,
      labor: 63600,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 54,
      electrical: 30000,
      material: 63456,
      floor: 60000,
      labor: 64800,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 55,
      electrical: 30000,
      material: 63456,
      floor: 60000,
      labor: 66000,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 56,
      electrical: 30000,
      material: 63456,
      floor: 60000,
      labor: 67200,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 57,
      electrical: 30000,
      material: 63456,
      floor: 60000,
      labor: 68400,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 58,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 69600,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 59,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 70800,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 60,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 72000,
      msedcl: 9000,
      loading: 5000,
    },
    {
      kw: 61,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 73200,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 62,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 74400,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 63,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 75600,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 64,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 76800,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 65,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 78000,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 66,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 79200,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 67,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 80400,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 68,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 81600,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 69,
      electrical: 40000,
      material: 63456,
      floor: 60000,
      labor: 82800,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 70,
      electrical: 40000,
      material: 83964,
      floor: 60000,
      labor: 84000,
      msedcl: 9000,
      loading: 8000,
    },
    {
      kw: 71,
      electrical: 40000,
      material: 83964,
      floor: 75000,
      labor: 85200,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 72,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 86400,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 73,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 87600,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 74,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 88800,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 75,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 90000,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 76,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 91200,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 77,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 92400,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 78,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 93600,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 79,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 94800,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 80,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 96000,
      msedcl: 11000,
      loading: 8000,
    },
    {
      kw: 81,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 97200,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 82,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 98400,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 83,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 99600,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 84,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 100800,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 85,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 102000,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 86,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 103200,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 87,
      electrical: 50000,
      material: 83964,
      floor: 75000,
      labor: 104400,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 88,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 105600,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 89,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 106800,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 90,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 108000,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 91,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 109200,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 92,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 110400,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 93,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 111600,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 94,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 112800,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 95,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 114000,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 96,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 115200,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 97,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 116400,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 98,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 117600,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 99,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 118800,
      msedcl: 11000,
      loading: 10000,
    },
    {
      kw: 100,
      electrical: 70000,
      material: 83964,
      floor: 75000,
      labor: 120000,
      msedcl: 11000,
      loading: 10000,
    },
  ];

  for (const data of installationData) {
    // Structure costs are now calculated separately via pricing rules (insertStructurePricingRules)
    const costComponents = JSON.stringify({
      electrical_work: data.electrical,
      fixed_material: data.material,
      variable_floor: data.floor,
      installation_labor: data.labor,
      msedcl_charges: data.msedcl,
      loading_unloading: data.loading,
      // Profitability percentage for this system size tier
      profitability_percent: getProfitabilityPercent(data.kw),
    });

    const name = `Installation Charges ${data.kw}KW`;
    const code = `INST-${data.kw}KW`;

    await queryRunner.query(
      `
      INSERT INTO installation_pricing (id, organization_id, name, code, min_system_size_kw, max_system_size_kw, project_type, transport_rate_per_km, floor_increment_percent, gst_rate, cost_components, effective_from, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `,
      [
        uuidv4(),
        ORG_ID,
        name,
        code,
        data.kw,
        data.kw,
        'residential',
        35,
        25,
        18,
        costComponents,
        '2024-01-01',
        true,
      ],
    );
  }

  console.log(`  ✓ Inserted ${installationData.length} installation pricing tiers`);
}

// =====================================================
// SUBSIDY CONFIGURATIONS
// =====================================================
async function insertSubsidyConfigurations(queryRunner: QueryRunner): Promise<void> {
  // PM Surya Ghar - Residential (Tiered)
  const residentialTiers = JSON.stringify([
    { fromKw: 0, toKw: 2, ratePerKw: 30000 },
    { fromKw: 2, toKw: 3, ratePerKw: 18000 },
  ]);

  await queryRunner.query(
    `
    INSERT INTO subsidy_configurations (id, organization_id, scheme_name, scheme_code, scheme_type, project_type, max_subsidy_kw, max_subsidy_amount, requires_dcr, auto_split_enabled, tiers, is_active, description, effective_from, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `,
    [
      uuidv4(),
      ORG_ID,
      'PM Surya Ghar - Residential',
      'PM-SURYA-GHAR-RES',
      'pm_surya_ghar',
      'residential',
      3,
      78000,
      true,
      true,
      residentialTiers,
      true,
      '₹30000/KW for first 2KW, ₹18000 for 3rd KW. Max subsidy ₹78000.',
      '2024-01-01',
    ],
  );

  // PM Surya Ghar - Apartment Common Areas
  const apartmentTiers = JSON.stringify([{ fromKw: 0, toKw: 500, ratePerKw: 18000 }]);

  await queryRunner.query(
    `
    INSERT INTO subsidy_configurations (id, organization_id, scheme_name, scheme_code, scheme_type, project_type, max_subsidy_kw, max_subsidy_amount, requires_dcr, auto_split_enabled, tiers, is_active, description, effective_from, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `,
    [
      uuidv4(),
      ORG_ID,
      'PM Surya Ghar - Apartment Common',
      'PM-SURYA-GHAR-APT',
      'pm_surya_ghar',
      'residential_apartment',
      500,
      9000000,
      true,
      true,
      apartmentTiers,
      true,
      '₹18000/KW for apartment common areas up to 500KW.',
      '2024-01-01',
    ],
  );

  // No Subsidy - Commercial/Industrial
  const noSubsidyTiers = JSON.stringify([]);

  await queryRunner.query(
    `
    INSERT INTO subsidy_configurations (id, organization_id, scheme_name, scheme_code, scheme_type, project_type, max_subsidy_kw, max_subsidy_amount, requires_dcr, auto_split_enabled, tiers, is_active, description, effective_from, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `,
    [
      uuidv4(),
      ORG_ID,
      'No Subsidy - Commercial/Industrial',
      'NO-SUBSIDY-COM',
      'none',
      'commercial',
      0,
      0,
      false,
      false,
      noSubsidyTiers,
      true,
      'No government subsidy for commercial/industrial projects.',
      '2024-01-01',
    ],
  );

  console.log(`  ✓ Inserted 3 subsidy configurations`);
}

// =====================================================
// QUOTE CONFIGURATION
// =====================================================
async function insertQuoteConfiguration(queryRunner: QueryRunner): Promise<void> {
  const gstConfig = JSON.stringify({
    rate1: 12,
    rate1Percentage: 70,
    rate2: 18,
    rate2Percentage: 30,
  });
  const wattageRounding = JSON.stringify({ roundTo: 10, roundUpThreshold: 5 });
  const paymentMilestones = JSON.stringify([
    { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
    { stage: 'installation_complete', name: 'Installation Complete', percentage: 85, order: 2 },
    { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
  ]);

  await queryRunner.query(
    `
    INSERT INTO quote_configurations (id, organization_id, default_validity_days, max_versions, default_completion_weeks, gst_config, wattage_rounding, payment_milestones, show_inventory_stock, min_profit_margin_percent, is_active, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `,
    [
      uuidv4(),
      ORG_ID,
      30,
      3,
      4,
      gstConfig,
      wattageRounding,
      paymentMilestones,
      true,
      15,
      true,
      'Default quote configuration for OneOhm EPC',
    ],
  );

  console.log(`  ✓ Inserted 1 quote configuration`);
}

// =====================================================
// MAIN EXPORT - Run from command line
// =====================================================
export async function runSeed(): Promise<void> {
  // This will be called from the seed runner
  // Import the DataSource from ormconfig (default export)
  const dataSource = (await import('../ormconfig')).default;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  await seedMasterData(dataSource);
}

// Allow running directly: npx ts-node src/database/seeds/master-data.seed.ts
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('🎉 Seed completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error);
      process.exit(1);
    });
}
