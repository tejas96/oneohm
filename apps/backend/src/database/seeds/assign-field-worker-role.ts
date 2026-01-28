/**
 * Assign Field Worker Role + Quote Price Breakdown Permission
 *
 * This script:
 * 1. Finds the user by email
 * 2. Ensures the field_worker role exists
 * 3. Creates quote price breakdown permission if not exists
 * 4. Assigns the field_worker role to the user
 * 5. Assigns the permission to the role
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seeds/assign-field-worker-role.ts <email>
 */

import { DataSource } from 'typeorm';

import dataSource from '../ormconfig';

const USER_EMAIL = process.argv[2] || 'sanjay.oneohm@gmail.com';

async function assignFieldWorkerRole(ds: DataSource): Promise<void> {
  const queryRunner = ds.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    console.log('\n🔧 ========================================');
    console.log(`   ASSIGNING FIELD WORKER ROLE TO: ${USER_EMAIL}`);
    console.log('========================================\n');

    // ===========================================================================
    // 1. FIND USER BY EMAIL
    // ===========================================================================
    console.log('👤 Finding user...');
    const userResult = await queryRunner.query(
      `SELECT id, email, first_name, last_name FROM users WHERE email = $1`,
      [USER_EMAIL],
    );

    if (!userResult || userResult.length === 0) {
      throw new Error(`User with email '${USER_EMAIL}' not found`);
    }

    const user = userResult[0];
    console.log(`✅ Found user: ${user.first_name} ${user.last_name} (${user.id})`);

    // ===========================================================================
    // 2. GET ORGANIZATION
    // ===========================================================================
    console.log('\n🏢 Getting organization...');
    const orgResult = await queryRunner.query(`SELECT id, name, code FROM organizations LIMIT 1`);

    if (!orgResult || orgResult.length === 0) {
      throw new Error('No organization found');
    }

    const org = orgResult[0];
    console.log(`✅ Found organization: ${org.name} (${org.id})`);

    // ===========================================================================
    // 3. ENSURE FIELD_WORKER ROLE EXISTS
    // ===========================================================================
    console.log('\n👷 Ensuring field_worker role exists...');
    const roleResult = await queryRunner.query(
      `SELECT id, code, name FROM roles 
       WHERE organization_id = $1 AND code = 'field_worker'`,
      [org.id],
    );

    let fieldWorkerRole;

    if (!roleResult || roleResult.length === 0) {
      console.log('Creating field_worker role...');
      const createRoleResult = await queryRunner.query(
        `INSERT INTO roles (
          organization_id, code, name, description, level, is_system_role,
          created_at, updated_at
        ) VALUES (
          $1, 'field_worker', 'Field Worker', 
          'Field worker access - can create leads and quotes with price breakdown visibility',
          5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (organization_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id, code, name`,
        [org.id],
      );
      fieldWorkerRole = createRoleResult[0];
      console.log(`✅ Created field_worker role: ${fieldWorkerRole.id}`);
    } else {
      fieldWorkerRole = roleResult[0];
      console.log(`✅ Found existing field_worker role: ${fieldWorkerRole.id}`);
    }

    // ===========================================================================
    // 4. ENSURE QUOTES FEATURE EXISTS
    // ===========================================================================
    console.log('\n📦 Ensuring quotes feature exists...');
    const featureResult = await queryRunner.query(
      `SELECT id, code, name FROM features WHERE code = 'quotes'`,
    );

    let quotesFeature;

    if (!featureResult || featureResult.length === 0) {
      console.log('Creating quotes feature...');
      const createFeatureResult = await queryRunner.query(
        `INSERT INTO features (
          code, name, description, feature_type, is_active,
          created_at, updated_at
        ) VALUES (
          'quotes', 'Quote Management', 'Manage quotes and quotations',
          'module', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name
        RETURNING id, code, name`,
      );
      quotesFeature = createFeatureResult[0];
      console.log(`✅ Created quotes feature: ${quotesFeature.id}`);
    } else {
      quotesFeature = featureResult[0];
      console.log(`✅ Found existing quotes feature: ${quotesFeature.id}`);
    }

    // ===========================================================================
    // 5. ENSURE QUOTE PRICE BREAKDOWN PERMISSION EXISTS
    // ===========================================================================
    console.log('\n🔐 Ensuring quote price breakdown permission exists...');
    const permResult = await queryRunner.query(
      `SELECT id, code, name FROM permissions WHERE code = 'quotes:view_price_breakdown'`,
    );

    let priceBreakdownPermission;

    if (!permResult || permResult.length === 0) {
      console.log('Creating quotes:view_price_breakdown permission...');
      const createPermResult = await queryRunner.query(
        `INSERT INTO permissions (
          feature_id, name, code, description, action, scope,
          permission_level, show_in_menu, is_active, is_system_permission,
          created_at, updated_at
        ) VALUES (
          $1, 'View Quote Price Breakdown', 'quotes:view_price_breakdown',
          'View detailed price breakdown in quotes including component costs, margins, and discounts',
          'read', 'all', 'standard', false, true, true,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description
        RETURNING id, code, name`,
        [quotesFeature.id],
      );
      priceBreakdownPermission = createPermResult[0];
      console.log(
        `✅ Created permission: ${priceBreakdownPermission.code} (${priceBreakdownPermission.id})`,
      );
    } else {
      priceBreakdownPermission = permResult[0];
      console.log(
        `✅ Found existing permission: ${priceBreakdownPermission.code} (${priceBreakdownPermission.id})`,
      );
    }

    // ===========================================================================
    // 6. ASSIGN PERMISSION TO ROLE
    // ===========================================================================
    console.log('\n🔗 Assigning permission to field_worker role...');
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [fieldWorkerRole.id, priceBreakdownPermission.id],
    );
    console.log(`✅ Permission assigned to role`);

    // Also add basic quote permissions to field_worker role
    const basicQuotePerms = ['quotes:read', 'quotes:create', 'quotes:update'];
    for (const permCode of basicQuotePerms) {
      // Check if permission exists
      const existingPerm = await queryRunner.query(`SELECT id FROM permissions WHERE code = $1`, [
        permCode,
      ]);

      if (existingPerm && existingPerm.length > 0) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [fieldWorkerRole.id, existingPerm[0].id],
        );
        console.log(`✅ Added ${permCode} to field_worker role`);
      } else {
        // Create the permission
        const newPerm = await queryRunner.query(
          `INSERT INTO permissions (
            feature_id, name, code, description, action, scope,
            permission_level, show_in_menu, is_active, is_system_permission,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 'all', 'standard', true, true, true,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
          RETURNING id`,
          [
            quotesFeature.id,
            permCode.replace(':', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            permCode,
            `${permCode.split(':')[1]} quotes`,
            permCode.split(':')[1],
          ],
        );

        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [fieldWorkerRole.id, newPerm[0].id],
        );
        console.log(`✅ Created and added ${permCode} to field_worker role`);
      }
    }

    // ===========================================================================
    // 7. ASSIGN ROLE TO USER
    // ===========================================================================
    console.log('\n👤 Assigning field_worker role to user...');

    // Check if user already has this role
    const existingUserRole = await queryRunner.query(
      `SELECT id FROM user_roles 
       WHERE user_id = $1 AND role_id = $2 AND organization_id = $3`,
      [user.id, fieldWorkerRole.id, org.id],
    );

    if (existingUserRole && existingUserRole.length > 0) {
      console.log(`⚠️ User already has field_worker role`);
    } else {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role, role_id, organization_id, created_at)
         VALUES ($1, 'field_worker', $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [user.id, fieldWorkerRole.id, org.id],
      );
      console.log(`✅ Assigned field_worker role to user`);
    }

    // ===========================================================================
    // 8. ADD CUSTOMER & LEAD PERMISSIONS (field worker essentials)
    // ===========================================================================
    console.log('\n📋 Adding customer/lead permissions to field_worker role...');

    const fieldWorkerPerms = ['customers:read', 'customers:create', 'customers:update'];

    for (const permCode of fieldWorkerPerms) {
      const perm = await queryRunner.query(`SELECT id FROM permissions WHERE code = $1`, [
        permCode,
      ]);

      if (perm && perm.length > 0) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id, created_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [fieldWorkerRole.id, perm[0].id],
        );
        console.log(`✅ Added ${permCode} to field_worker role`);
      }
    }

    // Commit transaction
    await queryRunner.commitTransaction();

    console.log('\n🎉 ========================================');
    console.log('   SUCCESS!');
    console.log('========================================');
    console.log(`\n✅ User: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`✅ Role: field_worker`);
    console.log(`✅ Permission: quotes:view_price_breakdown`);
    console.log(`✅ Organization: ${org.name}\n`);
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
  console.log('🚀 Starting role assignment...\n');

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    await assignFieldWorkerRole(dataSource);

    await dataSource.destroy();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

void main();
