import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Drop Features Table
 * The features table is redundant — permission codes already encode the module context.
 * This migration safely removes the FK constraint first to avoid cascade-deleting permissions.
 */
export class DropFeaturesTable1781000000000 implements MigrationInterface {
  name = 'DropFeaturesTable1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "fk_permissions_feature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "FK_permissions_feature_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "FK_5a2bbc5e1e43e57ffe5cc1ec97d"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_permissions_feature_id_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permissions_feature_active"`);

    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN IF EXISTS "feature_id"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "features" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "features" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "parent_feature_id" uuid,
        "name" varchar(255) NOT NULL,
        "code" varchar(100) NOT NULL,
        "description" text,
        "icon" varchar(50),
        "display_order" integer NOT NULL DEFAULT 0,
        "feature_type" varchar(50) NOT NULL DEFAULT 'module',
        "requires_license" boolean NOT NULL DEFAULT false,
        "license_tier" varchar(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system_feature" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_features" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_features_code" UNIQUE ("code"),
        CONSTRAINT "UQ_features_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`ALTER TABLE "permissions" ADD COLUMN "feature_id" uuid`);

    await queryRunner.query(`
      ALTER TABLE "permissions"
      ADD CONSTRAINT "fk_permissions_feature"
      FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE
    `);
  }
}
