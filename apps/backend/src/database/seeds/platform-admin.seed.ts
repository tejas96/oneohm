import { NestFactory } from '@nestjs/core';
import { UserStatus } from '@oneohm-epc/shared-types';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../app.module';
import { PermissionRepository } from '../../modules/iam/repositories/permission.repository';
import { RolePermissionRepository } from '../../modules/iam/repositories/role-permission.repository';
import { RoleRepository } from '../../modules/iam/repositories/role.repository';
import { UserRoleRepository } from '../../modules/users/repositories/user-role.repository';
import { UserRepository } from '../../modules/users/repositories/user.repository';

/**
 * Seed Platform Admin Role and Assign to User
 *
 * Creates:
 * 1. Platform Admin role (organization_id = NULL)
 * 2. Platform User: platform@oneohm.com
 * 3. Assigns platform_admin role to the user
 *
 * Usage:
 *   npm run seed:platform-admin
 */
async function seedPlatformAdmin() {
  // eslint-disable-next-line no-console
  console.log('🚀 Starting Platform Admin Seed...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const roleRepository = app.get(RoleRepository);
    const permissionRepository = app.get(PermissionRepository);
    const rolePermissionRepository = app.get(RolePermissionRepository);
    const userRepository = app.get(UserRepository);
    const userRoleRepository = app.get(UserRoleRepository);

    // ============================================
    // 1. Create Platform Admin Role (org_id = NULL)
    // ============================================
    // eslint-disable-next-line no-console
    console.log('📝 Creating platform_admin role...');

    const existingRole = await roleRepository.findByCodeAndOrganization('platform_admin', '');

    let platformAdminRole;
    if (existingRole) {
      // eslint-disable-next-line no-console
      console.log('✅ platform_admin role already exists');
      platformAdminRole = existingRole;
    } else {
      platformAdminRole = await roleRepository.create({
        name: 'Platform Administrator',
        code: 'platform_admin',
        description: 'Full system access - SaaS provider only',
        organizationId: '', // ← Platform level role
        isSystemRole: true,
        level: 0,
      });
      // eslint-disable-next-line no-console
      console.log('✅ platform_admin role created');
    }

    // ============================================
    // 2. Assign ALL permissions to platform_admin
    // ============================================
    // eslint-disable-next-line no-console
    console.log('\n📝 Assigning permissions to platform_admin...');

    // @ts-expect-error - Repository type signature mismatch - works at runtime
    const allPermissions = await permissionRepository.findAll();
    // eslint-disable-next-line no-console
    console.log(`Found ${allPermissions.length} permissions`);

    for (const permission of allPermissions) {
      // @ts-expect-error - Repository type signature mismatch - works at runtime
      const exists = await rolePermissionRepository.exists(platformAdminRole.id, permission.id);

      if (!exists) {
        // @ts-expect-error - Repository type signature mismatch - works at runtime
        await rolePermissionRepository.create({
          roleId: platformAdminRole.id,
          permissionId: permission.id,
        });
      }
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Assigned ${allPermissions.length} permissions to platform_admin`);

    // ============================================
    // 3. Create Platform Admin User
    // ============================================
    // eslint-disable-next-line no-console
    console.log('\n📝 Creating platform admin user...');

    const email = 'platform@oneohm.com';
    const phone = '+919999999999';
    const password = 'Platform@123'; // Change this in production!

    let platformUser = await userRepository.findByEmail(email);

    if (!platformUser) {
      const hashedPassword = await bcrypt.hash(password, 10);

      platformUser = await userRepository.create({
        email,
        phone,
        passwordHash: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        profileCompleted: true,
        status: UserStatus.ACTIVE,
      });

      // eslint-disable-next-line no-console
      console.log('✅ Platform admin user created');
      // eslint-disable-next-line no-console
      console.log(`   Email: ${email}`);
      // eslint-disable-next-line no-console
      console.log(`   Password: ${password}`);
      // eslint-disable-next-line no-console
      console.log('   ⚠️  IMPORTANT: Change password in production!');
    } else {
      // eslint-disable-next-line no-console
      console.log('✅ Platform admin user already exists');
    }

    // ============================================
    // 4. Assign platform_admin role to user
    // ============================================
    // eslint-disable-next-line no-console
    console.log('\n📝 Assigning platform_admin role to user...');

    const existingUserRole = await userRoleRepository.findByUserAndRole(
      platformUser.id,
      platformAdminRole.id,
    );

    if (!existingUserRole) {
      await userRoleRepository.create({
        userId: platformUser.id,
        roleId: platformAdminRole.id,
        organizationId: null, // ← Platform level assignment
      });
      // eslint-disable-next-line no-console
      console.log('✅ platform_admin role assigned to user');
    } else {
      // eslint-disable-next-line no-console
      console.log('✅ User already has platform_admin role');
    }

    // ============================================
    // Summary
    // ============================================
    // eslint-disable-next-line no-console
    console.log(`\n${'='.repeat(50)}`);
    // eslint-disable-next-line no-console
    console.log('🎉 Platform Admin Setup Complete!');
    // eslint-disable-next-line no-console
    console.log('='.repeat(50));
    // eslint-disable-next-line no-console
    console.log('\n📋 Summary:');
    // eslint-disable-next-line no-console
    console.log(`   Role: ${platformAdminRole.name} (${platformAdminRole.code})`);
    // eslint-disable-next-line no-console
    console.log(`   User: ${platformUser.email}`);
    // eslint-disable-next-line no-console
    console.log(`   Permissions: ${allPermissions.length}`);
    // eslint-disable-next-line no-console
    console.log('\n🔐 Login Credentials:');
    // eslint-disable-next-line no-console
    console.log(`   Email: ${email}`);
    // eslint-disable-next-line no-console
    console.log(`   Password: ${password}`);
    // eslint-disable-next-line no-console
    console.log('\n⚠️  Security Warning:');
    // eslint-disable-next-line no-console
    console.log('   Change the default password immediately in production!');
    // eslint-disable-next-line no-console
    console.log('   Store credentials securely.');
    // eslint-disable-next-line no-console
    console.log('\n');
  } catch (error) {
    console.error('❌ Error seeding platform admin:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the seed
seedPlatformAdmin()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
