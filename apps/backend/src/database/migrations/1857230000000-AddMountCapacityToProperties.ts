import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rooftop and ground-mount kW for a site, set at the site visit or survey on
 * the mobile app. Annexure-I prints them, and its capacity type is worked out
 * from which of the two is set. Both start empty: no site has a split yet.
 */
export class AddMountCapacityToProperties1857230000000 implements MigrationInterface {
  name = 'AddMountCapacityToProperties1857230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_properties"
         ADD COLUMN "rooftop_capacity_kw" numeric(10,2),
         ADD COLUMN "ground_capacity_kw" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_properties"
         DROP COLUMN "ground_capacity_kw",
         DROP COLUMN "rooftop_capacity_kw"`,
    );
  }
}
