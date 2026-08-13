import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Let a payment carry more than one piece of evidence.
 *
 * A cheque photo plus the bank slip, or several UPI screenshots for one
 * transfer, is ordinary — `proof_document_id` allowed exactly one.
 *
 * No new table: `documents` is already polymorphic and already attaches proof
 * to a ledger entry via (entity_type, entity_id). Pending money uses the same
 * mechanism with `payment_approval`, and approval re-points every one of them to
 * `ledger_entry` so an approved payment's evidence ends up exactly where the
 * rest of the app looks for it.
 */
export class MultipleProofDocumentsForApprovals1854600000000 implements MigrationInterface {
  name = 'MultipleProofDocumentsForApprovals1854600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Carry existing single-proof rows over before the column goes.
    await queryRunner.query(`
      UPDATE documents d
         SET entity_type = 'payment_approval',
             entity_id   = p.id
        FROM pending_ledger_entries p
       WHERE p.proof_document_id = d.id
    `);

    await queryRunner.query(`
      ALTER TABLE "pending_ledger_entries" DROP COLUMN IF EXISTS "proof_document_id"
    `);

    // Every read of a pending row's proof filters on exactly this pair.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_documents_entity"
        ON "documents" ("entity_type", "entity_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pending_ledger_entries"
        ADD COLUMN IF NOT EXISTS "proof_document_id" uuid NULL REFERENCES "documents"("id")
    `);

    // Restore the first document per pending row; any extras are dropped, which
    // is the unavoidable cost of going back to a single-proof column.
    await queryRunner.query(`
      UPDATE pending_ledger_entries p
         SET proof_document_id = first_doc.id
        FROM (
          SELECT DISTINCT ON (entity_id) entity_id, id
            FROM documents
           WHERE entity_type = 'payment_approval'
           ORDER BY entity_id, created_at
        ) AS first_doc
       WHERE first_doc.entity_id = p.id
    `);

    await queryRunner.query(`
      UPDATE documents SET entity_type = 'project', entity_id = p.project_id
        FROM pending_ledger_entries p
       WHERE documents.entity_id = p.id AND documents.entity_type = 'payment_approval'
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_entity"`);
  }
}
