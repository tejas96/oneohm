import * as bcrypt from 'bcrypt';
import type { DataSource } from 'typeorm';

/**
 * Test Users Seed - IAM System
 *
 * Creates test users with IAM roles:
 * 1. Super Admin - Full IAM + all customer permissions
 * 2. Admin - All customer permissions
 * 3. Manager - Create, Read, Update customers (no delete)
 * 4. Sales - Read customers only
 *
 * Default password for all: Test@123
 *
 * Run: npm run seed:test-users-iam
 */

export async function seedTestUsersIAM(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    console.error('🌱 Starting Test Users IAM seed...');

    // Get first organization (or create test org)
    const orgResult = await queryRunner.query(`
      SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1;
    `);

    if (!orgResult || orgResult.length === 0) {
      throw new Error('No organization found. Please create an organization first.');
    }

    const organizationId = orgResult[0].id;
    console.error(`📋 Using organization: ${organizationId}`);

    // Hash password
    const hashedPassword = await bcrypt.hash('Test@123', 10);

    // ===========================================================================
    // 1. CREATE ROLES
    // ===========================================================================
    console.error('📋 Creating roles...');

    const roles = [
      {
        code: 'super_admin',
        name: 'Super Admin',
        description: 'Full system access including IAM management',
        level: 0,
        isSystem: true,
      },
      {
        code: 'admin',
        name: 'Admin',
        description: 'Full customer management access',
        level: 1,
        isSystem: false,
      },
      {
        code: 'manager',
        name: 'Manager',
        description: 'Can create, read, update customers',
        level: 2,
        isSystem: false,
      },
      {
        code: 'sales',
        name: 'Sales',
        description: 'Can read customers only',
        level: 3,
        isSystem: false,
      },
    ];

    const roleIds: Record<string, string> = {};

    for (const role of roles) {
      const result = await queryRunner.query(
        `
        INSERT INTO roles (
          organization_id, code, name, description, level, is_system_role,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id;
      `,
        [organizationId, role.code, role.name, role.description, role.level, role.isSystem],
      );

      roleIds[role.code] = result[0].id;
      console.error(`✅ Role created: ${role.name} (${result[0].id})`);
    }

    // ===========================================================================
    // 2. GET PERMISSIONS
    // ===========================================================================
    console.error('📋 Getting permissions...');

    const permissionsResult = await queryRunner.query(`
      SELECT id, code FROM permissions 
      WHERE code LIKE 'customers:%' OR code LIKE 'iam:%';
    `);

    const permissionMap: Record<string, string> = {};
    permissionsResult.forEach((p: any) => {
      permissionMap[p.code] = p.id;
    });

    console.error(`✅ Found ${permissionsResult.length} permissions`);

    // ===========================================================================
    // 3. ASSIGN PERMISSIONS TO ROLES
    // ===========================================================================
    console.error('📋 Assigning permissions to roles...');

    // Super Admin - Everything
    const superAdminPermissions = Object.values(permissionMap);
    for (const permId of superAdminPermissions) {
      await queryRunner.query(
        `
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;
      `,
        [roleIds.super_admin, permId],
      );
    }
    console.error(`✅ Super Admin: ${superAdminPermissions.length} permissions`);

    // Admin - All customer permissions
    const adminPermissions = [
      'customers:read',
      'customers:create',
      'customers:update',
      'customers:update-status',
      'customers:delete',
    ];
    for (const code of adminPermissions) {
      if (permissionMap[code]) {
        await queryRunner.query(
          `
          INSERT INTO role_permissions (role_id, permission_id, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT DO NOTHING;
        `,
          [roleIds.admin, permissionMap[code]],
        );
      }
    }
    console.error(`✅ Admin: ${adminPermissions.length} permissions`);

    // Manager - Create, Read, Update customers
    const managerPermissions = [
      'customers:read',
      'customers:create',
      'customers:update',
      'customers:update-status',
    ];
    for (const code of managerPermissions) {
      if (permissionMap[code]) {
        await queryRunner.query(
          `
          INSERT INTO role_permissions (role_id, permission_id, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT DO NOTHING;
        `,
          [roleIds.manager, permissionMap[code]],
        );
      }
    }
    console.error(`✅ Manager: ${managerPermissions.length} permissions`);

    // Sales - Read customers only
    const salesPermissions = ['customers:read'];
    for (const code of salesPermissions) {
      if (permissionMap[code]) {
        await queryRunner.query(
          `
          INSERT INTO role_permissions (role_id, permission_id, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT DO NOTHING;
        `,
          [roleIds.sales, permissionMap[code]],
        );
      }
    }
    console.error(`✅ Sales: ${salesPermissions.length} permissions`);

    // ===========================================================================
    // 4. CREATE TEST USERS
    // ===========================================================================
    console.error('📋 Creating test users...');

    const testUsers = [
      {
        email: 'superadmin@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        roleCode: 'super_admin',
      },
      {
        email: 'admin@test.com',
        firstName: 'Test',
        lastName: 'Admin',
        roleCode: 'admin',
      },
      {
        email: 'manager@test.com',
        firstName: 'Test',
        lastName: 'Manager',
        roleCode: 'manager',
      },
      {
        email: 'sales@test.com',
        firstName: 'Test',
        lastName: 'Sales',
        roleCode: 'sales',
      },
    ];

    for (const testUser of testUsers) {
      // Create or update user
      const userResult = await queryRunner.query(
        `
        INSERT INTO users (
          organization_id, email, first_name, last_name, password_hash, phone,
          status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'active',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          password_hash = EXCLUDED.password_hash
        RETURNING id;
      `,
        [
          organizationId,
          testUser.email,
          testUser.firstName,
          testUser.lastName,
          hashedPassword,
          `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`, // Random phone
        ],
      );

      const userId = userResult[0].id;

      // Assign role to user
      await queryRunner.query(
        `
        INSERT INTO user_roles (
          user_id, role, role_id,
          created_at
        ) VALUES (
          $1, $2, $3,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, role) DO UPDATE SET
          role_id = EXCLUDED.role_id;
      `,
        [
          userId,
          testUser.roleCode, // Old enum column
          roleIds[testUser.roleCode], // New IAM role_id
        ],
      );

      console.error(`✅ User created: ${testUser.email} → ${testUser.roleCode}`);
    }

    await queryRunner.commitTransaction();
    console.error('');
    console.error('✅ Test Users IAM seed completed successfully!');
    console.error('');
    console.error('📝 Test Users:');
    console.error('  • superadmin@test.com (Super Admin - Full access)');
    console.error('  • admin@test.com (Admin - All customer permissions)');
    console.error('  • manager@test.com (Manager - Create/Read/Update customers)');
    console.error('  • sales@test.com (Sales - Read customers only)');
    console.error('');
    console.error('🔑 Password for all: Test@123');
    console.error('');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Export for use in seed runner
 *
 * Example usage:
 * ```
 * import { DataSource } from 'typeorm';
 * import { seedTestUsersIAM } from './test-users-iam.seed';
 *
 * const dataSource = new DataSource(config);
 * await dataSource.initialize();
 * await seedTestUsersIAM(dataSource);
 * await dataSource.destroy();
 * ```
 */
