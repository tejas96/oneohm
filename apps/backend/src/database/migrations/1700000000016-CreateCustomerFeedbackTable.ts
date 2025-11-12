import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Customer Feedback Table
 * Schema Reference: Lines 1730-1774
 * Module: Customer Feedback (Module 16)
 */
export class CreateCustomerFeedbackTable1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // CUSTOMER_FEEDBACK TABLE
    // Schema: Lines 1730-1774
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'customer_feedback',
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

          // Rating Fields
          {
            name: 'overall_rating',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'nps_score',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'nps_category',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },

          // Department Ratings (JSONB)
          {
            name: 'department_ratings',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },

          // Feedback Content
          {
            name: 'general_comments',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'improvement_suggestions',
            type: 'text',
            isNullable: true,
          },

          // Recommendation
          {
            name: 'would_recommend',
            type: 'boolean',
            isNullable: true,
          },

          // Feedback Method
          {
            name: 'feedback_method',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },

          // Publishing
          {
            name: 'is_published',
            type: 'boolean',
            default: false,
          },

          // Company Response
          {
            name: 'company_response',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'responded_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'responded_at',
            type: 'timestamptz',
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
            columnNames: ['responded_by'],
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
            name: 'chk_customer_feedback_overall_rating',
            columnNames: ['overall_rating'],
            expression: 'overall_rating >= 1 AND overall_rating <= 5',
          },
          {
            name: 'chk_customer_feedback_nps_score',
            columnNames: ['nps_score'],
            expression: 'nps_score >= 0 AND nps_score <= 10',
          },
          {
            name: 'chk_customer_feedback_nps_category',
            columnNames: ['nps_category'],
            expression: "nps_category IN ('detractor', 'passive', 'promoter')",
          },
          {
            name: 'chk_customer_feedback_method',
            columnNames: ['feedback_method'],
            expression:
              "feedback_method IN ('email', 'sms', 'phone_call', 'in_person', 'whatsapp', 'online_form', 'mobile_app')",
          },
        ],
      }),
      true,
    );

    // ============================================
    // INDEXES
    // ============================================
    await queryRunner.createIndex(
      'customer_feedback',
      new TableIndex({
        name: 'idx_customer_feedback_project',
        columnNames: ['project_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'customer_feedback',
      new TableIndex({
        name: 'idx_customer_feedback_customer',
        columnNames: ['customer_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'customer_feedback',
      new TableIndex({
        name: 'idx_customer_feedback_organization',
        columnNames: ['organization_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'customer_feedback',
      new TableIndex({
        name: 'idx_customer_feedback_nps_score',
        columnNames: ['nps_score'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'customer_feedback',
      new TableIndex({
        name: 'idx_customer_feedback_published',
        columnNames: ['is_published'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'customer_feedback',
      new TableIndex({
        name: 'idx_customer_feedback_created_at',
        columnNames: ['created_at'],
      }),
    );

    // ============================================
    // TRIGGER FOR UPDATED_AT
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_customer_feedback_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_customer_feedback_updated_at
      BEFORE UPDATE ON customer_feedback
      FOR EACH ROW
      EXECUTE FUNCTION update_customer_feedback_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_customer_feedback_updated_at ON customer_feedback',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS update_customer_feedback_updated_at()');

    // Drop indexes
    await queryRunner.dropIndex('customer_feedback', 'idx_customer_feedback_created_at');
    await queryRunner.dropIndex('customer_feedback', 'idx_customer_feedback_published');
    await queryRunner.dropIndex('customer_feedback', 'idx_customer_feedback_nps_score');
    await queryRunner.dropIndex('customer_feedback', 'idx_customer_feedback_organization');
    await queryRunner.dropIndex('customer_feedback', 'idx_customer_feedback_customer');
    await queryRunner.dropIndex('customer_feedback', 'idx_customer_feedback_project');

    // Drop table
    await queryRunner.dropTable('customer_feedback');
  }
}
