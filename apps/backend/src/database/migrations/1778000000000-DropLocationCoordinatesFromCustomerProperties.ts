import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLocationCoordinatesFromCustomerProperties1778000000000
  implements MigrationInterface
{
  name = 'DropLocationCoordinatesFromCustomerProperties1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties DROP COLUMN IF EXISTS location_coordinates;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties ADD COLUMN IF NOT EXISTS location_coordinates POINT;
    `);
  }
}
