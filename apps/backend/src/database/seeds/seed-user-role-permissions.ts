/**
 * Seed IAM User Role Permissions
 *
 * Creates permissions for managing user-role assignments:
 * - iam:user-roles:read - View user role assignments
 * - iam:user-roles:assign - Assign roles to users
 * - iam:user-roles:remove - Remove role assignments
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seeds/seed-user-role-permissions.ts
 */

/* eslint-disable no-console */
import { DataSource } from 'typeorm';

import dataSource from '../ormconfig';

async function seedUserRolePermissions(ds: DataSource): Promise<void> {
  const queryRunner = ds.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    console.log('\n🔧 ========================================');
    console.log('   SEEDING IAM USER-ROLE PERMISSIONS');
    console.log('========================================\n');

    // ===========================================================================
    // 1. ENSURE IAM FEATURE EXISTS
    // ===========================================================================
    console.log('📦 Ensuring IAM feature exists...');
    const featureResult = await queryRunner.query(`
      INSERT INTO features (
        code, name, description, feature_type, is_active, is_system_feature,
        created_at, updated_at
      ) VALUES (
        'iam', 'Identity & Access Management', 'Manage roles, permissions, and user access',
        'module', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
      RETURNING id, code, name
    `);

    const iamFeature = featureResult[0];
    console.log(`✅ IAM feature: ${iamFeature.name} (${iamFeature.id})`);

    // ===========================================================================
    // 2. CREATE USER-ROLE PERMISSIONS
    // ===========================================================================
    console.log('\n🔐 Creating user-role permissions...');

    const permissions = [
      {
        name: 'View User Role Assignments',
        code: 'iam:user-roles:read',
        action: 'read',
        scope: 'all',
        level: 'standard',
        description: 'View which roles are assigned to users',
        showInMenu: false,
      },
      {
        name: 'Assign Roles to Users',
        code: 'iam:user-roles:assign',
        action: 'create',
        scope: 'all',
        level: 'admin',
        description: 'Assign IAM roles to users in an organization',
        showInMenu: false,
      },
      {
        name: 'Remove User Role Assignments',
        code: 'iam:user-roles:remove',
        action: 'delete',
        scope: 'all',
        level: 'admin',
        description: 'Remove role assignments from users',
        showInMenu: false,
      },
    ];

    const createdPermissions: { id: string; code: string }[] = [];

    for (const perm of permissions) {
      const result = await queryRunner.query(
        `
        INSERT INTO permissions (
          feature_id, name, code, description, action, scope,
          permission_level, show_in_menu, is_active, is_system_permission,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, true, true,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id, code
      `,
        [
          iamFeature.id,
          perm.name,
          perm.code,
          perm.description,
          perm.action,
          perm.scope,
          perm.level,
          perm.showInMenu,
        ],
      );

      createdPermissions.push(result[0]);
      console.log(`✅ Created permission: ${perm.code}`);
    }

    // ===========================================================================
    // 3. SUMMARY
    // ===========================================================================
    await queryRunner.commitTransaction();

    console.log('\n🎉 ========================================');
    console.log('   SUCCESS! User-Role Permissions Created');
    console.log('========================================');
    console.log('\nCreated permissions:');
    for (const p of createdPermissions) {
      console.log(`  - ${p.code} (${p.id})`);
    }
    console.log('\n📝 Note: These permissions need to be manually assigned to admin roles.');
    console.log('   Use the IAM API or database to assign to super_admin/admin roles.\n');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting user-role permissions seed...\n');

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    await seedUserRolePermissions(dataSource);

    await dataSource.destroy();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

void main();
