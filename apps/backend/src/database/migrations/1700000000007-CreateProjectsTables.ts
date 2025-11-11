import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Migration: Create Projects Tables
 * Creates tables for project management, milestones, site surveys, and material tracking
 */
export class CreateProjectsTables1700000000007 implements MigrationInterface {
  name = 'CreateProjectsTables1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================================
    // 1. PROJECTS TABLE
    // =====================================================
    await queryRunner.createTable(
      new Table({
        name: 'projects',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_number',
            type: 'varchar',
            length: '50',
            isUnique: true,
            comment: 'Auto-generated project number (e.g., PRJ-ORG-YEAR-SEQ)',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: 'Project name/title',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Project description',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            comment: 'Organization that owns this project',
          },
          {
            name: 'quote_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Source quote for this project',
          },
          {
            name: 'customer_id',
            type: 'uuid',
            comment: 'Customer for this project',
          },
          {
            name: 'site_address',
            type: 'text',
            comment: 'Installation site address',
          },
          {
            name: 'site_coordinates',
            type: 'jsonb',
            isNullable: true,
            comment: 'GPS coordinates: {latitude, longitude}',
          },
          {
            name: 'system_size_kw',
            type: 'decimal',
            precision: 10,
            scale: 2,
            comment: 'System size in kW',
          },
          {
            name: 'project_type',
            type: 'varchar',
            length: '50',
            comment: 'Type: residential, commercial, industrial',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'draft'",
            comment:
              'Status: draft, planning, approved, in_progress, testing, completed, cancelled',
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: "'normal'",
            comment: 'Priority: low, normal, high, urgent',
          },
          {
            name: 'progress_percentage',
            type: 'int',
            default: 0,
            comment: 'Overall project completion percentage (0-100)',
          },
          {
            name: 'planned_start_date',
            type: 'date',
            isNullable: true,
            comment: 'Planned start date',
          },
          {
            name: 'planned_end_date',
            type: 'date',
            isNullable: true,
            comment: 'Planned end date',
          },
          {
            name: 'actual_start_date',
            type: 'date',
            isNullable: true,
            comment: 'Actual start date',
          },
          {
            name: 'actual_end_date',
            type: 'date',
            isNullable: true,
            comment: 'Actual end date',
          },
          {
            name: 'project_manager_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Assigned project manager',
          },
          {
            name: 'lead_technician_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Lead technician for installation',
          },
          {
            name: 'estimated_cost',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
            comment: 'Estimated project cost',
          },
          {
            name: 'actual_cost',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
            comment: 'Actual project cost',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
            comment: 'Additional notes',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Additional metadata',
          },
          {
            name: 'created_by',
            type: 'uuid',
            comment: 'User who created the project',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add check constraint for status
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "chk_projects_status" 
      CHECK (status IN ('draft', 'planning', 'approved', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold'))
    `);

    // Add check constraint for priority
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "chk_projects_priority" 
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
    `);

    // Add check constraint for project_type
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "chk_projects_type" 
      CHECK (project_type IN ('residential', 'commercial', 'industrial'))
    `);

    // Add check constraint for progress percentage
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "chk_projects_progress" 
      CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
    `);

    // =====================================================
    // 2. PROJECT MILESTONES TABLE
    // =====================================================
    await queryRunner.createTable(
      new Table({
        name: 'project_milestones',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_id',
            type: 'uuid',
            comment: 'Associated project',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: 'Milestone name',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Milestone description',
          },
          {
            name: 'milestone_type',
            type: 'varchar',
            length: '50',
            comment:
              'Type: site_survey, design, approval, material_procurement, installation, testing, commissioning, handover',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
            comment: 'Status: pending, in_progress, completed, skipped, blocked',
          },
          {
            name: 'sequence_order',
            type: 'int',
            comment: 'Order of milestone in workflow',
          },
          {
            name: 'planned_start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'planned_end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'actual_start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'actual_end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'progress_percentage',
            type: 'int',
            default: 0,
            comment: 'Milestone completion percentage (0-100)',
          },
          {
            name: 'assigned_to',
            type: 'uuid',
            isNullable: true,
            comment: 'User assigned to this milestone',
          },
          {
            name: 'dependencies',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of milestone IDs that must be completed first',
          },
          {
            name: 'deliverables',
            type: 'jsonb',
            isNullable: true,
            comment: 'Expected deliverables for this milestone',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add check constraint for milestone status
    await queryRunner.query(`
      ALTER TABLE "project_milestones" 
      ADD CONSTRAINT "chk_milestones_status" 
      CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked'))
    `);

    // Add check constraint for progress percentage
    await queryRunner.query(`
      ALTER TABLE "project_milestones" 
      ADD CONSTRAINT "chk_milestones_progress" 
      CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
    `);

    // =====================================================
    // 3. SITE SURVEYS TABLE
    // =====================================================
    await queryRunner.createTable(
      new Table({
        name: 'site_surveys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_id',
            type: 'uuid',
            comment: 'Associated project',
          },
          {
            name: 'surveyor_id',
            type: 'uuid',
            isNullable: true,
            comment: 'User who conducted the survey',
          },
          {
            name: 'survey_date',
            type: 'timestamp',
            comment: 'Date and time of survey',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'scheduled'",
            comment: 'Status: scheduled, in_progress, completed, cancelled',
          },
          {
            name: 'roof_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Type of roof',
          },
          {
            name: 'roof_condition',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Condition: excellent, good, fair, poor',
          },
          {
            name: 'roof_orientation',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Orientation: north, south, east, west',
          },
          {
            name: 'roof_tilt_angle',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            comment: 'Roof tilt angle in degrees',
          },
          {
            name: 'available_area_sqm',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: 'Available area in square meters',
          },
          {
            name: 'shading_analysis',
            type: 'jsonb',
            isNullable: true,
            comment: 'Shading analysis results',
          },
          {
            name: 'electrical_details',
            type: 'jsonb',
            isNullable: true,
            comment: 'Electrical system details (panel, voltage, etc.)',
          },
          {
            name: 'structural_assessment',
            type: 'text',
            isNullable: true,
            comment: 'Structural assessment notes',
          },
          {
            name: 'site_access',
            type: 'text',
            isNullable: true,
            comment: 'Site access notes',
          },
          {
            name: 'safety_concerns',
            type: 'text',
            isNullable: true,
            comment: 'Safety concerns identified',
          },
          {
            name: 'recommendations',
            type: 'text',
            isNullable: true,
            comment: 'Surveyor recommendations',
          },
          {
            name: 'photos',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of photo URLs',
          },
          {
            name: 'documents',
            type: 'jsonb',
            isNullable: true,
            comment: 'Array of document URLs',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add check constraint for survey status
    await queryRunner.query(`
      ALTER TABLE "site_surveys" 
      ADD CONSTRAINT "chk_surveys_status" 
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
    `);

    // =====================================================
    // 4. PROJECT MATERIALS TABLE
    // =====================================================
    await queryRunner.createTable(
      new Table({
        name: 'project_materials',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_id',
            type: 'uuid',
            comment: 'Associated project',
          },
          {
            name: 'product_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Product from catalog',
          },
          {
            name: 'material_name',
            type: 'varchar',
            length: '255',
            comment: 'Material/product name',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Material category',
          },
          {
            name: 'quantity_required',
            type: 'decimal',
            precision: 10,
            scale: 2,
            comment: 'Required quantity',
          },
          {
            name: 'quantity_allocated',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            comment: 'Allocated quantity',
          },
          {
            name: 'quantity_used',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            comment: 'Used quantity',
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '50',
            comment: 'Unit of measurement',
          },
          {
            name: 'unit_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: 'Unit cost',
          },
          {
            name: 'total_cost',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
            comment: 'Total cost (quantity * unit_cost)',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'required'",
            comment: 'Status: required, ordered, in_transit, allocated, used',
          },
          {
            name: 'procurement_date',
            type: 'date',
            isNullable: true,
            comment: 'Date material was procured',
          },
          {
            name: 'allocation_date',
            type: 'date',
            isNullable: true,
            comment: 'Date material was allocated to project',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Add check constraint for material status
    await queryRunner.query(`
      ALTER TABLE "project_materials" 
      ADD CONSTRAINT "chk_materials_status" 
      CHECK (status IN ('required', 'ordered', 'in_transit', 'allocated', 'used'))
    `);

    // =====================================================
    // 5. FOREIGN KEYS
    // =====================================================

    // Projects foreign keys
    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_quote',
        columnNames: ['quote_id'],
        referencedTableName: 'quotes',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_customer',
        columnNames: ['customer_id'],
        referencedTableName: 'customers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_project_manager',
        columnNames: ['project_manager_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_lead_technician',
        columnNames: ['lead_technician_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Project milestones foreign keys
    await queryRunner.createForeignKey(
      'project_milestones',
      new TableForeignKey({
        name: 'FK_milestones_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'project_milestones',
      new TableForeignKey({
        name: 'FK_milestones_assigned_to',
        columnNames: ['assigned_to'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Site surveys foreign keys
    await queryRunner.createForeignKey(
      'site_surveys',
      new TableForeignKey({
        name: 'FK_surveys_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'site_surveys',
      new TableForeignKey({
        name: 'FK_surveys_surveyor',
        columnNames: ['surveyor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Project materials foreign keys
    await queryRunner.createForeignKey(
      'project_materials',
      new TableForeignKey({
        name: 'FK_materials_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'project_materials',
      new TableForeignKey({
        name: 'FK_materials_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // =====================================================
    // 6. INDEXES
    // =====================================================

    // Projects indexes
    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'idx_projects_organization',
        columnNames: ['organization_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'idx_projects_quote',
        columnNames: ['quote_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'idx_projects_customer',
        columnNames: ['customer_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'idx_projects_status',
        columnNames: ['status'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'idx_projects_project_manager',
        columnNames: ['project_manager_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'idx_projects_dates',
        columnNames: ['planned_start_date', 'planned_end_date'],
        where: 'deleted_at IS NULL',
      }),
    );

    // Project milestones indexes
    await queryRunner.createIndex(
      'project_milestones',
      new TableIndex({
        name: 'idx_milestones_project',
        columnNames: ['project_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'project_milestones',
      new TableIndex({
        name: 'idx_milestones_status',
        columnNames: ['status'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'project_milestones',
      new TableIndex({
        name: 'idx_milestones_sequence',
        columnNames: ['project_id', 'sequence_order'],
        where: 'deleted_at IS NULL',
      }),
    );

    // Site surveys indexes
    await queryRunner.createIndex(
      'site_surveys',
      new TableIndex({
        name: 'idx_surveys_project',
        columnNames: ['project_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'site_surveys',
      new TableIndex({
        name: 'idx_surveys_date',
        columnNames: ['survey_date'],
        where: 'deleted_at IS NULL',
      }),
    );

    // Project materials indexes
    await queryRunner.createIndex(
      'project_materials',
      new TableIndex({
        name: 'idx_materials_project',
        columnNames: ['project_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'project_materials',
      new TableIndex({
        name: 'idx_materials_status',
        columnNames: ['status'],
        where: 'deleted_at IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('project_materials', 'idx_materials_status');
    await queryRunner.dropIndex('project_materials', 'idx_materials_project');
    await queryRunner.dropIndex('site_surveys', 'idx_surveys_date');
    await queryRunner.dropIndex('site_surveys', 'idx_surveys_project');
    await queryRunner.dropIndex('project_milestones', 'idx_milestones_sequence');
    await queryRunner.dropIndex('project_milestones', 'idx_milestones_status');
    await queryRunner.dropIndex('project_milestones', 'idx_milestones_project');
    await queryRunner.dropIndex('projects', 'idx_projects_dates');
    await queryRunner.dropIndex('projects', 'idx_projects_project_manager');
    await queryRunner.dropIndex('projects', 'idx_projects_status');
    await queryRunner.dropIndex('projects', 'idx_projects_customer');
    await queryRunner.dropIndex('projects', 'idx_projects_quote');
    await queryRunner.dropIndex('projects', 'idx_projects_organization');

    // Drop foreign keys
    await queryRunner.dropForeignKey('project_materials', 'FK_materials_product');
    await queryRunner.dropForeignKey('project_materials', 'FK_materials_project');
    await queryRunner.dropForeignKey('site_surveys', 'FK_surveys_surveyor');
    await queryRunner.dropForeignKey('site_surveys', 'FK_surveys_project');
    await queryRunner.dropForeignKey('project_milestones', 'FK_milestones_assigned_to');
    await queryRunner.dropForeignKey('project_milestones', 'FK_milestones_project');
    await queryRunner.dropForeignKey('projects', 'FK_projects_created_by');
    await queryRunner.dropForeignKey('projects', 'FK_projects_lead_technician');
    await queryRunner.dropForeignKey('projects', 'FK_projects_project_manager');
    await queryRunner.dropForeignKey('projects', 'FK_projects_customer');
    await queryRunner.dropForeignKey('projects', 'FK_projects_quote');
    await queryRunner.dropForeignKey('projects', 'FK_projects_organization');

    // Drop tables
    await queryRunner.dropTable('project_materials', true);
    await queryRunner.dropTable('site_surveys', true);
    await queryRunner.dropTable('project_milestones', true);
    await queryRunner.dropTable('projects', true);
  }
}
