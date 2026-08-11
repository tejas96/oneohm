import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Enforce Aadhaar only on reseller profiles and scope uniqueness to active reseller rows.
 */
export class RestrictAadhaarToResellerProfiles1854100000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employee_profiles_aadhaar_number;
    `);

    await queryRunner.query(`
      UPDATE employee_profiles
      SET aadhaar_number = NULL
      WHERE aadhaar_number IS NOT NULL AND profile_kind != 'reseller';
    `);

    await queryRunner.query(`
      ALTER TABLE employee_profiles
      ADD CONSTRAINT chk_employee_profiles_aadhaar_reseller_only
      CHECK (aadhaar_number IS NULL OR profile_kind = 'reseller');
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_employee_profiles_aadhaar_number
      ON employee_profiles(aadhaar_number)
      WHERE aadhaar_number IS NOT NULL
        AND profile_kind = 'reseller'
        AND deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employee_profiles_aadhaar_number;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_profiles
      DROP CONSTRAINT IF EXISTS chk_employee_profiles_aadhaar_reseller_only;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_employee_profiles_aadhaar_number
      ON employee_profiles(aadhaar_number)
      WHERE aadhaar_number IS NOT NULL;
    `);
  }
}
