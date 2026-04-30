import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: CreateNumberingSequencesTable
 *
 * Generic per-org sequence table for concurrency-safe number generation.
 * Used by PurchaseOrderService and MaterialDispatchService.
 *
 * Pattern:
 *   INSERT INTO numbering_sequences ... ON CONFLICT DO UPDATE SET last_value = last_value + 1 RETURNING last_value
 *
 * This is atomic and concurrency-safe without advisory locks.
 * The sequence_key encodes type + period (e.g. 'po-2026-04', 'dispatch-2026-04').
 */
export class CreateNumberingSequencesTable1814000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE numbering_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        sequence_key VARCHAR(50) NOT NULL,
        last_value INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT uq_numbering_sequences_org_key UNIQUE (organization_id, sequence_key)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_numbering_sequences_org
      ON numbering_sequences(organization_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS numbering_sequences`);
  }
}
