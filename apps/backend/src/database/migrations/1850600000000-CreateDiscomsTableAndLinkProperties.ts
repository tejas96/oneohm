import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateDiscomsTableAndLinkProperties1850600000000 implements MigrationInterface {
  name = 'CreateDiscomsTableAndLinkProperties1850600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE discoms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_name VARCHAR(255) NOT NULL,
        circle_incharge_name VARCHAR(255) NOT NULL,
        division_name VARCHAR(255) NOT NULL,
        division_incharge_name VARCHAR(255) NOT NULL,
        testing_unit_name VARCHAR(255),
        subdivision_name VARCHAR(255),
        subdivision_incharge_name VARCHAR(255),
        aeqc_engineer_name VARCHAR(255),
        section_name VARCHAR(255),
        section_engineer_name VARCHAR(255),
        office_address TEXT,
        mobile_no VARCHAR(20),
        email VARCHAR(255),
        geo_location JSONB,
        is_active BOOLEAN NOT NULL DEFAULT true,
        deleted_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_discoms_hierarchy_unique
      ON discoms (circle_name, division_name, COALESCE(subdivision_name, ''), COALESCE(section_name, ''))
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_discoms_circle_name ON discoms (circle_name) WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_discoms_division_name ON discoms (division_name) WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_discoms_section_name ON discoms (section_name) WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO discoms (
        circle_name,
        circle_incharge_name,
        division_name,
        division_incharge_name
      ) VALUES (
        'Sangli',
        'Amit Bokil',
        'Sangli Urban',
        'Ashish Mehta'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN discom_id UUID REFERENCES discoms(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_discom_id
      ON customer_properties (discom_id)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE customer_properties DROP COLUMN IF EXISTS discom_name
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN discom_name VARCHAR(100)
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_properties_discom_id
    `);

    await queryRunner.query(`
      ALTER TABLE customer_properties DROP COLUMN IF EXISTS discom_id
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoms_section_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoms_division_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoms_circle_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoms_hierarchy_unique`);
    await queryRunner.query(`DROP TABLE IF EXISTS discoms`);
  }
}
