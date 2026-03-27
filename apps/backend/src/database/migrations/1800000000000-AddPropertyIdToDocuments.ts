import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add property_id to Documents Table
 *
 * Adds a `property_id` column to the `documents` table so that all documents
 * can be queried by property in a single query, regardless of entity_type.
 *
 * Backfills property_id from entity relationships:
 *   - property   -> entity_id IS the property_id
 *   - site_activity -> site_activities.customer_property_id
 *   - loan       -> loan_applications.property_id
 *   - project    -> projects.property_id
 *   - quote      -> quotes.property_id
 *   - payment    -> payments.project_id -> projects.property_id
 *   - customer   -> customer_properties (prefer is_primary, then oldest)
 *
 * Un-resolvable active docs are soft-deleted with audit metadata.
 * Already-soft-deleted docs get organization_id as sentinel.
 */
export class AddPropertyIdToDocuments1800000000000 implements MigrationInterface {
  name = 'AddPropertyIdToDocuments1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add property_id column as NULLABLE
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN IF NOT EXISTS "property_id" UUID
    `);

    // 2. Backfill property_id from entity relationships.
    //    No deleted_at filter on documents so soft-deleted docs also get correct values.
    //    No deleted_at filter on source tables (raw SQL bypasses TypeORM soft-delete)
    //    so docs linked to soft-deleted entities are still resolved.

    // 2a) entity_type='property' -> trivial (entity_id IS the property id)
    await queryRunner.query(`
      UPDATE "documents" SET "property_id" = "entity_id"
      WHERE "entity_type" = 'property' AND "property_id" IS NULL
    `);

    // 2b) entity_type='site_activity' -> site_activities.customer_property_id (NOT NULL source)
    await queryRunner.query(`
      UPDATE "documents" d SET "property_id" = sa."customer_property_id"
      FROM "site_activities" sa
      WHERE d."entity_id" = sa."id" AND d."entity_type" = 'site_activity'
        AND d."property_id" IS NULL
    `);

    // 2c) entity_type='loan' -> loan_applications.property_id (nullable source)
    await queryRunner.query(`
      UPDATE "documents" d SET "property_id" = la."property_id"
      FROM "loan_applications" la
      WHERE d."entity_id" = la."id" AND d."entity_type" = 'loan'
        AND la."property_id" IS NOT NULL
        AND d."property_id" IS NULL
    `);

    // 2d) entity_type='project' -> projects.property_id (NOT NULL source)
    await queryRunner.query(`
      UPDATE "documents" d SET "property_id" = p."property_id"
      FROM "projects" p
      WHERE d."entity_id" = p."id" AND d."entity_type" = 'project'
        AND d."property_id" IS NULL
    `);

    // 2e) entity_type='quote' -> quotes.property_id (nullable source)
    await queryRunner.query(`
      UPDATE "documents" d SET "property_id" = q."property_id"
      FROM "quotes" q
      WHERE d."entity_id" = q."id" AND d."entity_type" = 'quote'
        AND q."property_id" IS NOT NULL
        AND d."property_id" IS NULL
    `);

    // 2f) entity_type='payment' -> payments.project_id -> projects.property_id
    await queryRunner.query(`
      UPDATE "documents" d SET "property_id" = p."property_id"
      FROM "payments" pay
      JOIN "projects" p ON pay."project_id" = p."id"
      WHERE d."entity_id" = pay."id" AND d."entity_type" = 'payment'
        AND d."property_id" IS NULL
    `);

    // 2g) entity_type='customer' -> customer_properties (prefer is_primary, then oldest)
    //     Subquery filters customer_properties by deleted_at IS NULL to pick an active property.
    await queryRunner.query(`
      UPDATE "documents" d SET "property_id" = cp."id"
      FROM (
        SELECT DISTINCT ON ("customer_id") "id", "customer_id"
        FROM "customer_properties"
        WHERE "deleted_at" IS NULL
        ORDER BY "customer_id", "is_primary" DESC, "created_at" ASC
      ) cp
      WHERE d."entity_id" = cp."customer_id" AND d."entity_type" = 'customer'
        AND d."property_id" IS NULL
    `);

    // 3. Soft-delete non-deleted docs where property_id is still NULL (orphans).
    await queryRunner.query(`
      UPDATE "documents"
      SET "deleted_at" = CURRENT_TIMESTAMP,
          "metadata" = COALESCE("metadata", '{}'::jsonb)
            || '{"orphaned_by_property_id_migration": true}'::jsonb
      WHERE "property_id" IS NULL AND "deleted_at" IS NULL
    `);

    // 4. Set sentinel property_id on already-soft-deleted rows so NOT NULL can be applied.
    await queryRunner.query(`
      UPDATE "documents" SET "property_id" = "organization_id"
      WHERE "property_id" IS NULL
    `);

    // 5. Set column to NOT NULL
    await queryRunner.query(`
      ALTER TABLE "documents"
        ALTER COLUMN "property_id" SET NOT NULL
    `);

    // 6. Add index for property-based queries
    await queryRunner.query(`
      CREATE INDEX "idx_documents_property"
        ON "documents" ("property_id", "organization_id", "deleted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_property"`);

    // 2. Make column nullable
    await queryRunner.query(`
      ALTER TABLE "documents"
        ALTER COLUMN "property_id" DROP NOT NULL
    `);

    // 3. Restore docs that were orphaned by this migration
    await queryRunner.query(`
      UPDATE "documents"
      SET "deleted_at" = NULL,
          "metadata" = "metadata" - 'orphaned_by_property_id_migration'
      WHERE "metadata"->>'orphaned_by_property_id_migration' = 'true'
    `);

    // 4. Drop column
    await queryRunner.query(`
      ALTER TABLE "documents" DROP COLUMN IF EXISTS "property_id"
    `);
  }
}
