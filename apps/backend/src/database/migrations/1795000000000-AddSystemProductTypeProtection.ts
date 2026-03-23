import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemProductTypeProtection1795000000000 implements MigrationInterface {
  name = 'AddSystemProductTypeProtection1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add is_system columns
    await queryRunner.query(
      `ALTER TABLE product_types ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE product_type_attributes ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false`,
    );

    // 2. DB trigger: protect system product types
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION protect_system_product_types()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.is_system = true THEN
            RAISE EXCEPTION 'Cannot delete system product type (code: %)', OLD.code;
          END IF;
          RETURN OLD;
        END IF;

        IF TG_OP = 'UPDATE' AND OLD.is_system = true THEN
          IF NEW.code != OLD.code THEN
            RAISE EXCEPTION 'Cannot change code of system product type (code: %)', OLD.code;
          END IF;
          IF NEW.is_active = false THEN
            RAISE EXCEPTION 'Cannot deactivate system product type (code: %)', OLD.code;
          END IF;
          IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            RAISE EXCEPTION 'Cannot soft-delete system product type (code: %)', OLD.code;
          END IF;
          IF NEW.is_system = false THEN
            RAISE EXCEPTION 'Cannot remove system flag from product type (code: %)', OLD.code;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_protect_system_product_types
        BEFORE UPDATE OR DELETE ON product_types
        FOR EACH ROW EXECUTE FUNCTION protect_system_product_types();
    `);

    // 3. DB trigger: protect system product type attributes
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION protect_system_product_type_attributes()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.is_system = true THEN
            RAISE EXCEPTION 'Cannot delete system product type attribute (key: %)', OLD.attribute_key;
          END IF;
          RETURN OLD;
        END IF;

        IF TG_OP = 'UPDATE' AND OLD.is_system = true THEN
          IF NEW.attribute_key != OLD.attribute_key THEN
            RAISE EXCEPTION 'Cannot change key of system attribute (key: %)', OLD.attribute_key;
          END IF;
          IF NEW.is_system = false THEN
            RAISE EXCEPTION 'Cannot remove system flag from attribute (key: %)', OLD.attribute_key;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_protect_system_product_type_attributes
        BEFORE UPDATE OR DELETE ON product_type_attributes
        FOR EACH ROW EXECUTE FUNCTION protect_system_product_type_attributes();
    `);

    // 4. Seed system product types for ALL existing organizations
    const orgs: { id: string }[] = await queryRunner.query(
      `SELECT id FROM organizations WHERE deleted_at IS NULL`,
    );

    for (const org of orgs) {
      await this.seedSystemTypesForOrg(queryRunner, org.id);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_protect_system_product_type_attributes ON product_type_attributes`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS protect_system_product_type_attributes()`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_protect_system_product_types ON product_types`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS protect_system_product_types()`);

    await queryRunner.query(
      `UPDATE product_type_attributes SET is_system = false WHERE is_system = true`,
    );
    await queryRunner.query(`UPDATE product_types SET is_system = false WHERE is_system = true`);

    await queryRunner.query(`ALTER TABLE product_type_attributes DROP COLUMN IF EXISTS is_system`);
    await queryRunner.query(`ALTER TABLE product_types DROP COLUMN IF EXISTS is_system`);
  }

  private async seedSystemTypesForOrg(
    queryRunner: QueryRunner,
    organizationId: string,
  ): Promise<void> {
    const systemTypes = [
      {
        code: 'solar_panel',
        name: 'Solar Panel',
        defaultPricingBasis: 'per_watt',
        defaultGstRate: 12,
        defaultUnitOfMeasure: 'pcs',
        sortOrder: 1,
        attributes: [
          {
            key: 'wattage',
            label: 'Wattage (Wp)',
            dataType: 'decimal',
            isRequired: true,
            isFilterable: true,
            group: 'core',
            sort: 1,
            validation: null,
          },
          {
            key: 'technology',
            label: 'Technology',
            dataType: 'enum',
            isRequired: true,
            isFilterable: true,
            group: 'core',
            sort: 2,
            validation: JSON.stringify({
              options: ['perc', 'topcon', 'mono_perc', 'poly', 'bifacial'],
            }),
          },
          {
            key: 'is_dcr',
            label: 'DCR Approved',
            dataType: 'boolean',
            isRequired: true,
            isFilterable: true,
            group: 'core',
            sort: 3,
            validation: null,
          },
          {
            key: 'min_wattage',
            label: 'Min Wattage (Wp)',
            dataType: 'decimal',
            isRequired: false,
            isFilterable: false,
            group: 'core',
            sort: 4,
            validation: null,
          },
          {
            key: 'max_wattage',
            label: 'Max Wattage (Wp)',
            dataType: 'decimal',
            isRequired: false,
            isFilterable: false,
            group: 'core',
            sort: 5,
            validation: null,
          },
        ],
      },
      {
        code: 'inverter',
        name: 'Inverter',
        defaultPricingBasis: 'per_unit',
        defaultGstRate: 12,
        defaultUnitOfMeasure: 'pcs',
        sortOrder: 2,
        attributes: [
          {
            key: 'capacity_kw',
            label: 'Capacity (kW)',
            dataType: 'decimal',
            isRequired: true,
            isFilterable: true,
            group: 'core',
            sort: 1,
            validation: null,
          },
          {
            key: 'phase_type',
            label: 'Phase Type',
            dataType: 'enum',
            isRequired: true,
            isFilterable: true,
            group: 'core',
            sort: 2,
            validation: JSON.stringify({ options: ['single_phase', 'three_phase'] }),
          },
        ],
      },
      {
        code: 'mounting_structure',
        name: 'Mounting Structure',
        defaultPricingBasis: 'per_kw',
        defaultGstRate: 18,
        defaultUnitOfMeasure: 'pcs',
        sortOrder: 3,
        attributes: [
          {
            key: 'structure_type',
            label: 'Structure Type',
            dataType: 'enum',
            isRequired: true,
            isFilterable: true,
            group: 'core',
            sort: 1,
            validation: JSON.stringify({
              options: [
                'aluminum_rail',
                'rcc_3x6',
                'elevated_6x9',
                'super_elevated',
                'ground_mount',
              ],
            }),
          },
        ],
      },
    ];

    for (const typeDef of systemTypes) {
      const result: { id: string }[] = await queryRunner.query(
        `INSERT INTO product_types (organization_id, name, code, default_pricing_basis, default_gst_rate, default_unit_of_measure, is_active, sort_order, is_system, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, TRUE, NOW(), NOW())
         ON CONFLICT (organization_id, code) DO UPDATE SET is_system = TRUE
         RETURNING id`,
        [
          organizationId,
          typeDef.name,
          typeDef.code,
          typeDef.defaultPricingBasis,
          typeDef.defaultGstRate,
          typeDef.defaultUnitOfMeasure,
          typeDef.sortOrder,
        ],
      );

      const productTypeId = result[0]!.id;

      for (const attr of typeDef.attributes) {
        await queryRunner.query(
          `INSERT INTO product_type_attributes (product_type_id, attribute_key, label, data_type, is_required, is_filterable, group_name, sort_order, is_system, validation, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9::jsonb, NOW(), NOW())
           ON CONFLICT (product_type_id, attribute_key) DO UPDATE SET is_system = TRUE`,
          [
            productTypeId,
            attr.key,
            attr.label,
            attr.dataType,
            attr.isRequired,
            attr.isFilterable,
            attr.group,
            attr.sort,
            attr.validation,
          ],
        );
      }
    }
  }
}
