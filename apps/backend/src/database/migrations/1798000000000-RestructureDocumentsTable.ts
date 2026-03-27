import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Restructure Documents Table
 *
 * - Adds entityType + entityId + category + tag + fileUrl columns (nullable first)
 * - Backfills from existing FK columns (project_id, customer_id, quote_id, payment_id)
 * - Handles orphan documents (all FKs null) by soft-deleting (NEW-2)
 * - Makes new columns NOT NULL after backfill
 * - Drops old FK columns and related fields (WCR, signatures, OTP, versioning, status)
 * - Adds new composite indexes
 */
export class RestructureDocumentsTable1798000000000 implements MigrationInterface {
  name = 'RestructureDocumentsTable1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new columns as NULLABLE (NEW-2 fix)
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "entity_type" VARCHAR(50),
        ADD COLUMN "entity_id" UUID,
        ADD COLUMN "category" VARCHAR(50),
        ADD COLUMN "tag" VARCHAR(100),
        ADD COLUMN "file_url" TEXT
    `);

    // 2. Backfill entity_type + entity_id from existing FK columns (priority order: project > payment > quote > customer)
    // Also log multi-FK rows in metadata for audit (C4)
    await queryRunner.query(`
      UPDATE "documents"
      SET
        "entity_type" = CASE
          WHEN "project_id" IS NOT NULL THEN 'project'
          WHEN "payment_id" IS NOT NULL THEN 'payment'
          WHEN "quote_id" IS NOT NULL THEN 'quote'
          WHEN "customer_id" IS NOT NULL THEN 'customer'
          ELSE NULL
        END,
        "entity_id" = CASE
          WHEN "project_id" IS NOT NULL THEN "project_id"
          WHEN "payment_id" IS NOT NULL THEN "payment_id"
          WHEN "quote_id" IS NOT NULL THEN "quote_id"
          WHEN "customer_id" IS NOT NULL THEN "customer_id"
          ELSE NULL
        END
      WHERE "entity_type" IS NULL
    `);

    // Log secondary FK references in metadata for rows with multiple FKs set (C4 audit trail)
    await queryRunner.query(`
      UPDATE "documents"
      SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
        'migration_secondary_fks', jsonb_build_object(
          'project_id', "project_id",
          'customer_id', "customer_id",
          'quote_id', "quote_id",
          'payment_id', "payment_id"
        )
      )
      WHERE (
        ("project_id" IS NOT NULL)::int +
        ("customer_id" IS NOT NULL)::int +
        ("quote_id" IS NOT NULL)::int +
        ("payment_id" IS NOT NULL)::int
      ) > 1
    `);

    // 3. Backfill file_url from file_path (C3: keep as storage key, resolve at read time)
    await queryRunner.query(`
      UPDATE "documents" SET "file_url" = "file_path" WHERE "file_url" IS NULL AND "file_path" IS NOT NULL
    `);

    // 4. Backfill tag from document_type
    await queryRunner.query(`
      UPDATE "documents" SET "tag" = COALESCE("document_type", 'other') WHERE "tag" IS NULL
    `);

    // 5. Backfill category (infer from document_type or default to 'document')
    await queryRunner.query(`
      UPDATE "documents"
      SET "category" = CASE
        WHEN "document_type" IN ('site_survey', 'inspection_report', 'maintenance_report', 'service_report') THEN 'report'
        WHEN "mime_type" LIKE 'image/%' THEN 'image'
        ELSE 'document'
      END
      WHERE "category" IS NULL
    `);

    // 6. Handle orphan documents: soft-delete rows where entity_id IS NULL after backfill (NEW-2)
    await queryRunner.query(`
      UPDATE "documents"
      SET "deleted_at" = CURRENT_TIMESTAMP,
          "metadata" = COALESCE("metadata", '{}'::jsonb) || '{"orphaned_by_migration": true}'::jsonb,
          "entity_type" = 'unknown',
          "entity_id" = "organization_id",
          "file_url" = COALESCE("file_url", "file_path", ''),
          "tag" = COALESCE("tag", 'other'),
          "category" = COALESCE("category", 'document')
      WHERE "entity_id" IS NULL
    `);

    // 7. Set remaining NULLs to safe defaults (belt-and-suspenders)
    await queryRunner.query(
      `UPDATE "documents" SET "file_url" = COALESCE("file_url", "file_path", '') WHERE "file_url" IS NULL`,
    );
    await queryRunner.query(`UPDATE "documents" SET "tag" = 'other' WHERE "tag" IS NULL`);
    await queryRunner.query(
      `UPDATE "documents" SET "category" = 'document' WHERE "category" IS NULL`,
    );

    // 8. ALTER columns to NOT NULL
    await queryRunner.query(`
      ALTER TABLE "documents"
        ALTER COLUMN "entity_type" SET NOT NULL,
        ALTER COLUMN "entity_id" SET NOT NULL,
        ALTER COLUMN "category" SET NOT NULL,
        ALTER COLUMN "tag" SET NOT NULL,
        ALTER COLUMN "file_url" SET NOT NULL
    `);

    // 9. Drop old FK constraints dynamically (NEW-11)
    const fks = await queryRunner.query(`
      SELECT tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'documents'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name IN ('project_id', 'customer_id', 'quote_id', 'payment_id', 'parent_document_id', 'signed_by')
    `);
    for (const fk of fks) {
      await queryRunner.query(
        `ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`,
      );
    }

    // 10. Drop old indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_customer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_quote"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_payment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_version"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_wcr_session"`);

    // 11. Drop old columns
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP COLUMN IF EXISTS "project_id",
        DROP COLUMN IF EXISTS "customer_id",
        DROP COLUMN IF EXISTS "quote_id",
        DROP COLUMN IF EXISTS "payment_id",
        DROP COLUMN IF EXISTS "parent_document_id",
        DROP COLUMN IF EXISTS "document_number",
        DROP COLUMN IF EXISTS "document_name",
        DROP COLUMN IF EXISTS "document_type",
        DROP COLUMN IF EXISTS "file_path",
        DROP COLUMN IF EXISTS "version",
        DROP COLUMN IF EXISTS "is_latest_version",
        DROP COLUMN IF EXISTS "wcr_session_number",
        DROP COLUMN IF EXISTS "wcr_type",
        DROP COLUMN IF EXISTS "is_signed",
        DROP COLUMN IF EXISTS "signed_by",
        DROP COLUMN IF EXISTS "signed_at",
        DROP COLUMN IF EXISTS "signature_data",
        DROP COLUMN IF EXISTS "is_otp_verified",
        DROP COLUMN IF EXISTS "otp_verified_at",
        DROP COLUMN IF EXISTS "status"
    `);

    // 12. Drop check constraint
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "chk_documents_status"`,
    );

    // Also drop the unique constraint on document_number+version (it references dropped columns)
    const uniqueConstraints = await queryRunner.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'documents' AND constraint_type = 'UNIQUE'
        AND constraint_name != 'documents_pkey'
    `);
    for (const uc of uniqueConstraints) {
      await queryRunner.query(
        `ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "${uc.constraint_name}"`,
      );
    }

    // 13. Add new indexes
    await queryRunner.query(`
      CREATE INDEX "idx_documents_entity" ON "documents" ("entity_type", "entity_id", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_documents_org_entity" ON "documents" ("organization_id", "entity_type", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_documents_tag" ON "documents" ("tag", "deleted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_tag"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_org_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_entity"`);

    // Re-add old columns
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN IF NOT EXISTS "project_id" UUID,
        ADD COLUMN IF NOT EXISTS "customer_id" UUID,
        ADD COLUMN IF NOT EXISTS "quote_id" UUID,
        ADD COLUMN IF NOT EXISTS "payment_id" UUID,
        ADD COLUMN IF NOT EXISTS "parent_document_id" UUID,
        ADD COLUMN IF NOT EXISTS "document_number" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "document_name" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "document_type" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "file_path" TEXT,
        ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "is_latest_version" BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS "wcr_session_number" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "wcr_type" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "is_signed" BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS "signed_by" UUID,
        ADD COLUMN IF NOT EXISTS "signed_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "signature_data" TEXT,
        ADD COLUMN IF NOT EXISTS "is_otp_verified" BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS "otp_verified_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'draft'
    `);

    // Backfill old columns from entity_type + entity_id
    await queryRunner.query(
      `UPDATE "documents" SET "project_id" = "entity_id" WHERE "entity_type" = 'project'`,
    );
    await queryRunner.query(
      `UPDATE "documents" SET "customer_id" = "entity_id" WHERE "entity_type" = 'customer'`,
    );
    await queryRunner.query(
      `UPDATE "documents" SET "quote_id" = "entity_id" WHERE "entity_type" = 'quote'`,
    );
    await queryRunner.query(
      `UPDATE "documents" SET "payment_id" = "entity_id" WHERE "entity_type" = 'payment'`,
    );
    await queryRunner.query(`UPDATE "documents" SET "file_path" = "file_url"`);
    await queryRunner.query(`UPDATE "documents" SET "document_type" = "tag"`);
    await queryRunner.query(
      `UPDATE "documents" SET "document_number" = 'RESTORED-' || "id"::text WHERE "document_number" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "documents" SET "document_name" = "file_name" WHERE "document_name" IS NULL`,
    );

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP COLUMN IF EXISTS "entity_type",
        DROP COLUMN IF EXISTS "entity_id",
        DROP COLUMN IF EXISTS "category",
        DROP COLUMN IF EXISTS "tag",
        DROP COLUMN IF EXISTS "file_url"
    `);

    // Re-create old indexes
    await queryRunner.query(
      `CREATE INDEX "idx_documents_type" ON "documents" ("document_type") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_documents_project" ON "documents" ("project_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(`CREATE INDEX "idx_documents_customer" ON "documents" ("customer_id")`);
    await queryRunner.query(`CREATE INDEX "idx_documents_quote" ON "documents" ("quote_id")`);
    await queryRunner.query(`CREATE INDEX "idx_documents_payment" ON "documents" ("payment_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_documents_version" ON "documents" ("is_latest_version") WHERE "is_latest_version" = TRUE`,
    );

    // NOTE: FK constraints and check constraint are not fully restored. Manual re-creation may be needed.
  }
}
