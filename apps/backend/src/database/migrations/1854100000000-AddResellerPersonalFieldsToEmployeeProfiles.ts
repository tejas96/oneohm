import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Add optional reseller personal-detail columns to employee_profiles:
 * aadhaar_number, current_profession, years_of_experience.
 */
export class AddResellerPersonalFieldsToEmployeeProfiles1854100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE employee_profiles
      ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12),
      ADD COLUMN IF NOT EXISTS current_profession VARCHAR(100),
      ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_profiles_aadhaar_number
      ON employee_profiles(aadhaar_number)
      WHERE aadhaar_number IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employee_profiles_aadhaar_number;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_profiles
      DROP COLUMN IF EXISTS years_of_experience,
      DROP COLUMN IF EXISTS current_profession,
      DROP COLUMN IF EXISTS aadhaar_number;
    `);
  }
}
