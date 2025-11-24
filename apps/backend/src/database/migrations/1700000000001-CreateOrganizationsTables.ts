import {
  type MigrationInterface,
  type QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Migration: Create Organizations and Organization Settings Tables
 * Module: Organizations (Module 1)
 */
export class CreateOrganizationsTables1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create organizations table
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            default: "'India'",
          },
          {
            name: 'pincode',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'gstin',
            type: 'varchar',
            length: '15',
            isNullable: true,
          },
          {
            name: 'pan',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '70',
            default: "'Asia/Kolkata'",
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'INR'",
          },
          {
            name: 'date_format',
            type: 'varchar',
            length: '20',
            default: "'DD-MM-YYYY'",
          },
          {
            name: 'default_project_timeline_weeks',
            type: 'int',
            default: 4,
          },
          {
            name: 'default_quote_validity_days',
            type: 'int',
            default: 30,
          },
          {
            name: 'max_quote_versions',
            type: 'int',
            default: 3,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
          },
          {
            name: 'subscription_plan',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'subscription_expires_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
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
      }),
      true,
    );

    // Create indexes for organizations table
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_code',
        columnNames: ['code'],
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_status',
        columnNames: ['status', 'deleted_at'],
      }),
    );

    // Create organization_settings table
    await queryRunner.createTable(
      new Table({
        name: 'organization_settings',
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
            name: 'key',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'data_type',
            type: 'varchar',
            length: '20',
            default: "'string'",
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
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
      }),
      true,
    );

    // Create indexes for organization_settings table
    await queryRunner.createIndex(
      'organization_settings',
      new TableIndex({
        name: 'idx_organization_settings_org',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'organization_settings',
      new TableIndex({
        name: 'idx_organization_settings_category',
        columnNames: ['category'],
      }),
    );

    // Create unique constraint for organization_id + key
    await queryRunner.createIndex(
      'organization_settings',
      new TableIndex({
        name: 'uq_organization_settings_org_key',
        columnNames: ['organization_id', 'key'],
        isUnique: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'organization_settings',
      new TableForeignKey({
        name: 'fk_organization_settings_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'organization_settings',
      'fk_organization_settings_organization',
    );

    // Drop indexes
    await queryRunner.dropIndex('organization_settings', 'uq_organization_settings_org_key');
    await queryRunner.dropIndex('organization_settings', 'idx_organization_settings_category');
    await queryRunner.dropIndex('organization_settings', 'idx_organization_settings_org');
    await queryRunner.dropIndex('organizations', 'idx_organizations_status');
    await queryRunner.dropIndex('organizations', 'idx_organizations_code');

    // Drop tables
    await queryRunner.dropTable('organization_settings');
    await queryRunner.dropTable('organizations');
  }
}
