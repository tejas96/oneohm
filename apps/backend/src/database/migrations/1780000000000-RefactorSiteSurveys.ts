import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Refactor Site Surveys
 * - Drops individual assessment columns in favour of a single survey_data JSONB column
 * - Drops survey_date (redundant with created_at/updated_at) and photos (use documents)
 * - Adds partial unique index on project_id for 1:1 enforcement with soft-delete support
 */
export class RefactorSiteSurveys1780000000000 implements MigrationInterface {
  name = 'RefactorSiteSurveys1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop old index on survey_date (column being removed)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_surveys_date"`);

    // 2. Drop columns being removed
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "survey_date"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "photos"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "roof_type"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "roof_condition"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "roof_orientation"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "roof_tilt_angle"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "available_area_sqm"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "shading_analysis"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "electrical_details"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "structural_assessment"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "site_access"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "safety_concerns"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "recommendations"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "notes"`);

    // 3. Add new JSONB column for consolidated assessment data
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "survey_data" jsonb`);

    // 4. Add partial unique index for 1:1 enforcement (allows re-creation after soft delete)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_surveys_project" ON "site_surveys" ("project_id") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop unique index
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_surveys_project"`);

    // 2. Drop new column
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN "survey_data"`);

    // 3. Re-add old columns
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "survey_date" timestamp`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "photos" jsonb`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "roof_type" varchar(100)`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "roof_condition" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "roof_orientation" varchar(50)`);
    await queryRunner.query(
      `ALTER TABLE "site_surveys" ADD COLUMN "roof_tilt_angle" decimal(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_surveys" ADD COLUMN "available_area_sqm" decimal(10,2)`,
    );
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "shading_analysis" jsonb`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "electrical_details" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "site_surveys" ADD COLUMN "structural_assessment" text`,
    );
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "site_access" text`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "safety_concerns" text`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "recommendations" text`);
    await queryRunner.query(`ALTER TABLE "site_surveys" ADD COLUMN "notes" text`);

    // 4. Re-add old index
    await queryRunner.query(
      `CREATE INDEX "idx_surveys_date" ON "site_surveys" ("survey_date") WHERE "deleted_at" IS NULL`,
    );
  }
}
