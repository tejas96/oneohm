import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Add partial unique constraints on customer_profiles for
 * (organization_id, LOWER(email)) and (organization_id, phone)
 * where deleted_at IS NULL.
 *
 * Also normalizes existing data: emails → lowercase, phones → E.164 (+91 prefix).
 */
export class AddCustomerProfileUniqueConstraints1788000000000 implements MigrationInterface {
  name = 'AddCustomerProfileUniqueConstraints1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Normalize existing emails to lowercase in customer_profiles
    await queryRunner.query(`
      UPDATE customer_profiles SET email = LOWER(email) WHERE email IS NOT NULL AND email <> LOWER(email)
    `);

    // Step 2: Normalize existing emails to lowercase in users table
    await queryRunner.query(`
      UPDATE users SET email = LOWER(email) WHERE email IS NOT NULL AND email <> LOWER(email)
    `);

    // Step 3: Normalize phones — strip spaces/dashes, ensure +91 prefix
    // Handle 10-digit numbers (no country code)
    await queryRunner.query(`
      UPDATE customer_profiles
      SET phone = '+91' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      WHERE phone IS NOT NULL
        AND phone <> ''
        AND phone NOT LIKE '+91%'
        AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10
    `);

    // Handle 12-digit numbers starting with 91 (missing + prefix)
    await queryRunner.query(`
      UPDATE customer_profiles
      SET phone = '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      WHERE phone IS NOT NULL
        AND phone <> ''
        AND phone NOT LIKE '+%'
        AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 12
        AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '91%'
    `);

    // users table — 10-digit numbers
    await queryRunner.query(`
      UPDATE users
      SET phone = '+91' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      WHERE phone IS NOT NULL
        AND phone <> ''
        AND phone NOT LIKE '+91%'
        AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10
    `);

    // users table — 12-digit numbers starting with 91
    await queryRunner.query(`
      UPDATE users
      SET phone = '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      WHERE phone IS NOT NULL
        AND phone <> ''
        AND phone NOT LIKE '+%'
        AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 12
        AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '91%'
    `);

    // Step 4: Add partial unique index on (organization_id, LOWER(email)) for active records
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_customer_profiles_org_email"
      ON "customer_profiles" ("organization_id", (LOWER("email")))
      WHERE "deleted_at" IS NULL AND "email" IS NOT NULL
    `);

    // Step 5: Add partial unique index on (organization_id, phone) for active records
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_customer_profiles_org_phone"
      ON "customer_profiles" ("organization_id", "phone")
      WHERE "deleted_at" IS NULL AND "phone" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_customer_profiles_org_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_customer_profiles_org_email"`);
  }
}
