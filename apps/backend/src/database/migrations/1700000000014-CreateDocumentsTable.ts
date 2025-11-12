import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Documents Table
 * Schema Reference: Lines 1482-1555
 * Module: Document Management with version control, digital signatures, and OTP verification
 */
export class CreateDocumentsTable1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // DOCUMENTS TABLE
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'documents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },

          // ============================================
          // DOCUMENT INFO
          // ============================================
          {
            name: 'document_number',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'document_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'document_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },

          // ============================================
          // REFERENCES (POLYMORPHIC)
          // ============================================
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'customer_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'quote_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'payment_id',
            type: 'uuid',
            isNullable: true,
          },

          // ============================================
          // FILE DETAILS
          // ============================================
          {
            name: 'file_path',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_size_bytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },

          // ============================================
          // VERSION CONTROL
          // ============================================
          {
            name: 'version',
            type: 'integer',
            default: 1,
          },
          {
            name: 'is_latest_version',
            type: 'boolean',
            default: true,
          },
          {
            name: 'parent_document_id',
            type: 'uuid',
            isNullable: true,
          },

          // ============================================
          // WCR SPECIFIC FIELDS
          // ============================================
          {
            name: 'wcr_session_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'wcr_type',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },

          // ============================================
          // DIGITAL SIGNATURE
          // ============================================
          {
            name: 'is_signed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'signed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'signed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'signature_data',
            type: 'text',
            isNullable: true,
          },

          // ============================================
          // OTP VERIFICATION
          // ============================================
          {
            name: 'is_otp_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'otp_verified_at',
            type: 'timestamptz',
            isNullable: true,
          },

          // ============================================
          // STATUS
          // ============================================
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'draft'",
          },

          // ============================================
          // METADATA
          // ============================================
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },

          // ============================================
          // NOTES
          // ============================================
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },

          // ============================================
          // AUDIT FIELDS
          // ============================================
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['project_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['quote_id'],
            referencedTableName: 'quotes',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['payment_id'],
            referencedTableName: 'payments',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['parent_document_id'],
            referencedTableName: 'documents',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['signed_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['updated_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        checks: [
          {
            name: 'chk_documents_status',
            columnNames: ['status'],
            expression:
              "status IN ('draft', 'pending_approval', 'approved', 'rejected', 'submitted', 'archived')",
          },
        ],
      }),
      true,
    );

    // ============================================
    // INDEXES
    // ============================================
    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_organization',
        columnNames: ['organization_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_type',
        columnNames: ['document_type'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_project',
        columnNames: ['project_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_customer',
        columnNames: ['customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_quote',
        columnNames: ['quote_id'],
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_payment',
        columnNames: ['payment_id'],
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_version',
        columnNames: ['is_latest_version'],
        where: 'is_latest_version = TRUE',
      }),
    );

    await queryRunner.createIndex(
      'documents',
      new TableIndex({
        name: 'idx_documents_wcr_session',
        columnNames: ['wcr_session_number'],
        where: 'wcr_session_number IS NOT NULL',
      }),
    );

    // ============================================
    // TRIGGER FOR UPDATED_AT
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_documents_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_documents_updated_at
      BEFORE UPDATE ON documents
      FOR EACH ROW
      EXECUTE FUNCTION update_documents_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query('DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_documents_updated_at()');

    // Drop indexes
    await queryRunner.dropIndex('documents', 'idx_documents_wcr_session');
    await queryRunner.dropIndex('documents', 'idx_documents_version');
    await queryRunner.dropIndex('documents', 'idx_documents_payment');
    await queryRunner.dropIndex('documents', 'idx_documents_quote');
    await queryRunner.dropIndex('documents', 'idx_documents_customer');
    await queryRunner.dropIndex('documents', 'idx_documents_project');
    await queryRunner.dropIndex('documents', 'idx_documents_type');
    await queryRunner.dropIndex('documents', 'idx_documents_organization');

    // Drop table
    await queryRunner.dropTable('documents');
  }
}
