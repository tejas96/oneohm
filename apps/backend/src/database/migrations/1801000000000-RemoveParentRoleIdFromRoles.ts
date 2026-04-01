import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Remove parent_role_id from Roles Table
 *
 * The role-hierarchy feature (parentRoleId self-reference) was never used in
 * the application. This migration cleans the DB to match the current entity:
 *
 * Removes:
 *   - FK constraint  fk_roles_parent  (roles.parent_role_id → roles.id)
 *   - Index          idx_roles_parent (parent_role_id WHERE deleted_at IS NULL)
 *   - Column         parent_role_id   uuid nullable
 *
 * Safe to run: all 21 rows have parent_role_id = NULL (verified before migration).
 */
export class RemoveParentRoleIdFromRoles1801000000000
  implements MigrationInterface
{
  name = 'RemoveParentRoleIdFromRoles1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the self-referential FK constraint
    await queryRunner.query(`
      ALTER TABLE "roles"
        DROP CONSTRAINT IF EXISTS "fk_roles_parent"
    `);

    // 2. Drop the index on parent_role_id
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_roles_parent"
    `);

    // 3. Drop the column itself
    await queryRunner.query(`
      ALTER TABLE "roles"
        DROP COLUMN IF EXISTS "parent_role_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-add the column (nullable, so no data loss on rollback)
    await queryRunner.query(`
      ALTER TABLE "roles"
        ADD COLUMN IF NOT EXISTS "parent_role_id" UUID
    `);

    // 2. Recreate the partial index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_roles_parent"
        ON "roles" ("parent_role_id")
        WHERE "deleted_at" IS NULL
    `);

    // 3. Recreate the FK constraint
    await queryRunner.query(`
      ALTER TABLE "roles"
        ADD CONSTRAINT "fk_roles_parent"
          FOREIGN KEY ("parent_role_id")
          REFERENCES "roles" ("id")
          ON DELETE SET NULL
    `);
  }
}
