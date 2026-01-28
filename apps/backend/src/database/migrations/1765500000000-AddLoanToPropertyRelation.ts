import {
  type MigrationInterface,
  type QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Migration: Simplify Loan Applications for External Bank Tracking
 *
 * Changes:
 * 1. Add wants_loan column to customer_properties table
 * 2. Add property_id column to loan_applications table
 * 3. Remove project_id column from loan_applications (no longer needed)
 * 4. Remove organization_id (redundant - available via property -> customer)
 * 5. Rename application_number to bank_reference_number (entered by finance team)
 * 6. Remove internal loan processing fields (we don't provide loans)
 * 7. Update status constraint to simplified values
 *
 * This migration supports the new simplified flow where we only track
 * customer loan interest with external banks, not process loans internally.
 */
export class AddLoanToPropertyRelation1765500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. ADD wants_loan TO customer_properties
    // ============================================
    await queryRunner.addColumn(
      'customer_properties',
      new TableColumn({
        name: 'wants_loan',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // ============================================
    // 2. ADD property_id TO loan_applications
    // ============================================
    await queryRunner.addColumn(
      'loan_applications',
      new TableColumn({
        name: 'property_id',
        type: 'uuid',
        isNullable: true, // Nullable initially for existing data
      }),
    );

    // Add foreign key for property_id
    await queryRunner.createForeignKey(
      'loan_applications',
      new TableForeignKey({
        name: 'fk_loan_applications_property',
        columnNames: ['property_id'],
        referencedTableName: 'customer_properties',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add index for property_id
    await queryRunner.createIndex(
      'loan_applications',
      new TableIndex({
        name: 'idx_loan_applications_property',
        columnNames: ['property_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    // ============================================
    // 3. REMOVE project_id COLUMN (no longer needed)
    // ============================================
    let table = await queryRunner.getTable('loan_applications');
    const projectFk = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('project_id') !== -1);
    if (projectFk) {
      await queryRunner.dropForeignKey('loan_applications', projectFk);
    }

    try {
      await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_project');
    } catch {
      // Index might not exist
    }

    if (await queryRunner.hasColumn('loan_applications', 'project_id')) {
      await queryRunner.dropColumn('loan_applications', 'project_id');
    }

    // ============================================
    // 4. REMOVE organization_id (redundant)
    // ============================================
    table = await queryRunner.getTable('loan_applications');
    const orgFk = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('organization_id') !== -1);
    if (orgFk) {
      await queryRunner.dropForeignKey('loan_applications', orgFk);
    }

    try {
      await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_organization');
    } catch {
      // Index might not exist
    }

    if (await queryRunner.hasColumn('loan_applications', 'organization_id')) {
      await queryRunner.dropColumn('loan_applications', 'organization_id');
    }

    // ============================================
    // 5. RENAME application_number TO bank_reference_number
    // ============================================
    // First drop the unique index on application_number
    try {
      await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_application_number');
    } catch {
      // Index might not exist or have different name
    }

    // Check if column exists and rename it
    if (await queryRunner.hasColumn('loan_applications', 'application_number')) {
      // Use raw SQL for rename and nullability change to avoid TypeORM constraint handling issues
      await queryRunner.query(
        `ALTER TABLE loan_applications RENAME COLUMN application_number TO bank_reference_number`,
      );
      await queryRunner.query(
        `ALTER TABLE loan_applications ALTER COLUMN bank_reference_number DROP NOT NULL`,
      );
      // Drop unique constraint if it exists (was created with isUnique: true in original migration)
      await queryRunner.query(
        `ALTER TABLE loan_applications DROP CONSTRAINT IF EXISTS "UQ_loan_applications_application_number"`,
      );
      await queryRunner.query(
        `ALTER TABLE loan_applications DROP CONSTRAINT IF EXISTS "loan_applications_application_number_key"`,
      );
    }

    // ============================================
    // 6. ADD MISSING updated_at TO loan_documents
    // ============================================
    // LoanDocumentEntity extends BaseEntity which requires updated_at
    // But the table was created without it - this fixes the TypeORM relation loading error
    if (!(await queryRunner.hasColumn('loan_documents', 'updated_at'))) {
      await queryRunner.addColumn(
        'loan_documents',
        new TableColumn({
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        }),
      );

      // Create reusable function if it doesn't exist (used by other tables too)
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Add trigger to auto-update updated_at on row update
      // Reusing the shared function that other tables use
      await queryRunner.query(`
        CREATE TRIGGER update_loan_documents_updated_at
        BEFORE UPDATE ON loan_documents
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    // ============================================
    // 6b. MAKE loan_amount NULLABLE
    // ============================================
    // The original migration set loan_amount as NOT NULL with a CHECK constraint.
    // But for tracking external bank loans, we may not know the amount initially.
    // We also need to drop the check constraint that requires loan_amount > 0.
    // Note: Using raw SQL instead of TypeORM's changeColumn to avoid internal constraint handling issues
    await queryRunner.query(
      `ALTER TABLE loan_applications DROP CONSTRAINT IF EXISTS chk_loan_applications_amount`,
    );

    if (await queryRunner.hasColumn('loan_applications', 'loan_amount')) {
      // Use raw SQL to alter the column - avoids TypeORM trying to manage constraints internally
      await queryRunner.query(
        `ALTER TABLE loan_applications ALTER COLUMN loan_amount DROP NOT NULL`,
      );
    }

    // ============================================
    // 7. DROP UNUSED COLUMNS
    // ============================================
    const columnsToDrop = [
      'application_date',
      'loan_tenure_months',
      'interest_rate',
      'jan_samarth_application_id',
      'jan_samarth_submitted_at',
      'site_visit_scheduled_date',
      'site_visit_completed_date',
      'site_visit_report',
      'approved_amount',
      'approved_at',
      'approved_by_lender',
      'disbursement_date',
      'disbursement_amount',
      'disbursement_reference',
      'rejection_reason',
      'rejected_at',
    ];

    // Drop indexes for deprecated features first
    try {
      await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_jan_samarth');
    } catch {
      // Index might not exist
    }

    // Drop each column if it exists
    for (const columnName of columnsToDrop) {
      if (await queryRunner.hasColumn('loan_applications', columnName)) {
        await queryRunner.dropColumn('loan_applications', columnName);
      }
    }

    // Drop check constraint for tenure (removed column)
    // Note: chk_loan_applications_amount was already dropped in section 6b above
    try {
      await queryRunner.query(
        'ALTER TABLE loan_applications DROP CONSTRAINT IF EXISTS chk_loan_applications_tenure',
      );
    } catch {
      // Constraint might not exist
    }

    // ============================================
    // 7. UPDATE STATUS CONSTRAINT
    // ============================================
    // Drop old status constraint
    await queryRunner.query(`
      ALTER TABLE loan_applications 
      DROP CONSTRAINT IF EXISTS chk_loan_applications_status
    `);

    // Add new simplified status constraint
    await queryRunner.query(`
      ALTER TABLE loan_applications 
      ADD CONSTRAINT chk_loan_applications_status 
      CHECK (status IN ('initiated', 'applied', 'approved', 'rejected', 'cancelled'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // REMOVE updated_at FROM loan_documents (if we added it)
    // ============================================
    if (await queryRunner.hasColumn('loan_documents', 'updated_at')) {
      // Drop trigger first
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS update_loan_documents_updated_at ON loan_documents;
      `);
      // Drop column
      await queryRunner.dropColumn('loan_documents', 'updated_at');
    }

    // ============================================
    // REVERT STATUS CONSTRAINT
    // ============================================
    await queryRunner.query(`
      ALTER TABLE loan_applications 
      DROP CONSTRAINT IF EXISTS chk_loan_applications_status
    `);

    await queryRunner.query(`
      ALTER TABLE loan_applications 
      ADD CONSTRAINT chk_loan_applications_status 
      CHECK (status IN ('initiated', 'documents_pending', 'submitted', 'under_review', 
                        'site_visit_pending', 'approved', 'disbursed', 'rejected', 'cancelled'))
    `);

    // ============================================
    // RE-ADD DROPPED COLUMNS
    // ============================================
    const columnsToAdd: TableColumn[] = [
      new TableColumn({ name: 'application_date', type: 'date', isNullable: true }),
      new TableColumn({ name: 'loan_tenure_months', type: 'integer', isNullable: true }),
      new TableColumn({
        name: 'interest_rate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: 'jan_samarth_application_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({ name: 'jan_samarth_submitted_at', type: 'timestamptz', isNullable: true }),
      new TableColumn({ name: 'site_visit_scheduled_date', type: 'date', isNullable: true }),
      new TableColumn({ name: 'site_visit_completed_date', type: 'date', isNullable: true }),
      new TableColumn({ name: 'site_visit_report', type: 'text', isNullable: true }),
      new TableColumn({
        name: 'approved_amount',
        type: 'decimal',
        precision: 15,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({ name: 'approved_at', type: 'timestamptz', isNullable: true }),
      new TableColumn({
        name: 'approved_by_lender',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({ name: 'disbursement_date', type: 'date', isNullable: true }),
      new TableColumn({
        name: 'disbursement_amount',
        type: 'decimal',
        precision: 15,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: 'disbursement_reference',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({ name: 'rejection_reason', type: 'text', isNullable: true }),
      new TableColumn({ name: 'rejected_at', type: 'timestamptz', isNullable: true }),
    ];

    for (const column of columnsToAdd) {
      await queryRunner.addColumn('loan_applications', column);
    }

    // ============================================
    // RENAME bank_reference_number BACK TO application_number
    // ============================================
    if (await queryRunner.hasColumn('loan_applications', 'bank_reference_number')) {
      // Use raw SQL for rename and nullability change for consistency with up migration
      await queryRunner.query(
        `ALTER TABLE loan_applications RENAME COLUMN bank_reference_number TO application_number`,
      );
      // Note: Setting NOT NULL requires handling existing NULL values first
      await queryRunner.query(
        `UPDATE loan_applications SET application_number = 'UNKNOWN-' || id WHERE application_number IS NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE loan_applications ALTER COLUMN application_number SET NOT NULL`,
      );

      // Re-create the unique index
      await queryRunner.createIndex(
        'loan_applications',
        new TableIndex({
          name: 'idx_loan_applications_application_number',
          columnNames: ['application_number'],
          isUnique: true,
        }),
      );
    }

    // ============================================
    // NOTE: organization_id is NOT re-added - it's redundant
    // Organization context is available via property -> customer -> organization
    // ============================================

    // ============================================
    // RE-ADD project_id
    // ============================================
    await queryRunner.addColumn(
      'loan_applications',
      new TableColumn({
        name: 'project_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'loan_applications',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ============================================
    // DROP property_id
    // ============================================
    await queryRunner.dropIndex('loan_applications', 'idx_loan_applications_property');
    await queryRunner.dropForeignKey('loan_applications', 'fk_loan_applications_property');
    await queryRunner.dropColumn('loan_applications', 'property_id');

    // ============================================
    // DROP wants_loan
    // ============================================
    await queryRunner.dropColumn('customer_properties', 'wants_loan');
  }
}
