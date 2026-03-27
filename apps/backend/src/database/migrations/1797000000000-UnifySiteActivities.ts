import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Unify Site Activities (Option B)
 *
 * - Renames site_visits -> site_activities
 * - Adds new columns for unified visit + survey tracking (no type column)
 * - Migrates site_surveys data INTO existing site_activity rows (UPDATE pattern)
 * - Migrates site_surveys.documents JSONB -> documents table (C1 fix)
 * - Preserves surveyCode in metadata (L1 fix)
 * - Drops site_surveys table
 */
export class UnifySiteActivities1797000000000 implements MigrationInterface {
  name = 'UnifySiteActivities1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename table
    await queryRunner.query(`ALTER TABLE "site_visits" RENAME TO "site_activities"`);

    // 2. Add new columns
    await queryRunner.query(`
      ALTER TABLE "site_activities"
        ADD COLUMN "overall_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN "organization_id" UUID,
        ADD COLUMN "is_site_visit_done" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "is_site_survey_done" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "completed_by" UUID,
        ADD COLUMN "completed_at" TIMESTAMPTZ,
        ADD COLUMN "survey_data" JSONB,
        ADD COLUMN "surveyor_id" UUID,
        ADD COLUMN "metadata" JSONB
    `);

    // 3. Rename columns
    await queryRunner.query(
      `ALTER TABLE "site_activities" RENAME COLUMN "visit_number" TO "activity_number"`,
    );
    await queryRunner.query(`ALTER TABLE "site_activities" RENAME COLUMN "visit_notes" TO "notes"`);

    // 4. Backfill organization_id from customer_properties
    await queryRunner.query(`
      UPDATE "site_activities" sa
      SET "organization_id" = cp."organization_id"
      FROM "customer_properties" cp
      WHERE sa."customer_property_id" = cp."id"
    `);

    // Make organization_id NOT NULL after backfill
    await queryRunner.query(
      `ALTER TABLE "site_activities" ALTER COLUMN "organization_id" SET NOT NULL`,
    );

    // 5. Backfill overall_status from existing status column
    await queryRunner.query(`UPDATE "site_activities" SET "overall_status" = "status"`);

    // 6. Backfill is_site_visit_done where status = 'completed'
    await queryRunner.query(
      `UPDATE "site_activities" SET "is_site_visit_done" = true WHERE "status" = 'completed'`,
    );

    // 7. Drop old status column (replaced by overall_status)
    await queryRunner.query(`ALTER TABLE "site_activities" DROP COLUMN "status"`);

    // 8. Migrate site_surveys data -- UPDATE existing visit rows
    // For surveys where a matching site_activity row exists (via project -> property)
    await queryRunner.query(`
      UPDATE "site_activities" sa
      SET
        "survey_data" = ss."survey_data",
        "surveyor_id" = ss."surveyor_id",
        "is_site_survey_done" = CASE WHEN ss."status" = 'completed' THEN true ELSE false END,
        "overall_status" = CASE
          WHEN ss."status" = 'completed' AND sa."is_site_visit_done" = true THEN 'completed'
          ELSE sa."overall_status"
        END,
        "metadata" = COALESCE(sa."metadata", '{}'::jsonb) || jsonb_build_object('survey_code', ss."survey_code")
      FROM "site_surveys" ss
      INNER JOIN "projects" p ON ss."project_id" = p."id"
      WHERE sa."customer_property_id" = p."property_id"
        AND p."property_id" IS NOT NULL
    `);

    // 9. For surveys with no matching visit row, INSERT new site_activity rows
    await queryRunner.query(`
      INSERT INTO "site_activities" (
        "customer_property_id", "activity_number", "overall_status",
        "organization_id", "is_site_visit_done", "is_site_survey_done",
        "survey_data", "surveyor_id", "metadata", "created_by", "updated_by"
      )
      SELECT
        p."property_id",
        'SA-MIG-' || ss."id"::text,
        CASE WHEN ss."status" = 'completed' THEN 'completed' ELSE 'in_progress' END,
        cp."organization_id",
        false,
        CASE WHEN ss."status" = 'completed' THEN true ELSE false END,
        ss."survey_data",
        ss."surveyor_id",
        jsonb_build_object('survey_code', ss."survey_code", 'migrated_from', 'site_surveys'),
        ss."created_by",
        ss."updated_by"
      FROM "site_surveys" ss
      INNER JOIN "projects" p ON ss."project_id" = p."id"
      INNER JOIN "customer_properties" cp ON p."property_id" = cp."id"
      WHERE p."property_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "site_activities" sa
          WHERE sa."customer_property_id" = p."property_id"
            AND sa."deleted_at" IS NULL
        )
    `);

    // 10. Migrate site_surveys.documents JSONB -> documents table (C1 fix)
    // Uses only columns that exist on the documents table at this point in the migration sequence.
    // The new columns (entity_type, entity_id, category, tag, file_url) are added by migration 1798,
    // so we use the old schema columns here. Migration 1798 will backfill the new columns from these.
    const hasSurveyDocumentsCol = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'site_surveys' AND column_name = 'documents'
    `);

    if (hasSurveyDocumentsCol.length > 0) {
      await queryRunner.query(`
        INSERT INTO "documents" (
          "organization_id", "document_number", "document_name",
          "document_type", "file_path", "file_name",
          "metadata", "created_by"
        )
        SELECT
          sa."organization_id",
          'SMIG-' || gen_random_uuid()::text,
          COALESCE(doc->>'fileName', 'survey-document'),
          COALESCE(doc->>'tag', 'other'),
          COALESCE(doc->>'url', ''),
          COALESCE(doc->>'fileName', 'survey-document'),
          jsonb_build_object(
            'migrated_from', 'site_surveys',
            'site_activity_id', sa."id"::text,
            'original_tag', doc->>'tag'
          ),
          ss."created_by"
        FROM "site_surveys" ss
        INNER JOIN "projects" p ON ss."project_id" = p."id"
        INNER JOIN "site_activities" sa ON sa."customer_property_id" = p."property_id"
        CROSS JOIN LATERAL jsonb_array_elements(ss."documents") AS doc
        WHERE ss."documents" IS NOT NULL
          AND jsonb_array_length(ss."documents") > 0
          AND p."property_id" IS NOT NULL
          AND sa."deleted_at" IS NULL
      `);
    }

    // 11. Drop site_surveys table
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_site_surveys_updated_at ON "site_surveys"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_surveys_project"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_surveys"`);

    // 12. Update indexes
    // Rename old indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_site_visits_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_site_visits_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_site_visits_created_by"`);

    // Rename unique indexes
    // idx_site_visits_property -> idx_site_activities_property
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_site_visits_property" RENAME TO "idx_site_activities_property"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_site_visits_number" RENAME TO "idx_site_activities_number"`,
    );

    // Add new indexes
    await queryRunner.query(`
      CREATE INDEX "idx_site_activities_org" ON "site_activities" ("organization_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_site_activities_status" ON "site_activities" ("overall_status") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_site_activities_created_at" ON "site_activities" ("created_at" DESC)
    `);

    // 13. Rename trigger
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "update_site_visits_updated_at" ON "site_activities"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER "update_site_activities_updated_at"
      BEFORE UPDATE ON "site_activities"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);

    // 14. Add FK for organization_id and surveyor_id
    await queryRunner.query(`
      ALTER TABLE "site_activities"
        ADD CONSTRAINT "FK_site_activities_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_site_activities_surveyor" FOREIGN KEY ("surveyor_id") REFERENCES "users"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_site_activities_completed_by" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs
    await queryRunner.query(
      `ALTER TABLE "site_activities" DROP CONSTRAINT IF EXISTS "FK_site_activities_completed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_activities" DROP CONSTRAINT IF EXISTS "FK_site_activities_surveyor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_activities" DROP CONSTRAINT IF EXISTS "FK_site_activities_organization"`,
    );

    // Drop trigger
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "update_site_activities_updated_at" ON "site_activities"`,
    );

    // Drop new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_site_activities_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_site_activities_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_site_activities_org"`);

    // Rename indexes back
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_site_activities_property" RENAME TO "idx_site_visits_property"`,
    );
    await queryRunner.query(
      `ALTER INDEX IF EXISTS "idx_site_activities_number" RENAME TO "idx_site_visits_number"`,
    );

    // Re-create old indexes
    await queryRunner.query(
      `CREATE INDEX "idx_site_visits_status" ON "site_activities" ("overall_status") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_site_visits_created_at" ON "site_activities" ("created_at" DESC)`,
    );

    // Add back status column
    await queryRunner.query(
      `ALTER TABLE "site_activities" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(`UPDATE "site_activities" SET "status" = "overall_status"`);

    // Rename columns back
    await queryRunner.query(
      `ALTER TABLE "site_activities" RENAME COLUMN "activity_number" TO "visit_number"`,
    );
    await queryRunner.query(`ALTER TABLE "site_activities" RENAME COLUMN "notes" TO "visit_notes"`);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE "site_activities"
        DROP COLUMN IF EXISTS "overall_status",
        DROP COLUMN IF EXISTS "organization_id",
        DROP COLUMN IF EXISTS "is_site_visit_done",
        DROP COLUMN IF EXISTS "is_site_survey_done",
        DROP COLUMN IF EXISTS "completed_by",
        DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "survey_data",
        DROP COLUMN IF EXISTS "surveyor_id",
        DROP COLUMN IF EXISTS "metadata"
    `);

    // Rename table back
    await queryRunner.query(`ALTER TABLE "site_activities" RENAME TO "site_visits"`);

    // Re-create trigger
    await queryRunner.query(`
      CREATE TRIGGER "update_site_visits_updated_at"
      BEFORE UPDATE ON "site_visits"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);

    // NOTE: site_surveys table and its data cannot be fully restored from this down migration.
    // This migration is not fully reversible for the survey data.
  }
}
