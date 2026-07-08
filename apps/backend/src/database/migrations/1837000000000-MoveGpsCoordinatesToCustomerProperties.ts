import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveGpsCoordinatesToCustomerProperties1837000000000 implements MigrationInterface {
  name = 'MoveGpsCoordinatesToCustomerProperties1837000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN IF NOT EXISTS gps_coordinates JSONB;
    `);

    await queryRunner.query(`
      UPDATE customer_properties cp
      SET gps_coordinates = sa.gps_coordinates
      FROM site_activities sa
      WHERE sa.customer_property_id = cp.id
        AND sa.gps_coordinates IS NOT NULL
        AND cp.gps_coordinates IS NULL
        AND sa.deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE site_activities
      DROP COLUMN IF EXISTS gps_coordinates;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE site_activities
      ADD COLUMN IF NOT EXISTS gps_coordinates JSONB;
    `);

    await queryRunner.query(`
      UPDATE site_activities sa
      SET gps_coordinates = cp.gps_coordinates
      FROM customer_properties cp
      WHERE sa.customer_property_id = cp.id
        AND cp.gps_coordinates IS NOT NULL
        AND sa.gps_coordinates IS NULL
        AND sa.deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE customer_properties
      DROP COLUMN IF EXISTS gps_coordinates;
    `);
  }
}
