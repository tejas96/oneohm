import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Enhance User Roles Indexes
 *
 * Adds additional indexes to user_roles table for:
 * 1. Fast org-scoped user queries: (user_id, organization_id)
 * 2. Unique constraint for legacy role column with org: (user_id, role, organization_id)
 *
 * These complement the existing indexes from migration 024:
 * - idx_user_roles_organization_id
 * - idx_user_roles_user_org_role (on role_id)
 */
export class EnhanceUserRolesIndexes1700000000026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Add composite index for user + org queries
    // ============================================
    // Used by: findByUserAndOrganization(), hasRoleInOrganization()
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_org 
      ON user_roles(user_id, organization_id);
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_user_roles_user_org IS 
      'Fast lookup for user roles within a specific organization';
    `);

    // ============================================
    // 2. Add unique constraint for legacy role string + org
    // ============================================
    // This ensures backward compatibility with the old enum-based role system
    // while supporting multi-tenant role assignments
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role_org
      ON user_roles(
        user_id, 
        role, 
        COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
      WHERE role IS NOT NULL;
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_user_roles_user_role_org IS 
      'Unique constraint for legacy role column (string-based) with org context. NULL org uses placeholder UUID.';
    `);

    // ============================================
    // 3. Add index for role_id + org queries (IAM system)
    // ============================================
    // Used for: "Find all users with role X in organization Y"
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_org 
      ON user_roles(role_id, organization_id)
      WHERE role_id IS NOT NULL;
    `);

    await queryRunner.query(`
      COMMENT ON INDEX idx_user_roles_role_org IS 
      'Fast lookup for all users with a specific IAM role in an organization';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_roles_role_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_roles_user_role_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_roles_user_org;`);
  }
}
