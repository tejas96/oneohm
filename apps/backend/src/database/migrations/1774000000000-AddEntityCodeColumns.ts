import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add human-readable code columns to entities
 *
 * Adds:
 * - customer_code to customer_profiles
 * - property_code to customer_properties
 * - milestone_code to project_milestones
 * - survey_code to site_surveys
 * - default_milestone_type to task_templates
 */
export class AddEntityCodeColumns1774000000000 implements MigrationInterface {
  name = 'AddEntityCodeColumns1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // customer_profiles.customer_code
    await queryRunner.query(`
      ALTER TABLE "customer_profiles"
      ADD COLUMN IF NOT EXISTS "customer_code" varchar(50) UNIQUE
    `);

    // customer_properties.property_code
    await queryRunner.query(`
      ALTER TABLE "customer_properties"
      ADD COLUMN IF NOT EXISTS "property_code" varchar(50) UNIQUE
    `);

    // project_milestones.milestone_code
    await queryRunner.query(`
      ALTER TABLE "project_milestones"
      ADD COLUMN IF NOT EXISTS "milestone_code" varchar(50) UNIQUE
    `);

    // site_surveys.survey_code
    await queryRunner.query(`
      ALTER TABLE "site_surveys"
      ADD COLUMN IF NOT EXISTS "survey_code" varchar(50) UNIQUE
    `);

    // task_templates.default_milestone_type
    await queryRunner.query(`
      ALTER TABLE "task_templates"
      ADD COLUMN IF NOT EXISTS "default_milestone_type" varchar(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_templates" DROP COLUMN IF EXISTS "default_milestone_type"`);
    await queryRunner.query(`ALTER TABLE "site_surveys" DROP COLUMN IF EXISTS "survey_code"`);
    await queryRunner.query(`ALTER TABLE "project_milestones" DROP COLUMN IF EXISTS "milestone_code"`);
    await queryRunner.query(`ALTER TABLE "customer_properties" DROP COLUMN IF EXISTS "property_code"`);
    await queryRunner.query(`ALTER TABLE "customer_profiles" DROP COLUMN IF EXISTS "customer_code"`);
  }
}
