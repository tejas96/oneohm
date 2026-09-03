import { DataSource } from 'typeorm';

import dataSource from '../ormconfig';

/**
 * Spec §4.2 H2 + H3 — the catalog the BOM actually needs.
 *
 * Only solar_panel, inverter and mounting_structure are seeded by
 * master-data.seed.ts. Everything else was created by a SELECT DISTINCT over
 * pre-existing products.type values in migration 1790000000000, so on a fresh
 * database the material types do not exist — and a field worker's BOM screen
 * would open onto an empty catalog.
 *
 * The Generic brand already exists but is mapped only to mounting_structure,
 * so this also adds its brand_product_types rows.
 *
 * Idempotent. Safe to re-run.
 *
 * Usage: npm run seed:bom-materials
 */

interface TypeSeed {
  code: string;
  name: string;
  unit: string;
  gstRate: number;
  sortOrder: number;
  /** Attribute keys are deliberately minimal — these are consumables, not spec'd equipment. */
  attributes: Array<{ key: string; label: string; dataType: string; required: boolean }>;
}

const TYPES: TypeSeed[] = [
  {
    code: 'cable',
    name: 'Cable',
    unit: 'mtr',
    gstRate: 18,
    sortOrder: 10,
    attributes: [
      { key: 'core_size_sqmm', label: 'Core size (sq mm)', dataType: 'decimal', required: true },
      { key: 'cable_type', label: 'Cable type', dataType: 'string', required: false },
    ],
  },
  {
    code: 'connector',
    name: 'Connector',
    unit: 'pcs',
    gstRate: 18,
    sortOrder: 11,
    attributes: [
      { key: 'connector_type', label: 'Connector type', dataType: 'string', required: false },
    ],
  },
  {
    code: 'earthing',
    name: 'Earthing',
    unit: 'pcs',
    gstRate: 18,
    sortOrder: 12,
    attributes: [
      { key: 'earthing_type', label: 'Earthing type', dataType: 'string', required: false },
    ],
  },
  {
    code: 'accessories',
    name: 'Accessories',
    unit: 'pcs',
    gstRate: 18,
    sortOrder: 13,
    attributes: [],
  },
];

interface ProductSeed {
  typeCode: string;
  code: string;
  name: string;
  unit: string;
  /** Sell price in rupees. product_prices is DECIMAL(12,2); paise conversion happens on the BOM line. */
  unitPrice: number;
  gstRate: number;
  specifications: Record<string, unknown>;
}

const PRODUCTS: ProductSeed[] = [
  {
    typeCode: 'cable',
    code: 'CABLE-DC-4SQMM',
    name: 'DC Solar Cable 4 sq mm',
    unit: 'mtr',
    unitPrice: 42,
    gstRate: 18,
    specifications: { core_size_sqmm: 4, cable_type: 'dc_solar' },
  },
  {
    typeCode: 'cable',
    code: 'CABLE-DC-6SQMM',
    name: 'DC Solar Cable 6 sq mm',
    unit: 'mtr',
    unitPrice: 58,
    gstRate: 18,
    specifications: { core_size_sqmm: 6, cable_type: 'dc_solar' },
  },
  {
    typeCode: 'cable',
    code: 'CABLE-AC-4C-6SQMM',
    name: 'AC Cable 4 Core 6 sq mm',
    unit: 'mtr',
    unitPrice: 165,
    gstRate: 18,
    specifications: { core_size_sqmm: 6, cable_type: 'ac_4core' },
  },
  {
    typeCode: 'connector',
    code: 'CONN-MC4-PAIR',
    name: 'MC4 Connector Pair',
    unit: 'pcs',
    unitPrice: 85,
    gstRate: 18,
    specifications: { connector_type: 'mc4' },
  },
  {
    typeCode: 'earthing',
    code: 'EARTH-KIT-CHEM',
    name: 'Chemical Earthing Kit',
    unit: 'pcs',
    unitPrice: 1500,
    gstRate: 18,
    specifications: { earthing_type: 'chemical' },
  },
  {
    typeCode: 'earthing',
    code: 'EARTH-STRIP-GI',
    name: 'GI Earthing Strip 25x3mm',
    unit: 'mtr',
    unitPrice: 145,
    gstRate: 18,
    specifications: { earthing_type: 'gi_strip' },
  },
  {
    typeCode: 'accessories',
    code: 'ACC-LA-SPIKE',
    name: 'Lightning Arrester Spike',
    unit: 'pcs',
    unitPrice: 2200,
    gstRate: 18,
    specifications: {},
  },
  {
    typeCode: 'accessories',
    code: 'ACC-CABLE-TIE-UV',
    name: 'UV Cable Tie (pack of 100)',
    unit: 'pkt',
    unitPrice: 220,
    gstRate: 18,
    specifications: {},
  },
];

async function seed(dataSource: DataSource): Promise<void> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const [generic] = (await qr.query(
      `SELECT id FROM brands WHERE name = 'Generic' AND deleted_at IS NULL LIMIT 1`,
    )) as Array<{ id: string }>;

    if (!generic) {
      throw new Error(
        `No Generic brand found. Run 'npm run seed:master-data' first — it creates it.`,
      );
    }

    for (const t of TYPES) {
      await qr.query(
        `INSERT INTO product_types
           (name, code, default_unit_of_measure, default_pricing_basis,
            default_gst_rate, is_active, is_system, sort_order)
         VALUES ($1, $2, $3, 'per_unit', $4, true, false, $5)
         ON CONFLICT DO NOTHING`,
        [t.name, t.code, t.unit, t.gstRate, t.sortOrder],
      );

      const [row] = (await qr.query(
        `SELECT id FROM product_types WHERE code = $1 AND deleted_at IS NULL`,
        [t.code],
      )) as Array<{ id: string }>;
      if (!row) throw new Error(`product_type ${t.code} missing after insert`);
      const typeId = row.id;

      for (const [i, a] of t.attributes.entries()) {
        await qr.query(
          `INSERT INTO product_type_attributes
             (product_type_id, attribute_key, label, data_type, is_required,
              is_filterable, group_name, sort_order, is_system)
           VALUES ($1, $2, $3, $4, $5, false, 'core', $6, false)
           ON CONFLICT (product_type_id, attribute_key) DO NOTHING`,
          [typeId, a.key, a.label, a.dataType, a.required, i + 1],
        );
      }

      // Spec §4.2 H2: brand_id is NOT NULL, so every material product needs a
      // brand. Generic exists but was mapped to mounting_structure only.
      await qr.query(
        `INSERT INTO brand_product_types (brand_id, product_type_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [generic.id, typeId],
      );
    }

    for (const p of PRODUCTS) {
      const [type] = (await qr.query(
        `SELECT id FROM product_types WHERE code = $1 AND deleted_at IS NULL`,
        [p.typeCode],
      )) as Array<{ id: string }>;
      if (!type) throw new Error(`product_type ${p.typeCode} missing`);

      await qr.query(
        `INSERT INTO products
           (product_type_id, brand_id, name, code, specifications,
            unit_of_measure, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'active')
         ON CONFLICT DO NOTHING`,
        [type.id, generic.id, p.name, p.code, JSON.stringify(p.specifications), p.unit],
      );

      const [product] = (await qr.query(
        `SELECT id FROM products WHERE code = $1 AND deleted_at IS NULL`,
        [p.code],
      )) as Array<{ id: string }>;
      if (!product) throw new Error(`product ${p.code} missing after insert`);

      // project_type NULL = universal. One row per product, so Task 1's
      // uq_product_prices_active_from is never violated.
      await qr.query(
        `INSERT INTO product_prices
           (product_id, project_type, unit_price, cost_multiplier, gst_rate,
            currency, effective_from, is_active)
         SELECT $1, NULL, $2, 1.0, $3, 'INR', CURRENT_DATE, true
          WHERE NOT EXISTS (
            SELECT 1 FROM product_prices
             WHERE product_id = $1 AND project_type IS NULL AND is_active = true
          )`,
        [product.id, p.unitPrice, p.gstRate],
      );
    }

    await qr.commitTransaction();
    console.error(
      `Seeded ${TYPES.length} material product types and ${PRODUCTS.length} products.`,
    );
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

/**
 * Datasource wiring mirrors seed-inventory.ts exactly: `../datasource` only
 * exports the factory functions used to build TypeORM's config (they need a
 * ConfigService, which nothing here constructs); the ready-to-use singleton
 * seed scripts actually import is the default export of `../ormconfig`.
 */
async function seedBomMaterials(): Promise<void> {
  await dataSource.initialize();

  try {
    await seed(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

// Allow running directly: npx ts-node src/database/seeds/seed-bom-materials.ts
if (require.main === module) {
  seedBomMaterials()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('BOM materials seed failed:', error);
      process.exit(1);
    });
}

export { seedBomMaterials };
