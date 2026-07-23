import { normalizeStructureTypeCode } from '@tejas96/shared/utils';
import { MigrationInterface, QueryRunner } from 'typeorm';

interface DuplicateStructureProductRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  structure_type: string;
  rn: string;
}

export class StructureTypeStringAndUniqueIndex1850400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Convert structure_type attribute from enum to string FIRST so the
    // validate_product_specifications trigger no longer blocks custom/new codes
    // during the normalization updates below.
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

    // Step 2: Normalize existing structure_type values on mounting structure products
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

    // Step 2c: Strip leading/trailing underscores (matches normalizeStructureTypeCode)
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

    // Step 2d: Resolve duplicate active structure_type values automatically.
    // Keep the oldest product (created_at, then code) on the canonical type; derive
    // unique codes for siblings from product code/name (e.g. elevated_6x9_with_metalsheet).
    await this.resolveDuplicateActiveStructureTypes(queryRunner);

    // Step 3: Final audit — should be empty after auto-resolution.
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
        `Cannot migrate: active mounting structure products still share duplicate structure_type values after auto-resolution. ` +
          `Resolve manually before re-running migration: ${details}`,
      );
    }

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

  private async resolveDuplicateActiveStructureTypes(queryRunner: QueryRunner): Promise<void> {
    const MAX_ATTEMPTS = 20;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const duplicateRows = (await queryRunner.query(`
        SELECT
          p.id,
          p.organization_id,
          p.code,
          p.name,
          p.specifications->>'structure_type' AS structure_type,
          ROW_NUMBER() OVER (
            PARTITION BY p.organization_id, p.product_type_id, p.specifications->>'structure_type'
            ORDER BY p.created_at ASC, p.code ASC
          ) AS rn
        FROM products p
        INNER JOIN product_types pt ON pt.id = p.product_type_id
        WHERE pt.code = 'mounting_structure'
          AND p.status = 'active'
          AND p.deleted_at IS NULL
          AND p.specifications->>'structure_type' IS NOT NULL
          AND trim(p.specifications->>'structure_type') <> ''
      `)) as DuplicateStructureProductRow[];

      const toReassign = duplicateRows.filter((row) => Number(row.rn) > 1);
      if (toReassign.length === 0) {
        return;
      }

      for (const row of toReassign) {
        const baseType = row.structure_type;
        const candidate = await this.pickUniqueStructureType(
          queryRunner,
          row.organization_id,
          row,
          baseType,
        );
        await queryRunner.query(
          `
            UPDATE products
            SET
              specifications = jsonb_set(specifications, '{structure_type}', to_jsonb($2::text)),
              updated_at = NOW()
            WHERE id = $1
          `,
          [row.id, candidate],
        );
        console.warn(
          `[migration] Resolved duplicate structure_type for ${row.code}: ${baseType} -> ${candidate}`,
        );
      }
    }

    throw new Error('Failed to resolve duplicate mounting structure types after maximum attempts');
  }

  private async pickUniqueStructureType(
    queryRunner: QueryRunner,
    organizationId: string,
    row: DuplicateStructureProductRow,
    baseType: string,
  ): Promise<string> {
    const codeSuffix = row.code.replace(/^STRUCT-/i, '');
    // Prefer human-readable product name over internal product code for the new type.
    const seedCandidates = [
      normalizeStructureTypeCode(row.name),
      normalizeStructureTypeCode(`${baseType}_${row.name}`),
      normalizeStructureTypeCode(codeSuffix),
      normalizeStructureTypeCode(`${baseType}_${codeSuffix}`),
      normalizeStructureTypeCode(row.code),
    ].filter((value): value is string => Boolean(value && value !== baseType));

    for (const candidate of seedCandidates) {
      if (!(await this.activeStructureTypeExists(queryRunner, organizationId, row.id, candidate))) {
        return candidate;
      }
    }

    for (let suffix = 2; suffix <= 50; suffix++) {
      const candidate = `${baseType}_${suffix}`;
      if (!(await this.activeStructureTypeExists(queryRunner, organizationId, row.id, candidate))) {
        return candidate;
      }
    }

    throw new Error(`Unable to derive unique structure_type for product ${row.code} (${row.id})`);
  }

  private async activeStructureTypeExists(
    queryRunner: QueryRunner,
    organizationId: string,
    productId: string,
    structureType: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `
        SELECT 1
        FROM products p
        INNER JOIN product_types pt ON pt.id = p.product_type_id
        WHERE pt.code = 'mounting_structure'
          AND p.organization_id = $1
          AND p.id <> $2
          AND p.status = 'active'
          AND p.deleted_at IS NULL
          AND p.specifications->>'structure_type' = $3
        LIMIT 1
      `,
      [organizationId, productId, structureType],
    )) as unknown[];

    return rows.length > 0;
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
