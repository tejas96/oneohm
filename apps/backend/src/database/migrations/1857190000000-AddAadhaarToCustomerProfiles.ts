import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional 12-digit Aadhaar, printed on the WCR. Never shown in a list. */
export class AddAadhaarToCustomerProfiles1857190000000 implements MigrationInterface {
  name = 'AddAadhaarToCustomerProfiles1857190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS aadhaar_number varchar(12) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE customer_profiles DROP COLUMN IF EXISTS aadhaar_number`);
  }
}
