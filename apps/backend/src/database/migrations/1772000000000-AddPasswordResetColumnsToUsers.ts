import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add password reset columns to users table
 * Adds passwordResetToken and passwordResetExpires for forgot password functionality
 */
export class AddPasswordResetColumnsToUsers1772000000000 implements MigrationInterface {
  name = 'AddPasswordResetColumnsToUsers1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "password_reset_token" VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP WITH TIME ZONE NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_password_reset_token" 
      ON "users" ("password_reset_token") 
      WHERE "password_reset_token" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_password_reset_token"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password_reset_expires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password_reset_token"`);
  }
}
