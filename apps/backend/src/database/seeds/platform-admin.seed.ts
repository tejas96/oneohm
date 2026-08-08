import { NestFactory } from '@nestjs/core';
import { UserStatus } from '@tejas96/shared/types';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../app.module';
import { ConfigService } from '../../config/config.service';
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
  // eslint-disable-next-line no-console -- seed script progress output
  console.log('🚀 Starting Platform Admin Seed...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const configService = app.get(ConfigService);
    const roleRepository = app.get(RoleRepository);
    const permissionRepository = app.get(PermissionRepository);
    const rolePermissionRepository = app.get(RolePermissionRepository);
    const userRepository = app.get(UserRepository);
    const userRoleRepository = app.get(UserRoleRepository);

    // ============================================
    // 1. Create Platform Admin Role (org_id = NULL)
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('📝 Creating platform_admin role...');

    // Use findPlatformRoleByCode for platform-level roles (org_id IS NULL)
    const existingRole = await roleRepository.findPlatformRoleByCode('platform_admin');

    let platformAdminRole;
    if (existingRole) {
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ platform_admin role already exists');
      platformAdminRole = existingRole;
    } else {
      platformAdminRole = await roleRepository.create({
        name: 'Platform Administrator',
        code: 'platform_admin',
        description: 'Full system access - SaaS provider only',
        isSystemRole: true,
        level: 0,
      });
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ platform_admin role created');
    }

    // ============================================
    // 2. Assign ALL permissions to platform_admin
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n📝 Assigning permissions to platform_admin...');

    const allPermissions = await permissionRepository.findAll();
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`Found ${allPermissions.length} permissions`);

    // Batch-fetch existing permissions for this role (avoids N+1)
    const existingRolePermissions = await rolePermissionRepository.findByRoleId(
      platformAdminRole.id,
    );
    const existingPermissionIds = new Set(existingRolePermissions.map((rp) => rp.permissionId));
    const permissionIdsToAssign = allPermissions
      .filter((p) => !existingPermissionIds.has(p.id))
      .map((p) => p.id);

    // Assign new permissions in batch (createdBy is nullable, use null for system actions)
    if (permissionIdsToAssign.length > 0) {
      // Use direct repository to avoid createdBy requirement
      const rolePermissions = permissionIdsToAssign.map((permissionId) =>
        rolePermissionRepository.repository.create({
          roleId: platformAdminRole.id,
          permissionId,
          createdBy: undefined, // System action, no specific user
        }),
      );
      await rolePermissionRepository.repository.save(rolePermissions);
      // eslint-disable-next-line no-console -- seed script progress output
      console.log(`✅ Assigned ${permissionIdsToAssign.length} new permissions to platform_admin`);
    } else {
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ All permissions already assigned to platform_admin');
    }

    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`📊 Total permissions: ${allPermissions.length}`);

    // ============================================
    // 3. Create Platform Admin User
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n📝 Creating platform admin user...');

    const {
      platformAdminEmail: email,
      platformAdminPhone: phone,
      platformAdminPassword: password,
    } = configService.seed;

    if (password === 'admin@123' && configService.isProduction) {
      throw new Error(
        'PLATFORM_ADMIN_PASSWORD must be set in production. Do not use default credentials.',
      );
    }

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
        firstName: 'Tejas',
        lastName: 'Patil',
      });

      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ Platform admin user created');
      // eslint-disable-next-line no-console -- seed script progress output
      console.log(`   Email: ${email}`);
      // eslint-disable-next-line no-console -- seed script progress output
      console.log(`   Password: ${password}`);
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('   ⚠️  IMPORTANT: Change password in production!');
    } else {
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ Platform admin user already exists');
    }

    // ============================================
    // 4. Assign platform_admin role to user
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n📝 Assigning platform_admin role to user...');

    const existingUserRole = await userRoleRepository.findByUserAndRole(
      platformUser.id,
      platformAdminRole.id,
    );

    if (!existingUserRole) {
      // Use direct repository to set both legacy 'role' and new 'roleId'
      const userRole = userRoleRepository.repository.create({
        userId: platformUser.id,
        role: platformAdminRole.code, // Legacy role string (NOT NULL in DB)
        roleId: platformAdminRole.id, // New IAM role UUID
      });
      await userRoleRepository.repository.save(userRole);
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ platform_admin role assigned to user');
    } else {
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ User already has platform_admin role');
    }

    // ============================================
    // Summary
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`\n${'='.repeat(50)}`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('🎉 Platform Admin Setup Complete!');
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('='.repeat(50));
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n📋 Summary:');
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`   Role: ${platformAdminRole.name} (${platformAdminRole.code})`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`   User: ${platformUser.email}`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`   Permissions: ${allPermissions.length}`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n🔐 Login Credentials:');
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`   Email: ${email}`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`   Password: ${password}`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n⚠️  Security Warning:');
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('   Change the default password immediately in production!');
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('   Store credentials securely.');
    // eslint-disable-next-line no-console -- seed script progress output
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
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
