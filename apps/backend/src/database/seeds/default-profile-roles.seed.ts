import { DataSource } from 'typeorm';

/**
 * Seed Default Profile Roles
 * Creates default roles for Customer, Reseller, and Employee profiles
 * with appropriate permissions for self-service operations
 */
export async function seedDefaultProfileRoles(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    console.error('\n🎭 ========================================');
    console.error('   SEEDING DEFAULT PROFILE ROLES');
    console.error('========================================\n');

    // Get organization ID
    const orgResult = await queryRunner.query(`
      SELECT id, name FROM organizations LIMIT 1;
    `);

    if (!orgResult || orgResult.length === 0) {
      throw new Error('No organization found. Please create an organization first.');
    }

    const organizationId = orgResult[0].id;
    const organizationName = orgResult[0].name;
    console.error(`📍 Using organization: ${organizationName} (${organizationId})\n`);

    // ===========================================================================
    // 1. GET OR CREATE FEATURES
    // ===========================================================================
    console.error('📦 Ensuring features exist...');

    const features = [
      { code: 'customers', name: 'Customer Management' },
      { code: 'resellers', name: 'Reseller Management' },
      { code: 'profile', name: 'User Profile' },
    ];

    const featureIds: Record<string, string> = {};

    for (const feature of features) {
      const result = await queryRunner.query(
        `
        INSERT INTO features (
          name, code, description, icon, display_order,
          feature_type, is_active, is_system_feature, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'user', 10, 'module', TRUE, FALSE,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name
        RETURNING id;
      `,
        [feature.name, feature.code, `${feature.name} feature`],
      );
      featureIds[feature.code] = result[0].id;
      console.error(`✅ Feature: ${feature.code}`);
    }

    // ===========================================================================
    // 2. CREATE PERMISSIONS
    // ===========================================================================
    console.error('\n📋 Creating default permissions...');

    const permissions = [
      // Customer permissions (read/update own profile)
      {
        featureCode: 'customers',
        name: 'Read Own Customer Profile',
        code: 'customers:read:own',
        action: 'read',
        scope: 'own',
        level: 'basic',
      },
      {
        featureCode: 'customers',
        name: 'Update Own Customer Profile',
        code: 'customers:update:own',
        action: 'update',
        scope: 'own',
        level: 'basic',
      },
      // Reseller permissions (read/update own profile)
      {
        featureCode: 'resellers',
        name: 'Read Own Reseller Profile',
        code: 'resellers:read:own',
        action: 'read',
        scope: 'own',
        level: 'basic',
      },
      {
        featureCode: 'resellers',
        name: 'Update Own Reseller Profile',
        code: 'resellers:update:own',
        action: 'update',
        scope: 'own',
        level: 'basic',
      },
      // Profile permissions (all users)
      {
        featureCode: 'profile',
        name: 'Read Own Profile',
        code: 'profile:read:own',
        action: 'read',
        scope: 'own',
        level: 'basic',
      },
      {
        featureCode: 'profile',
        name: 'Update Own Profile',
        code: 'profile:update:own',
        action: 'update',
        scope: 'own',
        level: 'basic',
      },
    ];

    const permissionIds: Record<string, string> = {};

    for (const perm of permissions) {
      const result = await queryRunner.query(
        `
        INSERT INTO permissions (
          feature_id, name, code, description, action, scope,
          permission_level, show_in_menu, is_active, is_system_permission,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, FALSE, TRUE, FALSE,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id;
      `,
        [
          featureIds[perm.featureCode],
          perm.name,
          perm.code,
          `${perm.name} - Self-service permission`,
          perm.action,
          perm.scope,
          perm.level,
        ],
      );

      permissionIds[perm.code] = result[0].id;
      console.error(`✅ Permission: ${perm.code}`);
    }

    // ===========================================================================
    // 3. CREATE DEFAULT ROLES
    // ===========================================================================
    console.error('\n👥 Creating default profile roles...');

    const roles = [
      {
        code: 'customer',
        name: 'Customer',
        description: 'Default role for customer profiles - can view and update own profile',
        permissions: [
          'customers:read:own',
          'customers:update:own',
          'profile:read:own',
          'profile:update:own',
        ],
      },
      {
        code: 'reseller',
        name: 'Reseller',
        description: 'Default role for reseller profiles - can view and update own profile',
        permissions: [
          'resellers:read:own',
          'resellers:update:own',
          'profile:read:own',
          'profile:update:own',
        ],
      },
      {
        code: 'employee_basic',
        name: 'Employee (Basic)',
        description: 'Default role for employee profiles - basic access',
        permissions: ['profile:read:own', 'profile:update:own'],
      },
    ];

    const roleIds: Record<string, string> = {};

    for (const role of roles) {
      // Create role
      const roleResult = await queryRunner.query(
        `
        INSERT INTO roles (
          organization_id, code, name, description,
          level, is_system_role, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 0, FALSE,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id;
      `,
        [organizationId, role.code, role.name, role.description],
      );

      roleIds[role.code] = roleResult[0].id;
      console.error(`✅ Role: ${role.name} (${role.code})`);

      // Assign permissions to role
      for (const permCode of role.permissions) {
        await queryRunner.query(
          `
          INSERT INTO role_permissions (role_id, permission_id, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (role_id, permission_id) DO NOTHING;
        `,
          [roleIds[role.code], permissionIds[permCode]],
        );
        console.error(`   ↳ Permission: ${permCode}`);
      }
    }

    await queryRunner.commitTransaction();

    console.error('\n✅ ========================================');
    console.error('   DEFAULT PROFILE ROLES SEEDED!');
    console.error('========================================\n');
    console.error('📊 Summary:');
    console.error(`   - Features: ${features.length}`);
    console.error(`   - Permissions: ${permissions.length}`);
    console.error(`   - Roles: ${roles.length}`);
    console.error(`   - Organization: ${organizationName}\n`);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('\n❌ Error seeding default profile roles:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
