import { DataSource, type QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import loadConfig from '../../config/configuration';

/**
 * Master Data Seed for Organization: OneOhm EPC
 *
 * Seeds:
 * 1. Product Types (3) + Product Type Attributes
 * 2. Brands (10) + Brand-Product Type mappings
 * 3. Products (56 - panels, inverters, structures)
 *    - DCR Panels: 9 (including Adani TOPCon DCR 600-620Wp)
 *    - Non-DCR Panels: 9
 *    - 1-Phase Inverters: 13
 *    - 3-Phase Inverters: 20
 *    - Structures: 5 (Rail Mount, RCC 3X6, Elevated 6X9, Super Elevated, Ground Mount)
 * 4. Product Prices (51)
 * 5. Installation Pricing (100 - 1KW to 100KW)
 * 6. Subsidy Configurations (3 - residential, apartment, commercial/industrial)
 * 7. Quote Configuration (1)
 */

// const ORG_ID = loadConfig().seed.organizationId;
let ORG_ID: string;
// =====================================================
// Product Type IDs (Pre-generated)
// =====================================================
const PRODUCT_TYPE_IDS = {
  SOLAR_PANEL: uuidv4(),
  INVERTER: uuidv4(),
  MOUNTING_STRUCTURE: uuidv4(),
};

// =====================================================
// Brand IDs (Pre-generated)
// =====================================================
const BRAND_IDS: Record<string, string> = {
  Adani: uuidv4(),
  Waaree: uuidv4(),
  Premier: uuidv4(),
  Navitas: uuidv4(),
  Vikram: uuidv4(),
  Renewsys: uuidv4(),
  Sungrow: uuidv4(),
  Goodwe: uuidv4(),
  SolarEdge: uuidv4(),
  Generic: uuidv4(),
};

// =====================================================
// Product IDs (Pre-generated for pricing references)
// =====================================================
const PRODUCT_IDS: Record<string, string> = {};

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
       // =====================================================
    // FIND OR USE CONFIGURED ORGANIZATION
    // =====================================================
    const orgResult = await queryRunner.query(
      `SELECT id FROM organizations WHERE code = $1 LIMIT 1`,
      ['ONEOHM'],
    );

    if (orgResult.length === 0) {
      // Fallback to config if ONEOHM doesn't exist
      ORG_ID = loadConfig().seed.organizationId;
      console.warn(`ℹ️ No ONEOHM organization found, using configured ID: ${ORG_ID}`);
    } else {
      ORG_ID = orgResult[0].id;
      console.log(`✅ Found ONEOHM organization: ${ORG_ID}`);
    }

    console.log('🌱 Seeding master data for organization:', ORG_ID);

    // =====================================================
    // 0. CLEANUP EXISTING DATA (in correct order for FK constraints)
    // =====================================================
    console.log('🧹 Cleaning up existing master data...');

    await queryRunner.query(
      `DELETE FROM quote_versions 
      WHERE quote_id IN (SELECT id FROM quotes WHERE organization_id = $1)`,
      [ORG_ID],
    );
    // Delete projects that reference quotes for this org (quote_id is NOT NULL in projects)
    await queryRunner.query(
      `DELETE FROM projects WHERE quote_id IN (SELECT id FROM quotes WHERE organization_id = $1)`,
      [ORG_ID],
    );
    await queryRunner.query(`DELETE FROM quotes WHERE organization_id = $1`, [ORG_ID]);

    await queryRunner.query(`DELETE FROM quote_configurations WHERE organization_id = $1`, [
      ORG_ID,
    ]);
    await queryRunner.query(`DELETE FROM subsidy_configurations WHERE organization_id = $1`, [
      ORG_ID,
    ]);
    await queryRunner.query(`DELETE FROM installation_pricing WHERE organization_id = $1`, [
      ORG_ID,
    ]);
    await queryRunner.query(`DELETE FROM product_prices WHERE organization_id = $1`, [ORG_ID]);
    await queryRunner.query(`DELETE FROM products WHERE organization_id = $1`, [ORG_ID]);
    await queryRunner.query(
      `DELETE FROM brand_product_types WHERE brand_id IN (SELECT id FROM brands WHERE organization_id = $1)`,
      [ORG_ID],
    );
    await queryRunner.query(`DELETE FROM brands WHERE organization_id = $1`, [ORG_ID]);
    await queryRunner.query(
      `DELETE FROM product_type_attributes WHERE product_type_id IN (SELECT id FROM product_types WHERE organization_id = $1) AND is_system IS NOT TRUE`,
      [ORG_ID],
    );
    await queryRunner.query(
      `DELETE FROM product_types WHERE organization_id = $1 AND is_system IS NOT TRUE`,
      [ORG_ID],
    );

    console.log('✅ Cleanup completed');

    // =====================================================
    // 1. PRODUCT TYPES + ATTRIBUTES
    // =====================================================
    console.log('📁 Inserting product types and attributes...');
    await insertProductTypes(queryRunner);

    // =====================================================
    // 2. BRANDS + BRAND-PRODUCT TYPE MAPPINGS
    // =====================================================
    console.log('🏷️ Inserting brands...');
    await insertBrands(queryRunner);

    // =====================================================
    // 3. PRODUCTS
    // =====================================================
    console.log('📦 Inserting products...');
    await insertProducts(queryRunner);

    // =====================================================
    // 4. PRODUCT PRICES
    // =====================================================
    console.log('💰 Inserting product prices...');
    await insertProductPrices(queryRunner);

    // =====================================================
    // 5. INSTALLATION PRICING
    // =====================================================
    console.log('🔧 Inserting installation pricing (1-100 KW)...');
    await insertInstallationPricing(queryRunner);

    // =====================================================
    // 6. SUBSIDY CONFIGURATIONS
    // =====================================================
    console.log('🏛️ Inserting subsidy configurations...');
    await insertSubsidyConfigurations(queryRunner);

    // =====================================================
    // 7. QUOTE CONFIGURATION
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
// PRODUCT TYPES + ATTRIBUTES
// =====================================================
async function insertProductTypes(queryRunner: QueryRunner): Promise<void> {
  const productTypes = [
    {
      id: PRODUCT_TYPE_IDS.SOLAR_PANEL,
      name: 'Solar Panel',
      code: 'solar_panel',
      description: 'Solar photovoltaic panels',
      defaultPricingBasis: 'per_watt',
      defaultGstRate: 5.0,
      unitOfMeasure: 'pcs',
      sortOrder: 1,
    },
    {
      id: PRODUCT_TYPE_IDS.INVERTER,
      name: 'Inverter',
      code: 'inverter',
      description: 'Solar inverters for power conversion',
      defaultPricingBasis: 'per_unit',
      defaultGstRate: 5.0,
      unitOfMeasure: 'pcs',
      sortOrder: 2,
    },
    {
      id: PRODUCT_TYPE_IDS.MOUNTING_STRUCTURE,
      name: 'Mounting Structure',
      code: 'mounting_structure',
      description: 'Panel mounting structures',
      defaultPricingBasis: 'per_kw',
      defaultGstRate: 18.0,
      unitOfMeasure: 'set',
      sortOrder: 3,
    },
  ];

  for (const pt of productTypes) {
    await queryRunner.query(
      `INSERT INTO product_types (id, organization_id, name, code, description, default_pricing_basis, default_gst_rate, default_unit_of_measure, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING`,
      [
        pt.id,
        ORG_ID,
        pt.name,
        pt.code,
        pt.description,
        pt.defaultPricingBasis,
        pt.defaultGstRate,
        pt.unitOfMeasure,
        pt.sortOrder,
      ],
    );
  }

  // Re-read the actual IDs from DB (ON CONFLICT DO NOTHING may have kept existing rows with different IDs)
  const [ptSolar] = await queryRunner.query(
    `SELECT id FROM product_types WHERE organization_id = $1 AND code = 'solar_panel' LIMIT 1`,
    [ORG_ID],
  );
  const [ptInverter] = await queryRunner.query(
    `SELECT id FROM product_types WHERE organization_id = $1 AND code = 'inverter' LIMIT 1`,
    [ORG_ID],
  );
  const [ptStructure] = await queryRunner.query(
    `SELECT id FROM product_types WHERE organization_id = $1 AND code = 'mounting_structure' LIMIT 1`,
    [ORG_ID],
  );

  // Update in-memory IDs to match what's actually in the DB
  PRODUCT_TYPE_IDS.SOLAR_PANEL = ptSolar.id as string;
  PRODUCT_TYPE_IDS.INVERTER = ptInverter.id as string;
  PRODUCT_TYPE_IDS.MOUNTING_STRUCTURE = ptStructure.id as string;

  console.log(`  ✓ Inserted ${productTypes.length} product types`);

  // Solar Panel Attributes
  const solarPanelAttrs = [
    {
      key: 'wattage',
      label: 'Wattage (Wp)',
      dataType: 'integer',
      required: true,
      filterable: true,
      validation: { min: 100, max: 1000 },
      group: 'specifications',
      sort: 1,
    },
    {
      key: 'technology',
      label: 'Cell Technology',
      dataType: 'enum',
      required: true,
      filterable: true,
      validation: { values: ['perc', 'topcon', 'hjt', 'thin_film'] },
      group: 'specifications',
      sort: 2,
    },
    {
      key: 'is_dcr',
      label: 'DCR Approved',
      dataType: 'boolean',
      required: true,
      filterable: true,
      validation: null,
      group: 'compliance',
      sort: 3,
    },
    {
      key: 'min_wattage',
      label: 'Min Wattage (Wp)',
      dataType: 'integer',
      required: false,
      filterable: false,
      validation: null,
      group: 'specifications',
      sort: 4,
    },
    {
      key: 'max_wattage',
      label: 'Max Wattage (Wp)',
      dataType: 'integer',
      required: false,
      filterable: false,
      validation: null,
      group: 'specifications',
      sort: 5,
    },
    {
      key: 'efficiency',
      label: 'Efficiency (%)',
      dataType: 'decimal',
      required: false,
      filterable: false,
      validation: { min: 10, max: 30 },
      group: 'performance',
      sort: 6,
    },
  ];

  for (const attr of solarPanelAttrs) {
    await queryRunner.query(
      `INSERT INTO product_type_attributes (id, product_type_id, attribute_key, label, data_type, is_required, is_filterable, default_value, validation, group_name, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10)
      ON CONFLICT (product_type_id, attribute_key) DO NOTHING`,
      [
        uuidv4(),
        PRODUCT_TYPE_IDS.SOLAR_PANEL,
        attr.key,
        attr.label,
        attr.dataType,
        attr.required,
        attr.filterable,
        attr.validation ? JSON.stringify(attr.validation) : null,
        attr.group,
        attr.sort,
      ],
    );
  }

  // Inverter Attributes
  const inverterAttrs = [
    {
      key: 'capacity_kw',
      label: 'Capacity (KW)',
      dataType: 'decimal',
      required: true,
      filterable: true,
      validation: { min: 0.5, max: 500 },
      group: 'specifications',
      sort: 1,
    },
    {
      key: 'phase_type',
      label: 'Phase Type',
      dataType: 'enum',
      required: true,
      filterable: true,
      validation: { values: ['single_phase', 'three_phase'] },
      group: 'specifications',
      sort: 2,
    },
    {
      key: 'min_system_size_kw',
      label: 'Min System Size (KW)',
      dataType: 'decimal',
      required: false,
      filterable: false,
      validation: null,
      group: 'compatibility',
      sort: 3,
    },
    {
      key: 'max_system_size_kw',
      label: 'Max System Size (KW)',
      dataType: 'decimal',
      required: false,
      filterable: false,
      validation: null,
      group: 'compatibility',
      sort: 4,
    },
    {
      key: 'voltage',
      label: 'Voltage',
      dataType: 'string',
      required: false,
      filterable: false,
      validation: null,
      group: 'specifications',
      sort: 5,
    },
  ];

  for (const attr of inverterAttrs) {
    await queryRunner.query(
      `INSERT INTO product_type_attributes (id, product_type_id, attribute_key, label, data_type, is_required, is_filterable, default_value, validation, group_name, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10)
      ON CONFLICT (product_type_id, attribute_key) DO NOTHING`,
      [
        uuidv4(),
        PRODUCT_TYPE_IDS.INVERTER,
        attr.key,
        attr.label,
        attr.dataType,
        attr.required,
        attr.filterable,
        attr.validation ? JSON.stringify(attr.validation) : null,
        attr.group,
        attr.sort,
      ],
    );
  }

  // Mounting Structure Attributes
  const structureAttrs = [
    {
      key: 'structure_type',
      label: 'Structure Type',
      dataType: 'enum',
      required: true,
      filterable: true,
      validation: {
        values: ['aluminum_rail', 'rcc_3x6', 'elevated_6x9', 'super_elevated', 'ground_mount'],
      },
      group: 'specifications',
      sort: 1,
    },
    {
      key: 'material',
      label: 'Material',
      dataType: 'string',
      required: false,
      filterable: false,
      validation: null,
      group: 'specifications',
      sort: 2,
    },
    {
      key: 'weight_kg',
      label: 'Weight (kg)',
      dataType: 'decimal',
      required: false,
      filterable: false,
      validation: null,
      group: 'specifications',
      sort: 3,
    },
  ];

  for (const attr of structureAttrs) {
    await queryRunner.query(
      `INSERT INTO product_type_attributes (id, product_type_id, attribute_key, label, data_type, is_required, is_filterable, default_value, validation, group_name, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10)
      ON CONFLICT (product_type_id, attribute_key) DO NOTHING`,
      [
        uuidv4(),
        PRODUCT_TYPE_IDS.MOUNTING_STRUCTURE,
        attr.key,
        attr.label,
        attr.dataType,
        attr.required,
        attr.filterable,
        attr.validation ? JSON.stringify(attr.validation) : null,
        attr.group,
        attr.sort,
      ],
    );
  }

  const totalAttrs = solarPanelAttrs.length + inverterAttrs.length + structureAttrs.length;
  console.log(`  ✓ Inserted ${totalAttrs} product type attributes`);
}

// =====================================================
// BRANDS + BRAND-PRODUCT TYPE MAPPINGS
// =====================================================
async function insertBrands(queryRunner: QueryRunner): Promise<void> {
  const brands = [
    {
      id: BRAND_IDS['Adani'],
      name: 'Adani',
      manufacturer: 'Adani Solar',
      website: 'https://www.adanisolar.com',
    },
    {
      id: BRAND_IDS['Waaree'],
      name: 'Waaree',
      manufacturer: 'Waaree Energies',
      website: 'https://www.waaree.com',
    },
    {
      id: BRAND_IDS['Premier'],
      name: 'Premier',
      manufacturer: 'Premier Energies',
      website: 'https://www.premierenergies.com',
    },
    {
      id: BRAND_IDS['Navitas'],
      name: 'Navitas',
      manufacturer: 'Navitas Solar',
      website: 'https://www.navitassolar.com',
    },
    {
      id: BRAND_IDS['Vikram'],
      name: 'Vikram',
      manufacturer: 'Vikram Solar',
      website: 'https://www.vikramsolar.com',
    },
    {
      id: BRAND_IDS['Renewsys'],
      name: 'Renewsys',
      manufacturer: 'Renewsys India',
      website: 'https://www.renewsysindia.com',
    },
    {
      id: BRAND_IDS['Sungrow'],
      name: 'Sungrow',
      manufacturer: 'Sungrow Power',
      website: 'https://www.sungrowpower.com',
    },
    {
      id: BRAND_IDS['Goodwe'],
      name: 'Goodwe',
      manufacturer: 'Goodwe Power',
      website: 'https://www.goodwe.com',
    },
    {
      id: BRAND_IDS['SolarEdge'],
      name: 'SolarEdge',
      manufacturer: 'SolarEdge Technologies',
      website: 'https://www.solaredge.com',
    },
    { id: BRAND_IDS['Generic'], name: 'Generic', manufacturer: 'OneOhm', website: null },
  ];

  for (const brand of brands) {
    await queryRunner.query(
      `INSERT INTO brands (id, organization_id, name, manufacturer_name, website, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
      ON CONFLICT (organization_id, name) DO NOTHING`,
      [brand.id, ORG_ID, brand.name, brand.manufacturer, brand.website],
    );
  }

  // Re-read actual brand IDs from DB (ON CONFLICT DO NOTHING may have kept existing rows)
  const brandRows = await queryRunner.query(
    `SELECT id, name FROM brands WHERE organization_id = $1 AND name = ANY($2::text[])`,
    [ORG_ID, Object.keys(BRAND_IDS)],
  );
  for (const row of brandRows as Array<{ id: string; name: string }>) {
    BRAND_IDS[row.name] = row.id;
  }

  console.log(`  ✓ Inserted ${brands.length} brands`);

  // Brand-Product Type mappings
  const brandProductTypes = [
    // Panel brands
    { brandId: BRAND_IDS['Adani'], productTypeId: PRODUCT_TYPE_IDS.SOLAR_PANEL },
    { brandId: BRAND_IDS['Waaree'], productTypeId: PRODUCT_TYPE_IDS.SOLAR_PANEL },
    { brandId: BRAND_IDS['Premier'], productTypeId: PRODUCT_TYPE_IDS.SOLAR_PANEL },
    { brandId: BRAND_IDS['Navitas'], productTypeId: PRODUCT_TYPE_IDS.SOLAR_PANEL },
    { brandId: BRAND_IDS['Vikram'], productTypeId: PRODUCT_TYPE_IDS.SOLAR_PANEL },
    { brandId: BRAND_IDS['Renewsys'], productTypeId: PRODUCT_TYPE_IDS.SOLAR_PANEL },
    // Inverter brands
    { brandId: BRAND_IDS['Sungrow'], productTypeId: PRODUCT_TYPE_IDS.INVERTER },
    { brandId: BRAND_IDS['Goodwe'], productTypeId: PRODUCT_TYPE_IDS.INVERTER },
    { brandId: BRAND_IDS['SolarEdge'], productTypeId: PRODUCT_TYPE_IDS.INVERTER },
    // Structure brand
    { brandId: BRAND_IDS['Generic'], productTypeId: PRODUCT_TYPE_IDS.MOUNTING_STRUCTURE },
  ];

  for (const bpt of brandProductTypes) {
    await queryRunner.query(
      `INSERT INTO brand_product_types (id, brand_id, product_type_id, is_active, created_at)
      VALUES ($1, $2, $3, TRUE, NOW())
      ON CONFLICT (brand_id, product_type_id) DO NOTHING`,
      [uuidv4(), bpt.brandId, bpt.productTypeId],
    );
  }
  console.log(`  ✓ Inserted ${brandProductTypes.length} brand-product type mappings`);
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
      wattage: panel.wattage,
      technology: panel.tech,
      is_dcr: true,
      min_wattage: panel.minW,
      max_wattage: panel.maxW,
      efficiency: panel.eff,
    });
    await queryRunner.query(
      `INSERT INTO products (id, organization_id, product_type_id, brand_id, name, code, description, model_number, unit_of_measure, product_warranty_years, performance_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING`,
      [
        PRODUCT_IDS[panel.code],
        ORG_ID,
        PRODUCT_TYPE_IDS.SOLAR_PANEL,
        BRAND_IDS[panel.brand],
        panel.name,
        panel.code,
        `${panel.brand} DCR approved ${panel.tech.toUpperCase()} technology panel for subsidy projects`,
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
      wattage: panel.wattage,
      technology: panel.tech,
      is_dcr: false,
      min_wattage: panel.minW,
      max_wattage: panel.maxW,
      efficiency: panel.eff,
    });
    await queryRunner.query(
      `INSERT INTO products (id, organization_id, product_type_id, brand_id, name, code, description, model_number, unit_of_measure, product_warranty_years, performance_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING`,
      [
        PRODUCT_IDS[panel.code],
        ORG_ID,
        PRODUCT_TYPE_IDS.SOLAR_PANEL,
        BRAND_IDS[panel.brand],
        panel.name,
        panel.code,
        `${panel.brand} Non-DCR ${panel.tech.toUpperCase()} panel for commercial projects`,
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
      capacity_kw: inv.capacity,
      phase_type: 'single_phase',
      min_system_size_kw: inv.minSize,
      max_system_size_kw: inv.maxSize,
      voltage: '230V',
    });
    await queryRunner.query(
      `INSERT INTO products (id, organization_id, product_type_id, brand_id, name, code, description, model_number, unit_of_measure, product_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING`,
      [
        PRODUCT_IDS[inv.code],
        ORG_ID,
        PRODUCT_TYPE_IDS.INVERTER,
        BRAND_IDS[inv.brand],
        inv.name,
        inv.code,
        `${inv.brand} ${inv.capacity}KW single phase on-grid inverter`,
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
      capacity_kw: inv.capacity,
      phase_type: 'three_phase',
      min_system_size_kw: inv.minSize,
      max_system_size_kw: inv.maxSize,
      voltage: '415V',
    });
    await queryRunner.query(
      `INSERT INTO products (id, organization_id, product_type_id, brand_id, name, code, description, model_number, unit_of_measure, product_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING`,
      [
        PRODUCT_IDS[inv.code],
        ORG_ID,
        PRODUCT_TYPE_IDS.INVERTER,
        BRAND_IDS[inv.brand],
        inv.name,
        inv.code,
        `${inv.brand} ${inv.capacity}KW three phase on-grid inverter`,
        inv.model,
        'pcs',
        inv.warranty,
        'active',
        specs,
      ],
    );
  }

  // Mounting Structures
  const structures = [
    {
      code: 'STRUCT-RAIL-MOUNT',
      name: 'Aluminum Rail Mount Structure',
      type: 'aluminum_rail',
      weight: 15,
    },
    { code: 'STRUCT-RCC-3X6', name: '3 feet X 6 Feet Structure', type: 'rcc_3x6', weight: 20 },
    {
      code: 'STRUCT-ELEVATED-6X9',
      name: 'Elevated 6x9 Feet Structure',
      type: 'elevated_6x9',
      weight: 35,
    },
    {
      code: 'STRUCT-SUPER-ELEVATED',
      name: 'Super Elevated 10x14 Feet Structure',
      type: 'super_elevated',
      weight: 50,
    },
    {
      code: 'STRUCT-GROUND-MOUNT',
      name: 'Ground Mount Structure',
      type: 'ground_mount',
      weight: 40,
    },
  ];

  for (const struct of structures) {
    const specs = JSON.stringify({
      structure_type: struct.type,
      material: 'Aluminum',
      weight_kg: struct.weight,
    });
    await queryRunner.query(
      `INSERT INTO products (id, organization_id, product_type_id, brand_id, name, code, description, model_number, unit_of_measure, product_warranty_years, status, specifications, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (organization_id, code) DO NOTHING`,
      [
        PRODUCT_IDS[struct.code],
        ORG_ID,
        PRODUCT_TYPE_IDS.MOUNTING_STRUCTURE,
        BRAND_IDS['Generic'],
        struct.name,
        struct.code,
        `${struct.name} for solar installation`,
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
// PRODUCT PRICES
// =====================================================
async function insertProductPrices(queryRunner: QueryRunner): Promise<void> {
  // Panel Prices
  const panelPricing = [
    { productCode: 'ADANI-PERC-DCR', unitPrice: 25.75, projectType: 'residential' },
    { productCode: 'ADANI-TOPCON-DCR', unitPrice: 26.4, projectType: 'residential' },
    { productCode: 'ADANI-TOPCON-DCR-600', unitPrice: 26.4, projectType: 'residential' },
    { productCode: 'ADANI-PERC-NONDCR', unitPrice: 15.0, projectType: 'commercial' },
    { productCode: 'ADANI-TOPCON-NONDCR', unitPrice: 15.5, projectType: 'commercial' },
    { productCode: 'WAAREE-PERC-DCR', unitPrice: 24.5, projectType: 'residential' },
    { productCode: 'WAAREE-TOPCON-DCR', unitPrice: 25.0, projectType: 'residential' },
    { productCode: 'WAAREE-PERC-NONDCR', unitPrice: 14.0, projectType: 'commercial' },
    { productCode: 'WAAREE-TOPCON-NONDCR', unitPrice: 14.5, projectType: 'commercial' },
    { productCode: 'PREMIER-PERC-DCR', unitPrice: 24.25, projectType: 'residential' },
    { productCode: 'PREMIER-TOPCON-DCR', unitPrice: 24.5, projectType: 'residential' },
    { productCode: 'PREMIER-PERC-NONDCR', unitPrice: 14.0, projectType: 'commercial' },
    { productCode: 'PREMIER-TOPCON-NONDCR', unitPrice: 14.5, projectType: 'commercial' },
    { productCode: 'NAVITAS-PERC-DCR', unitPrice: 24.0, projectType: 'residential' },
    { productCode: 'NAVITAS-TOPCON-NONDCR', unitPrice: 14.0, projectType: 'commercial' },
    { productCode: 'VIKRAM-PERC-DCR', unitPrice: 27.0, projectType: 'residential' },
    { productCode: 'VIKRAM-TOPCON-NONDCR', unitPrice: 16.0, projectType: 'commercial' },
    { productCode: 'RENEWSYS-TOPCON-NONDCR', unitPrice: 14.5, projectType: 'commercial' },
  ];

  for (const price of panelPricing) {
    await queryRunner.query(
      `INSERT INTO product_prices (id, organization_id, product_id, project_type, unit_price, cost_multiplier, gst_rate, currency, effective_from, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT DO NOTHING`,
      [
        uuidv4(),
        ORG_ID,
        PRODUCT_IDS[price.productCode],
        price.projectType,
        price.unitPrice,
        1.0,
        5.0,
        'INR',
        '2024-01-01',
        true,
      ],
    );
  }

  // Inverter Prices
  const inverterPricing = [
    { productCode: 'SUNGROW-1KW-1P', unitPrice: 13500 },
    { productCode: 'SUNGROW-2KW-1P', unitPrice: 14500 },
    { productCode: 'SUNGROW-3KW-1P', unitPrice: 15800 },
    { productCode: 'SUNGROW-4KW-1P', unitPrice: 26500 },
    { productCode: 'SUNGROW-5KW-1P', unitPrice: 29000 },
    { productCode: 'SUNGROW-6KW-1P', unitPrice: 30000 },
    { productCode: 'SUNGROW-8KW-3P', unitPrice: 52000 },
    { productCode: 'SUNGROW-10KW-3P', unitPrice: 56000 },
    { productCode: 'SUNGROW-12KW-3P', unitPrice: 62000 },
    { productCode: 'SUNGROW-15KW-3P', unitPrice: 67000 },
    { productCode: 'SUNGROW-20KW-3P', unitPrice: 77000 },
    { productCode: 'SUNGROW-33KW-3P', unitPrice: 126000 },
    { productCode: 'SUNGROW-50KW-3P', unitPrice: 148000 },
    { productCode: 'SUNGROW-75KW-3P', unitPrice: 222000 },
    { productCode: 'SUNGROW-100KW-3P', unitPrice: 265000 },
    { productCode: 'GOODWE-2KW-1P', unitPrice: 15400 },
    { productCode: 'GOODWE-3KW-1P', unitPrice: 15600 },
    { productCode: 'GOODWE-4KW-1P', unitPrice: 30700 },
    { productCode: 'GOODWE-5KW-1P', unitPrice: 31800 },
    { productCode: 'GOODWE-6KW-1P', unitPrice: 33000 },
    { productCode: 'GOODWE-8KW-3P', unitPrice: 53400 },
    { productCode: 'GOODWE-10KW-3P', unitPrice: 54300 },
    { productCode: 'GOODWE-15KW-3P', unitPrice: 62900 },
    { productCode: 'GOODWE-20KW-3P', unitPrice: 65800 },
    { productCode: 'GOODWE-25KW-3P', unitPrice: 98000 },
    { productCode: 'GOODWE-36KW-3P', unitPrice: 124000 },
    { productCode: 'GOODWE-50KW-3P', unitPrice: 159600 },
    { productCode: 'GOODWE-80KW-3P', unitPrice: 220500 },
    { productCode: 'GOODWE-100KW-3P', unitPrice: 260000 },
    { productCode: 'SOLAREDGE-3KW-1P', unitPrice: 18500 },
    { productCode: 'SOLAREDGE-5KW-1P', unitPrice: 29000 },
    { productCode: 'SOLAREDGE-8KW-3P', unitPrice: 58000 },
    { productCode: 'SOLAREDGE-10KW-3P', unitPrice: 63000 },
  ];

  for (const price of inverterPricing) {
    await queryRunner.query(
      `INSERT INTO product_prices (id, organization_id, product_id, project_type, unit_price, cost_multiplier, gst_rate, currency, effective_from, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT DO NOTHING`,
      [
        uuidv4(),
        ORG_ID,
        PRODUCT_IDS[price.productCode],
        null,
        price.unitPrice,
        1.0,
        5.0,
        'INR',
        '2024-01-01',
        true,
      ],
    );
  }

  // Structure Prices
  // Formula: unit_price × cost_multiplier × systemSizeKw
  const structurePricing = [
    { productCode: 'STRUCT-RAIL-MOUNT', unitPrice: 700, costMultiplier: 1.2 }, // 700 × 1.2 = ₹840/KW
    { productCode: 'STRUCT-RCC-3X6', unitPrice: 700, costMultiplier: 4.0 }, // 700 × 4 = ₹2,800/KW
    { productCode: 'STRUCT-ELEVATED-6X9', unitPrice: 700, costMultiplier: 8.0 }, // 700 × 8 = ₹5,600/KW
    { productCode: 'STRUCT-SUPER-ELEVATED', unitPrice: 700, costMultiplier: 12.0 }, // 700 × 12 = ₹8,400/KW
    { productCode: 'STRUCT-GROUND-MOUNT', unitPrice: 700, costMultiplier: 10.0 }, // 700 × 10 = ₹7,000/KW
  ];

  for (const price of structurePricing) {
    await queryRunner.query(
      `INSERT INTO product_prices (id, organization_id, product_id, project_type, unit_price, cost_multiplier, gst_rate, currency, effective_from, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT DO NOTHING`,
      [
        uuidv4(),
        ORG_ID,
        PRODUCT_IDS[price.productCode],
        null,
        price.unitPrice,
        price.costMultiplier,
        18.0,
        'INR',
        '2024-01-01',
        true,
      ],
    );
  }

  console.log(
    `  ✓ Inserted ${panelPricing.length + inverterPricing.length + structurePricing.length} product prices`,
  );
}

// =====================================================
// INSTALLATION PRICING (1-100 KW)
// =====================================================

async function insertInstallationPricing(queryRunner: QueryRunner): Promise<void> {
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
    const costComponents = JSON.stringify({
      electrical_work: data.electrical,
      fixed_material: data.material,
      variable_floor: data.floor,
      installation_labor: data.labor,
      msedcl_charges: data.msedcl,
      loading_unloading: data.loading,
    });

    await queryRunner.query(
      `INSERT INTO installation_pricing (id, organization_id, min_system_size_kw, max_system_size_kw, transport_rate_per_km, floor_increment_percent, gst_rate, cost_components, effective_from, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, NOW(), NOW())
      ON CONFLICT (organization_id, min_system_size_kw, max_system_size_kw) DO NOTHING`,
      [uuidv4(), ORG_ID, data.kw, data.kw, 35, 25, 18, costComponents, '2024-01-01', true],
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
    `INSERT INTO subsidy_configurations (id, organization_id, scheme_name, scheme_code, scheme_type, project_type, max_subsidy_kw, max_subsidy_amount, requires_dcr, auto_split_enabled, tiers, is_active, description, effective_from, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT DO NOTHING`,
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
    `INSERT INTO subsidy_configurations (id, organization_id, scheme_name, scheme_code, scheme_type, project_type, max_subsidy_kw, max_subsidy_amount, requires_dcr, auto_split_enabled, tiers, is_active, description, effective_from, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT DO NOTHING`,
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
    `INSERT INTO subsidy_configurations (id, organization_id, scheme_name, scheme_code, scheme_type, project_type, max_subsidy_kw, max_subsidy_amount, requires_dcr, auto_split_enabled, tiers, is_active, description, effective_from, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT DO NOTHING`,
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
    rate1: 5,
    rate1Percentage: 70,
    rate2: 18,
    rate2Percentage: 30,
  });
  const paymentMilestones = JSON.stringify([
    { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
    { stage: 'installation_complete', name: 'Installation Complete', percentage: 85, order: 2 },
    { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
  ]);

  await queryRunner.query(
    `INSERT INTO quote_configurations (id, organization_id, default_validity_days, max_versions, default_completion_weeks, gst_config, payment_milestones, show_inventory_stock, is_active, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    ON CONFLICT DO NOTHING`,
    [
      uuidv4(),
      ORG_ID,
      30,
      3,
      4,
      gstConfig,
      paymentMilestones,
      true,
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
