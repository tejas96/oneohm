import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Migrate JSONB Documents
 *
 * - Migrates customer_properties.documents JSONB -> documents table
 *   (entity_type='property', entity_id=property.id, NO property_id column -- NEW-3 fix)
 * - Migrates site_activities.photos JSONB -> documents table
 *   (entity_type='site_activity', entity_id=activity.id)
 * - Drops photos column from site_activities
 * - Keeps customer_properties.documents column temporarily (deprecated)
 */
export class MigrateJsonbDocuments1799000000000 implements MigrationInterface {
  name = 'MigrateJsonbDocuments1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Check if customer_properties.documents column exists
    const hasDocumentsCol = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'customer_properties' AND column_name = 'documents'
    `);

    if (hasDocumentsCol.length > 0) {
      // Migrate customer_properties.documents JSONB -> documents table
      await queryRunner.query(`
        INSERT INTO "documents" (
          "organization_id",
          "entity_type",
          "entity_id",
          "category",
          "tag",
          "file_name",
          "file_url",
          "file_size_bytes",
          "created_by"
        )
        SELECT
          cp."organization_id",
          'property',
          cp."id",
          CASE
            WHEN doc->>'tag' IN ('front_view', 'roof_view', 'meter_box', 'site_image') THEN 'image'
            ELSE 'document'
          END,
          COALESCE(doc->>'tag', 'other'),
          COALESCE(doc->>'fileName', 'document'),
          COALESCE(doc->>'url', ''),
          CASE
            WHEN doc->>'fileSize' IS NOT NULL THEN (doc->>'fileSize')::bigint
            ELSE NULL
          END,
          cp."created_by"
        FROM "customer_properties" cp
        CROSS JOIN LATERAL jsonb_array_elements(cp."documents") AS doc
        WHERE cp."documents" IS NOT NULL
          AND cp."documents" != '[]'::jsonb
          AND jsonb_array_length(cp."documents") > 0
          AND cp."deleted_at" IS NULL
      `);
    }

    // 2. Check if site_activities.photos column exists
    const hasPhotosCol = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'site_activities' AND column_name = 'photos'
    `);

    if (hasPhotosCol.length > 0) {
      // Migrate site_activities.photos JSONB -> documents table
      await queryRunner.query(`
        INSERT INTO "documents" (
          "organization_id",
          "entity_type",
          "entity_id",
          "category",
          "tag",
          "file_name",
          "file_url",
          "file_size_bytes",
          "created_by"
        )
        SELECT
          sa."organization_id",
          'site_activity',
          sa."id",
          'image',
          COALESCE(photo->>'category', 'site_image'),
          COALESCE(photo->>'filename', 'photo'),
          COALESCE(photo->>'url', ''),
          CASE
            WHEN photo->>'fileSize' IS NOT NULL THEN (photo->>'fileSize')::bigint
            ELSE NULL
          END,
          sa."created_by"
        FROM "site_activities" sa
        CROSS JOIN LATERAL jsonb_array_elements(sa."photos") AS photo
        WHERE sa."photos" IS NOT NULL
          AND sa."photos" != '[]'::jsonb
          AND jsonb_array_length(sa."photos") > 0
          AND sa."deleted_at" IS NULL
      `);

      // Drop photos column from site_activities
      await queryRunner.query(`ALTER TABLE "site_activities" DROP COLUMN IF EXISTS "photos"`);
    }

    // 3. Fix survey documents migrated in 1797 (they were inserted into old schema before 1798).
    // Migration 1798 orphaned them (entity_id=NULL -> soft-deleted). Restore them using metadata.
    await queryRunner.query(`
      UPDATE "documents"
      SET
        "entity_type" = 'site_activity',
        "entity_id" = ("metadata"->>'site_activity_id')::UUID,
        "category" = CASE
          WHEN "mime_type" LIKE 'image/%' THEN 'image'
          ELSE 'document'
        END,
        "tag" = COALESCE("metadata"->>'original_tag', 'other'),
        "deleted_at" = NULL
      WHERE "metadata"->>'migrated_from' = 'site_surveys'
        AND "metadata"->>'site_activity_id' IS NOT NULL
    `);

    // NOTE: customer_properties.documents column is kept temporarily (deprecated).
    // It will be dropped in a follow-up migration after all consumers are confirmed migrated.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add photos column to site_activities
    await queryRunner.query(`
      ALTER TABLE "site_activities" ADD COLUMN IF NOT EXISTS "photos" JSONB
    `);

    // NOTE: Migrated document records cannot be fully reversed back to JSONB format.
    // The document records created by this migration would need to be manually identified and deleted.
  }
}
