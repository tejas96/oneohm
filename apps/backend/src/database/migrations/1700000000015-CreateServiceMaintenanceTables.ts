import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Service & Maintenance Tables
 * Schema Reference: Lines 1562-1721
 * Module: Service & Maintenance (3 tables)
 */
export class CreateServiceMaintenanceTables1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // PROJECT_MAINTENANCE_CONFIGS TABLE
    // Schema: Lines 1567-1600
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'project_maintenance_configs',
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
            isUnique: true,
          },

          // Maintenance Settings
          {
            name: 'is_maintenance_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'maintenance_years',
            type: 'integer',
            isNullable: false,
          },

          // Intervals Configuration (JSONB)
          {
            name: 'intervals',
            type: 'jsonb',
            isNullable: false,
          },

          // Tracking
          {
            name: 'project_completion_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'last_maintenance_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'next_maintenance_due_date',
            type: 'date',
            isNullable: true,
          },

          // Status
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
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
        ],
        checks: [
          {
            name: 'chk_maintenance_config_status',
            columnNames: ['status'],
            expression: "status IN ('active', 'inactive', 'completed')",
          },
        ],
      }),
      true,
    );

    // ============================================
    // MAINTENANCE_TASKS TABLE
    // Schema: Lines 1602-1656
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'maintenance_tasks',
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
            name: 'maintenance_config_id',
            type: 'uuid',
            isNullable: false,
          },

          // Task Info
          {
            name: 'task_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'task_code',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'interval_number',
            type: 'integer',
            isNullable: false,
          },

          // Schedule
          {
            name: 'scheduled_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'completed_date',
            type: 'date',
            isNullable: true,
          },

          // Assignment
          {
            name: 'assigned_to_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'assigned_to_department',
            type: 'varchar',
            length: '100',
            default: "'service'",
          },
          {
            name: 'assigned_at',
            type: 'timestamptz',
            isNullable: true,
          },

          // Status
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'scheduled'",
          },

          // Checklist
          {
            name: 'checklist',
            type: 'jsonb',
            isNullable: true,
          },

          // Findings
          {
            name: 'findings',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'issues_found',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'actions_taken',
            type: 'text',
            isNullable: true,
          },

          // Attachments
          {
            name: 'attachments',
            type: 'jsonb',
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
            columnNames: ['maintenance_config_id'],
            referencedTableName: 'project_maintenance_configs',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['assigned_to_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        checks: [
          {
            name: 'chk_maintenance_task_status',
            columnNames: ['status'],
            expression:
              "status IN ('scheduled', 'assigned', 'in_progress', 'completed', 'skipped', 'overdue')",
          },
        ],
      }),
      true,
    );

    // ============================================
    // SERVICE_REQUESTS TABLE
    // Schema: Lines 1658-1721
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'service_requests',
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

          // Request Info
          {
            name: 'request_number',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'request_date',
            type: 'date',
            isNullable: false,
            default: 'CURRENT_DATE',
          },

          // Issue Details
          {
            name: 'issue_title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'issue_description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'issue_category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },

          // Priority
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: "'medium'",
          },

          // Assignment
          {
            name: 'assigned_to_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'assigned_at',
            type: 'timestamptz',
            isNullable: true,
          },

          // Schedule
          {
            name: 'scheduled_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'completed_date',
            type: 'date',
            isNullable: true,
          },

          // Status
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'open'",
          },

          // Chargeable
          {
            name: 'is_chargeable',
            type: 'boolean',
            default: false,
          },
          {
            name: 'estimated_cost',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'actual_cost',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },

          // Resolution
          {
            name: 'resolution_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolution_attachments',
            type: 'jsonb',
            isNullable: true,
          },

          // Customer Feedback
          {
            name: 'customer_rating',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'customer_feedback',
            type: 'text',
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
            columnNames: ['assigned_to_user_id'],
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
            name: 'chk_service_request_priority',
            columnNames: ['priority'],
            expression: "priority IN ('low', 'medium', 'high', 'urgent')",
          },
          {
            name: 'chk_service_request_status',
            columnNames: ['status'],
            expression:
              "status IN ('open', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled')",
          },
          {
            name: 'chk_service_request_rating',
            columnNames: ['customer_rating'],
            expression: 'customer_rating >= 1 AND customer_rating <= 5',
          },
        ],
      }),
      true,
    );

    // ============================================
    // INDEXES - project_maintenance_configs
    // ============================================
    await queryRunner.createIndex(
      'project_maintenance_configs',
      new TableIndex({
        name: 'idx_maintenance_configs_project',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'project_maintenance_configs',
      new TableIndex({
        name: 'idx_maintenance_configs_next_due',
        columnNames: ['next_maintenance_due_date'],
        where: "status = 'active'",
      }),
    );

    // ============================================
    // INDEXES - maintenance_tasks
    // ============================================
    await queryRunner.createIndex(
      'maintenance_tasks',
      new TableIndex({
        name: 'idx_maintenance_tasks_project',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'maintenance_tasks',
      new TableIndex({
        name: 'idx_maintenance_tasks_config',
        columnNames: ['maintenance_config_id'],
      }),
    );

    await queryRunner.createIndex(
      'maintenance_tasks',
      new TableIndex({
        name: 'idx_maintenance_tasks_assigned_to',
        columnNames: ['assigned_to_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'maintenance_tasks',
      new TableIndex({
        name: 'idx_maintenance_tasks_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'maintenance_tasks',
      new TableIndex({
        name: 'idx_maintenance_tasks_scheduled',
        columnNames: ['scheduled_date'],
      }),
    );

    // ============================================
    // INDEXES - service_requests
    // ============================================
    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'idx_service_requests_project',
        columnNames: ['project_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'idx_service_requests_customer',
        columnNames: ['customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'idx_service_requests_assigned_to',
        columnNames: ['assigned_to_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'idx_service_requests_status',
        columnNames: ['status'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'service_requests',
      new TableIndex({
        name: 'idx_service_requests_priority',
        columnNames: ['priority'],
      }),
    );

    // ============================================
    // TRIGGERS FOR UPDATED_AT
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_project_maintenance_configs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_project_maintenance_configs_updated_at
      BEFORE UPDATE ON project_maintenance_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_project_maintenance_configs_updated_at();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_maintenance_tasks_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_maintenance_tasks_updated_at
      BEFORE UPDATE ON maintenance_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_maintenance_tasks_updated_at();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_service_requests_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_service_requests_updated_at
      BEFORE UPDATE ON service_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_service_requests_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers and functions
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON service_requests',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS update_service_requests_updated_at()');

    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_maintenance_tasks_updated_at ON maintenance_tasks',
    );
    await queryRunner.query('DROP FUNCTION IF EXISTS update_maintenance_tasks_updated_at()');

    await queryRunner.query(
      'DROP TRIGGER IF EXISTS trg_project_maintenance_configs_updated_at ON project_maintenance_configs',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS update_project_maintenance_configs_updated_at()',
    );

    // Drop indexes - service_requests
    await queryRunner.dropIndex('service_requests', 'idx_service_requests_priority');
    await queryRunner.dropIndex('service_requests', 'idx_service_requests_status');
    await queryRunner.dropIndex('service_requests', 'idx_service_requests_assigned_to');
    await queryRunner.dropIndex('service_requests', 'idx_service_requests_customer');
    await queryRunner.dropIndex('service_requests', 'idx_service_requests_project');

    // Drop indexes - maintenance_tasks
    await queryRunner.dropIndex('maintenance_tasks', 'idx_maintenance_tasks_scheduled');
    await queryRunner.dropIndex('maintenance_tasks', 'idx_maintenance_tasks_status');
    await queryRunner.dropIndex('maintenance_tasks', 'idx_maintenance_tasks_assigned_to');
    await queryRunner.dropIndex('maintenance_tasks', 'idx_maintenance_tasks_config');
    await queryRunner.dropIndex('maintenance_tasks', 'idx_maintenance_tasks_project');

    // Drop indexes - project_maintenance_configs
    await queryRunner.dropIndex('project_maintenance_configs', 'idx_maintenance_configs_next_due');
    await queryRunner.dropIndex('project_maintenance_configs', 'idx_maintenance_configs_project');

    // Drop tables
    await queryRunner.dropTable('service_requests');
    await queryRunner.dropTable('maintenance_tasks');
    await queryRunner.dropTable('project_maintenance_configs');
  }
}
