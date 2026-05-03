import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSerializedFieldsToBomItems1826000000000 implements MigrationInterface {
  name = 'AddSerializedFieldsToBomItems1826000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bom_items
      ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS group_key VARCHAR(64),
      ADD COLUMN IF NOT EXISTS unit_index INTEGER
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bom_items_group_key
      ON bom_items(bom_id, group_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bom_items_serial_number
      ON bom_items(serial_number)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_bom_items_bom_serial
      ON bom_items(bom_id, serial_number)
      WHERE serial_number IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_bom_items_bom_serial`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bom_items_serial_number`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bom_items_group_key`);

    await queryRunner.query(`
      ALTER TABLE bom_items
      DROP COLUMN IF EXISTS unit_index,
      DROP COLUMN IF EXISTS group_key,
      DROP COLUMN IF EXISTS serial_number
    `);
  }
}
