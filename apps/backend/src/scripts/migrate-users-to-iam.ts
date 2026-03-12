import type { DataSource } from 'typeorm';

/**
 * Data Migration: User Roles to IAM
 *
 * Migrates existing users from enum-based roles to new IAM role_id system
 *
 * Steps:
 * 1. Find all user_roles with old enum 'role' column
 * 2. Map enum values to new IAM roles
 * 3. Update user_roles.role_id with corresponding IAM role
 * 4. Verify all users have been migrated
 *
 * Mapping:
 * - SUPER_ADMIN → super_admin role
 * - ADMIN → admin role
 * - MANAGER → manager role
 * - SALES → sales role
 * - ACCOUNTANT → sales role (fallback)
 * - SUPPORT → sales role (fallback)
 *
 * Run manually: npm run migrate:users-to-iam
 */

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

export async function migrateUsersToIAM(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    await queryRunner.startTransaction();

    console.log('🔄 Starting User Roles → IAM migration...');
    console.log('');

    // ===========================================================================
    // 1. CHECK IF OLD ROLE COLUMN EXISTS
    // ===========================================================================
    const columnCheck = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' AND column_name = 'role';
    `);

    if (!columnCheck || columnCheck.length === 0) {
      console.log('ℹ️  Old "role" enum column not found. Migration may have already run.');
      console.log('✅ Nothing to migrate.');
      await queryRunner.commitTransaction();
      return;
    }

    // ===========================================================================
    // 2. GET ALL USER ROLES WITH OLD ENUM
    // ===========================================================================
    const userRoles = await queryRunner.query(`
      SELECT 
        id, 
        user_id, 
        organization_id, 
        role AS old_role,
        role_id
      FROM user_roles
      WHERE role_id IS NULL;
    `);

    stats.total = userRoles.length;
    console.log(`📋 Found ${stats.total} user roles to migrate`);

    if (stats.total === 0) {
      console.log('✅ All users already migrated!');
      await queryRunner.commitTransaction();
      return;
    }

    // ===========================================================================
    // 3. GET IAM ROLES BY ORGANIZATION
    // ===========================================================================
    console.log('📋 Loading IAM roles...');

    const iamRoles = await queryRunner.query(`
      SELECT id, organization_id, code 
      FROM roles 
      WHERE deleted_at IS NULL;
    `);

    // Create a lookup map: organizationId → roleCode → roleId
    const roleMap: Record<string, Record<string, string>> = {};
    iamRoles.forEach((role: { organization_id: string; code: string; id: string }) => {
      if (!roleMap[role.organization_id]) {
        roleMap[role.organization_id] = {};
      }
      // TypeScript doesn't track that we just initialized it, so use non-null assertion
      roleMap[role.organization_id]![role.code] = role.id;
    });

    console.log(`✅ Loaded ${iamRoles.length} IAM roles`);
    console.log('');

    // ===========================================================================
    // 4. MIGRATE USER ROLES
    // ===========================================================================
    console.log('🔄 Migrating users...');
    console.log('');

    for (const userRole of userRoles) {
      try {
        const oldRole = userRole.old_role?.toUpperCase();
        const orgId = userRole.organization_id;

        if (!oldRole) {
          console.log(`⚠️  User ${userRole.user_id}: No old role, skipping`);
          stats.skipped++;
          continue;
        }

        // Map old enum to new role code
        const roleCodeMap: Record<string, string> = {
          SUPER_ADMIN: 'super_admin',
          ADMIN: 'admin',
          MANAGER: 'manager',
          SALES: 'sales',
          ACCOUNTANT: 'sales', // Fallback
          SUPPORT: 'sales', // Fallback
        };

        const newRoleCode = roleCodeMap[oldRole];
        if (!newRoleCode) {
          console.log(`⚠️  User ${userRole.user_id}: Unknown role "${oldRole}", skipping`);
          stats.skipped++;
          continue;
        }

        // Get IAM role ID for this organization
        const orgRoles = roleMap[orgId];
        if (!orgRoles) {
          console.log(`❌ User ${userRole.user_id}: No IAM roles found for organization ${orgId}`);
          stats.errors++;
          continue;
        }

        const newRoleId = orgRoles[newRoleCode];
        if (!newRoleId) {
          console.log(
            `❌ User ${userRole.user_id}: Role "${newRoleCode}" not found in organization`,
          );
          stats.errors++;
          continue;
        }

        // Update user_role with new role_id
        await queryRunner.query(
          `
          UPDATE user_roles
          SET role_id = $1
          WHERE id = $2;
        `,
          [newRoleId, userRole.id],
        );

        console.log(`✅ User ${userRole.user_id}: ${oldRole} → ${newRoleCode}`);
        stats.migrated++;
      } catch (error) {
        console.error(`❌ Error migrating user ${userRole.user_id}:`, error);
        stats.errors++;
      }
    }

    // ===========================================================================
    // 5. SUMMARY
    // ===========================================================================
    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`  Total:    ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated}`);
    console.log(`  Skipped:  ${stats.skipped}`);
    console.log(`  Errors:   ${stats.errors}`);
    console.log('');

    if (stats.errors > 0) {
      throw new Error(`Migration completed with ${stats.errors} errors`);
    }

    await queryRunner.commitTransaction();
    console.log('✅ User Roles → IAM migration completed successfully!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('  1. Verify users can log in with new permissions');
    console.log('  2. Test Customer module endpoints');
    console.log('  3. If all works, you can DROP the old "role" enum column (manual step)');
    console.log('');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Main execution function
 * Note: To run this migration, use a separate runner script or call this function
 * from your migration system. Direct execution with require.main pattern has been
 * removed to comply with TypeScript best practices.
 *
 * Example usage:
 * ```
 * import { DataSource } from 'typeorm';
 * import { migrateUsersToIAM } from './migrate-users-to-iam';
 *
 * const dataSource = new DataSource(config);
 * await dataSource.initialize();
 * await migrateUsersToIAM(dataSource);
 * await dataSource.destroy();
 * ```
 */
