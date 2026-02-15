import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Drop loan_documents table
 *
 * Documents are now stored in customer_properties.documents JSONB column.
 * This migration removes the separate loan_documents table as part of
 * the unified document storage architecture.
 *
 * Note: No data migration needed - no production data exists in this table.
 */
export class DropLoanDocumentsTable1770200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the table (CASCADE will automatically drop indexes and foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_documents" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the loan_documents table
    await queryRunner.query(`
      CREATE TABLE "loan_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "loan_application_id" uuid NOT NULL,
        "document_type" varchar(100) NOT NULL,
        "document_name" varchar(255) NOT NULL,
        "file_path" text NOT NULL,
        "is_verified" boolean NOT NULL DEFAULT false,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "verified_by" uuid,
        "created_by" uuid,
        CONSTRAINT "PK_loan_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loan_documents_loan_application" FOREIGN KEY ("loan_application_id") 
          REFERENCES "loan_applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_loan_documents_verified_by" FOREIGN KEY ("verified_by") 
          REFERENCES "users"("id"),
        CONSTRAINT "FK_loan_documents_created_by" FOREIGN KEY ("created_by") 
          REFERENCES "users"("id")
      )
    `);
  }
}
