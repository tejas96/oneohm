import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Drop roof_area_sqft from customer_properties
 * This field is redundant — available_roof_area_sqft on site_visits is the authoritative measurement.
 */
export class DropPropertyRoofAreaColumn1784000000000 implements MigrationInterface {
  name = 'DropPropertyRoofAreaColumn1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_properties" DROP COLUMN IF EXISTS "roof_area_sqft"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_properties" ADD COLUMN "roof_area_sqft" decimal(10,2)`,
    );
  }
}
