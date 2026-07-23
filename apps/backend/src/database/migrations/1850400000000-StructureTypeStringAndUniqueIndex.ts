import { MigrationInterface, QueryRunner } from 'typeorm';

export class StructureTypeStringAndUniqueIndex1850400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Normalize existing structure_type values on mounting structure products
    await queryRunner.query(`
      UPDATE products p
      SET specifications = jsonb_set(
        specifications,
        '{structure_type}',
        to_jsonb(
          regexp_replace(
            regexp_replace(
              lower(trim(specifications->>'structure_type')),
              '[\\s-]+',
              '_',
              'g'
            ),
            '[^a-z0-9_]',
            '',
            'g'
          )
        )
      ),
      updated_at = NOW()
      FROM product_types pt
      WHERE p.product_type_id = pt.id
        AND pt.code = 'mounting_structure'
        AND p.deleted_at IS NULL
        AND p.specifications->>'structure_type' IS NOT NULL
        AND trim(p.specifications->>'structure_type') <> '';
    `);

    await queryRunner.query(`
      UPDATE products p
      SET specifications = jsonb_set(
        specifications,
        '{structure_type}',
        to_jsonb(
          regexp_replace(
            specifications->>'structure_type',
            '_+',
            '_',
            'g'
          )
        )
      ),
      updated_at = NOW()
      FROM product_types pt
      WHERE p.product_type_id = pt.id
        AND pt.code = 'mounting_structure'
        AND p.deleted_at IS NULL
        AND p.specifications->>'structure_type' IS NOT NULL
        AND trim(p.specifications->>'structure_type') <> '';
    `);

    // Step 1c: Strip leading/trailing underscores (matches normalizeStructureTypeCode)
    await queryRunner.query(`
      UPDATE products p
      SET specifications = jsonb_set(
        specifications,
        '{structure_type}',
        to_jsonb(
          regexp_replace(
            specifications->>'structure_type',
            '^_+|_+$',
            '',
            'g'
          )
        )
      ),
      updated_at = NOW()
      FROM product_types pt
      WHERE p.product_type_id = pt.id
        AND pt.code = 'mounting_structure'
        AND p.deleted_at IS NULL
        AND p.specifications->>'structure_type' IS NOT NULL
        AND trim(p.specifications->>'structure_type') <> '';
    `);

    // Step 2: Audit active duplicates before creating unique index
    const duplicates = (await queryRunner.query(`
      SELECT
        p.organization_id,
        p.product_type_id,
        p.specifications->>'structure_type' AS structure_type,
        array_agg(p.code ORDER BY p.code) AS product_codes
      FROM products p
      INNER JOIN product_types pt ON pt.id = p.product_type_id
      WHERE pt.code = 'mounting_structure'
        AND p.status = 'active'
        AND p.deleted_at IS NULL
        AND p.specifications->>'structure_type' IS NOT NULL
        AND trim(p.specifications->>'structure_type') <> ''
      GROUP BY p.organization_id, p.product_type_id, p.specifications->>'structure_type'
      HAVING COUNT(*) > 1;
    `)) as Array<{
      organization_id: string;
      structure_type: string;
      product_codes: string[];
    }>;

    if (duplicates.length > 0) {
      const details = duplicates
        .map(
          (row) =>
            `structure_type='${row.structure_type}' products=[${row.product_codes.join(', ')}]`,
        )
        .join('; ');
      throw new Error(
        `Cannot migrate: active mounting structure products share duplicate structure_type values. ` +
          `Resolve manually before re-running migration: ${details}`,
      );
    }

    // Step 3: Convert structure_type attribute from enum to string
    await queryRunner.query(`
      UPDATE product_type_attributes pta
      SET
        data_type = 'string',
        validation = COALESCE(validation, '{}'::jsonb) - 'options' - 'values',
        updated_at = NOW()
      FROM product_types pt
      WHERE pta.product_type_id = pt.id
        AND pt.code = 'mounting_structure'
        AND pta.attribute_key = 'structure_type';
    `);

    // Step 4: Partial unique index for active products with structure_type.
    // Scoped by product_type_id in the index columns — only mounting_structure
    // products carry structure_type in practice. PG does not allow subqueries in
    // partial index predicates, so we cannot filter by product_types.code here.
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_products_unique_active_structure_type
      ON products (organization_id, product_type_id, (specifications->>'structure_type'))
      WHERE status = 'active'
        AND deleted_at IS NULL
        AND specifications->>'structure_type' IS NOT NULL
        AND specifications->>'structure_type' <> '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_products_unique_active_structure_type;
    `);

    await queryRunner.query(`
      UPDATE product_type_attributes pta
      SET
        data_type = 'enum',
        validation = jsonb_build_object(
          'options',
          jsonb_build_array(
            'aluminum_rail',
            'rcc_3x6',
            'elevated_6x9',
            'super_elevated',
            'ground_mount'
          )
        ),
        updated_at = NOW()
      FROM product_types pt
      WHERE pta.product_type_id = pt.id
        AND pt.code = 'mounting_structure'
        AND pta.attribute_key = 'structure_type';
    `);
  }
}
