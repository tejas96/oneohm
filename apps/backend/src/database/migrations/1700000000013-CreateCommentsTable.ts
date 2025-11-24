import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Create Comments Table
 * Schema Reference: Lines 1004-1040
 * Module: Comments System (Universal commenting across all entities)
 */
export class CreateCommentsTable1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // COMMENTS TABLE
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'comments',
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
          // POLYMORPHIC REFERENCE
          // ============================================
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'entity_id',
            type: 'uuid',
            isNullable: false,
          },

          // ============================================
          // COMMENT CONTENT
          // ============================================
          {
            name: 'comment_text',
            type: 'text',
            isNullable: false,
          },

          // ============================================
          // THREADING SUPPORT
          // ============================================
          {
            name: 'parent_comment_id',
            type: 'uuid',
            isNullable: true,
          },

          // ============================================
          // MENTIONS
          // ============================================
          {
            name: 'mentioned_user_ids',
            type: 'uuid',
            isArray: true,
            isNullable: true,
          },

          // ============================================
          // ATTACHMENTS
          // ============================================
          {
            name: 'attachments',
            type: 'jsonb',
            isNullable: true,
          },

          // ============================================
          // VISIBILITY
          // ============================================
          {
            name: 'is_internal',
            type: 'boolean',
            default: true,
          },

          // ============================================
          // EDIT TRACKING
          // ============================================
          {
            name: 'is_edited',
            type: 'boolean',
            default: false,
          },
          {
            name: 'edited_at',
            type: 'timestamptz',
            isNullable: true,
          },

          // ============================================
          // AUDIT FIELDS
          // ============================================
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamptz',
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
            columnNames: ['parent_comment_id'],
            referencedTableName: 'comments',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
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
    // INDEXES
    // ============================================
    await queryRunner.createIndex(
      'comments',
      new TableIndex({
        name: 'idx_comments_entity',
        columnNames: ['entity_type', 'entity_id'],
        where: 'deleted_at IS NULL',
      }),
    );

    await queryRunner.createIndex(
      'comments',
      new TableIndex({
        name: 'idx_comments_created_by',
        columnNames: ['created_by'],
      }),
    );

    await queryRunner.createIndex(
      'comments',
      new TableIndex({
        name: 'idx_comments_parent',
        columnNames: ['parent_comment_id'],
      }),
    );

    await queryRunner.createIndex(
      'comments',
      new TableIndex({
        name: 'idx_comments_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('comments', 'idx_comments_created_at');
    await queryRunner.dropIndex('comments', 'idx_comments_parent');
    await queryRunner.dropIndex('comments', 'idx_comments_created_by');
    await queryRunner.dropIndex('comments', 'idx_comments_entity');

    // Drop table
    await queryRunner.dropTable('comments');
  }
}
