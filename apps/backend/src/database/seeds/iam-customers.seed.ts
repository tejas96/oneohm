import type { DataSource } from 'typeorm';

/**
 * IAM Seed Data - Customer Module
 * 
 * Populates:
 * 1. Features: customers
 * 2. Permissions: customers:create, customers:read, customers:update, customers:update-status, customers:delete
 * 3. Roles: Admin, Manager, Sales (with appropriate permissions)
 * 
 * Run: npm run seed:iam-customers
 */

export async function seedIAMCustomers(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    console.error('🌱 Starting IAM Customer module seed...');

    // ===========================================================================
    // 1. CREATE FEATURE: Customers
    // ===========================================================================
    console.error('📋 Creating feature: Customers');
    
    const featureResult = await queryRunner.query(`
      INSERT INTO features (
        name, code, description, icon, display_order,
        feature_type, is_active, is_system_feature, created_at, updated_at
      ) VALUES (
        'Customers', 
        'customers', 
        'Customer and lead management module',
        'users',
        1,
        'module',
        TRUE,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
      RETURNING id;
    `);

    const featureId = featureResult[0].id;
    console.error(`✅ Feature created/updated: ${featureId}`);

    // ===========================================================================
    // 2. CREATE PERMISSIONS: customers:*
    // ===========================================================================
    console.error('📋 Creating permissions for Customers');

    const permissions = [
      {
        name: 'Read Customers',
        code: 'customers:read',
        action: 'read',
        scope: 'all',
        level: 'basic',
        description: 'View customer list and details',
      },
      {
        name: 'Create Customers',
        code: 'customers:create',
        action: 'create',
        scope: 'all',
        level: 'standard',
        description: 'Create new customers/leads',
      },
      {
        name: 'Update Customers',
        code: 'customers:update',
        action: 'update',
        scope: 'all',
        level: 'standard',
        description: 'Edit customer information',
      },
      {
        name: 'Update Customer Status',
        code: 'customers:update-status',
        action: 'update',
        scope: 'all',
        level: 'advanced',
        description: 'Change customer status (active, inactive, etc.)',
      },
      {
        name: 'Delete Customers',
        code: 'customers:delete',
        action: 'delete',
        scope: 'all',
        level: 'admin',
        description: 'Soft delete customers',
      },
    ];

    const permissionIds: Record<string, string> = {};

    for (const perm of permissions) {
      const result = await queryRunner.query(`
        INSERT INTO permissions (
          feature_id, name, code, description, action, scope,
          permission_level, show_in_menu, is_active, is_system_permission,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, TRUE,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id;
      `, [
        featureId,
        perm.name,
        perm.code,
        perm.description,
        perm.action,
        perm.scope,
        perm.level,
      ]);

      permissionIds[perm.code] = result[0].id;
      console.error(`✅ Permission: ${perm.code}`);
    }

    // ===========================================================================
    // 3. CREATE IAM ADMIN PERMISSIONS (for managing IAM itself)
    // ===========================================================================
    console.error('📋 Creating IAM admin permissions');

    const iamFeatureResult = await queryRunner.query(`
      INSERT INTO features (
        name, code, description, icon, display_order,
        feature_type, is_active, is_system_feature, created_at, updated_at
      ) VALUES (
        'IAM Management', 
        'iam', 
        'Identity and Access Management - manage roles, permissions, and features',
        'shield',
        99,
        'module',
        TRUE,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
      RETURNING id;
    `);

    const iamFeatureId = iamFeatureResult[0].id;

    const iamPermissions = [
      { name: 'Read Roles', code: 'iam:roles:read', action: 'read' },
      { name: 'Create Roles', code: 'iam:roles:create', action: 'create' },
      { name: 'Update Roles', code: 'iam:roles:update', action: 'update' },
      { name: 'Delete Roles', code: 'iam:roles:delete', action: 'delete' },
      { name: 'Assign Permissions', code: 'iam:roles:assign-permissions', action: 'update' },
      { name: 'Read Permissions', code: 'iam:permissions:read', action: 'read' },
      { name: 'Create Permissions', code: 'iam:permissions:create', action: 'create' },
      { name: 'Update Permissions', code: 'iam:permissions:update', action: 'update' },
      { name: 'Delete Permissions', code: 'iam:permissions:delete', action: 'delete' },
      { name: 'Read Features', code: 'iam:features:read', action: 'read' },
      { name: 'Create Features', code: 'iam:features:create', action: 'create' },
      { name: 'Update Features', code: 'iam:features:update', action: 'update' },
      { name: 'Delete Features', code: 'iam:features:delete', action: 'delete' },
    ];

    for (const perm of iamPermissions) {
      const result = await queryRunner.query(`
        INSERT INTO permissions (
          feature_id, name, code, description, action, scope,
          permission_level, show_in_menu, is_active, is_system_permission,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'all', 'admin', TRUE, TRUE, TRUE,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name
        RETURNING id;
      `, [
        iamFeatureId,
        perm.name,
        perm.code,
        `IAM Admin: ${perm.name}`,
        perm.action,
      ]);

      permissionIds[perm.code] = result[0].id;
      console.error(`✅ IAM Permission: ${perm.code}`);
    }

    // ===========================================================================
    // 4. ASSIGN PERMISSIONS TO ROLES
    // ===========================================================================
    console.error('📋 Assigning permissions to roles');

    // Get organization ID (assuming first organization for now)
    const orgResult = await queryRunner.query(`
      SELECT id FROM organizations LIMIT 1;
    `);
    
    if (!orgResult || orgResult.length === 0) {
      throw new Error('No organization found. Please create an organization first.');
    }
    
    const organizationId = orgResult[0].id;

    // Get all role IDs by code
    const rolesResult = await queryRunner.query(`
      SELECT id, code FROM roles 
      WHERE organization_id = $1;
    `, [organizationId]);
    
    const roleIdsByCode: Record<string, string> = {};
    rolesResult.forEach((r: any) => {
      roleIdsByCode[r.code] = r.id;
    });

    // Define role-permission mappings
    const rolePermissions = [
      // Super Admin - ALL permissions
      {
        roleCode: 'super_admin',
        permissions: [
          ...Object.keys(permissionIds), // All permissions
        ],
      },
      // Admin - All customer + all IAM permissions
      {
        roleCode: 'admin',
        permissions: [
          'customers:read',
          'customers:create',
          'customers:update',
          'customers:update-status',
          'customers:delete',
          'iam:roles:read',
          'iam:roles:create',
          'iam:roles:update',
          'iam:roles:delete',
          'iam:roles:assign-permissions',
          'iam:permissions:read',
          'iam:permissions:create',
          'iam:permissions:update',
          'iam:permissions:delete',
          'iam:features:read',
          'iam:features:create',
          'iam:features:update',
          'iam:features:delete',
        ],
      },
      // Manager - Create, Read, Update customers (no delete)
      {
        roleCode: 'manager',
        permissions: [
          'customers:read',
          'customers:create',
          'customers:update',
        ],
      },
      // Sales - Read customers only
      {
        roleCode: 'sales',
        permissions: [
          'customers:read',
        ],
      },
    ];

    // Insert role-permission assignments
    for (const mapping of rolePermissions) {
      const roleId = roleIdsByCode[mapping.roleCode];
      
      if (!roleId) {
        console.error(`⚠️  Role ${mapping.roleCode} not found, skipping...`);
        continue;
      }

      for (const permCode of mapping.permissions) {
        const permissionId = permissionIds[permCode];
        
        if (!permissionId) {
          console.error(`⚠️  Permission ${permCode} not found, skipping...`);
          continue;
        }

        await queryRunner.query(`
          INSERT INTO role_permissions (
            role_id, permission_id, created_by, created_at
          ) VALUES (
            $1, $2, NULL, CURRENT_TIMESTAMP
          )
          ON CONFLICT (role_id, permission_id) DO NOTHING;
        `, [roleId, permissionId]);
      }

      console.error(`✅ Assigned ${mapping.permissions.length} permissions to ${mapping.roleCode}`);
    }

    await queryRunner.commitTransaction();
    console.error('✅ IAM Customer module seed completed successfully!');

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
 * import { seedIAMCustomers } from './iam-customers.seed';
 * 
 * const dataSource = new DataSource(config);
 * await dataSource.initialize();
 * await seedIAMCustomers(dataSource);
 * await dataSource.destroy();
 * ```
 */
