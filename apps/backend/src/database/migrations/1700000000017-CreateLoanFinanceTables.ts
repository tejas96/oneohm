import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Loan & Finance Tables
 * Schema Reference: Lines 1783-1867
 * Module: Loan & Finance (Module 17)
 * Tables: loan_applications, loan_documents
 */
export class CreateLoanFinanceTables1700000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // LOAN_APPLICATIONS TABLE
    // Schema: Lines 1783-1839
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'loan_applications',
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
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'customer_id',
            type: 'uuid',
            isNullable: false,
          },

          // Application Info
          {
            name: 'application_number',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'application_date',
            type: 'date',
            default: 'CURRENT_DATE',
          },

          // Loan Details
          {
            name: 'loan_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'loan_tenure_months',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'interest_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },

          // Lender
          {
            name: 'lender_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'lender_contact',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },

          // Jan Samarth Portal
          {
            name: 'jan_samarth_application_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'jan_samarth_submitted_at',
            type: 'timestamptz',
            isNullable: true,
          },

          // Status
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'initiated'",
          },

          // Site Visit
          {
            name: 'site_visit_scheduled_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'site_visit_completed_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'site_visit_report',
            type: 'text',
            isNullable: true,
          },

          // Approval
          {
            name: 'approved_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'approved_by_lender',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },

          // Disbursement
          {
            name: 'disbursement_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'disbursement_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'disbursement_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },

          // Rejection
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rejected_at',
            type: 'timestamptz',
            isNullable: true,
          },

          // Notes
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },

          // Audit
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
            onDelete: 'CASCADE',
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
            name: 'chk_loan_applications_status',
            columnNames: ['status'],
            expression:
              "status IN ('initiated', 'documents_pending', 'submitted', 'under_review', 'site_visit_pending', 'approved', 'disbursed', 'rejected', 'cancelled')",
          },
          {
            name: 'chk_loan_applications_tenure',
            columnNames: ['loan_tenure_months'],
            expression: 'loan_tenure_months > 0',
          },
          {
            name: 'chk_loan_applications_amount',
            columnNames: ['loan_amount'],
            expression: 'loan_amount > 0',
          },
        ],
      }),
      true,
    );

    // ============================================
    // INDEXES FOR LOAN_APPLICATIONS
    // ============================================
    await queryRunner.createIndex(
      'loan_applications',
      new TableIndex({
        name: 'idx_loan_applications_project',
        columnNames: ['project_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'loan_applications',
      new TableIndex({
        name: 'idx_loan_applications_customer',
        columnNames: ['customer_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'loan_applications',
      new TableIndex({
        name: 'idx_loan_applications_status',
        columnNames: ['status'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'loan_applications',
      new TableIndex({
        name: 'idx_loan_applications_application_number',
        columnNames: ['application_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'loan_applications',
      new TableIndex({
        name: 'idx_loan_applications_jan_samarth',
        columnNames: ['jan_samarth_application_id'],
        where: 'jan_samarth_application_id IS NOT NULL',
      }),
    );

    // ============================================
    // TRIGGER FOR LOAN_APPLICATIONS UPDATED_AT
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_loan_applications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_loan_applications_updated_at
      BEFORE UPDATE ON loan_applications
      FOR EACH ROW
      EXECUTE FUNCTION update_loan_applications_updated_at();
    `);

    // ============================================
    // LOAN_DOCUMENTS TABLE
    // Schema: Lines 1850-1867
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'loan_documents',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'loan_application_id',
            type: 'uuid',
            isNullable: false,
          },

          // Document Info
          {
            name: 'document_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'document_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_path',
            type: 'text',
            isNullable: false,
          },

          // Verification
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'verified_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'verified_by',
            type: 'uuid',
            isNullable: true,
          },

          // Audit
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['loan_application_id'],
            referencedTableName: 'loan_applications',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['verified_by'],
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
        ],
      }),
      true,
    );

    // ============================================
    // INDEXES FOR LOAN_DOCUMENTS
    // ============================================
    await queryRunner.createIndex(
      'loan_documents',
      new TableIndex({
        name: 'idx_loan_documents_application',
        columnNames: ['loan_application_id'],
      }),
    );

    await queryRunner.createIndex(
      'loan_documents',
      new TableIndex({
        name: 'idx_loan_documents_type',
        columnNames: ['document_type'],
      }),
    );

    await queryRunner.createIndex(
      'loan_documents',
      new TableIndex({
        name: 'idx_loan_documents_verified',
        columnNames: ['is_verified'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for loan_documents
    await queryRunner.dropIndex('loan_documents', 'idx_loan_documents_verified');
    await queryRunner.dropIndex('loan_documents', 'idx_loan_documents_type');
    await queryRunner.dropIndex('loan_documents', 'idx_loan_documents_application');

    // Drop loan_documents table
    await queryRunner.dropTable('loan_documents');

    // Drop trigger and function for loan_applications
    await queryRunner.query('DROP TRIGGER IF EXISTS trg_loan_applications_updated_at ON loan_applications');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_loan_applications_updated_at()');

    // Drop indexes for loan_applications
    await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_jan_samarth');
    await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_application_number');
    await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_status');
    await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_customer');
    await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_project');

    // Drop loan_applications table
    await queryRunner.dropTable('loan_applications');
  }
}

