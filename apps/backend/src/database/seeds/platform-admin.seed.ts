import { NestFactory } from '@nestjs/core';
import { UserStatus } from '@tejas96/shared/types';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../app.module';
import { ConfigService } from '../../config/config.service';
import { RoleRepository } from '../../modules/iam/repositories/role.repository';
import { UserRoleRepository } from '../../modules/users/repositories/user-role.repository';
import { UserRepository } from '../../modules/users/repositories/user.repository';

/**
 * Seed the superadmin user.
 *
 * Creates the superadmin login and links it to the `super_admin` role.
 *
 * It deliberately does NOT grant permissions. Superadmin and admin pass every
 * check by bypass, not by holding rows in `role_permissions` — so granting
 * them the catalog would be both redundant and a trap: the next permission
 * added would silently miss them. This script used to assign every permission
 * in the table to a `platform_admin` role; that role no longer exists and the
 * grant would now hand out the whole new catalog on every re-run.
 *
 * The `super_admin` role itself is owned by migration
 * 1855000000000-ResetRbacCatalog. This script only links a user to it.
 *
 * Usage:
 *   npm run seed:platform-admin        (from apps/backend)
 */
async function seedSuperAdmin() {
  // eslint-disable-next-line no-console -- seed script progress output
  console.log('🚀 Starting Superadmin Seed...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const configService = app.get(ConfigService);
    const roleRepository = app.get(RoleRepository);
    const userRepository = app.get(UserRepository);
    const userRoleRepository = app.get(UserRoleRepository);

    // ============================================
    // 1. Find the super_admin role (owned by migration)
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('📝 Looking up the super_admin role...');

    const superAdminRole = await roleRepository.findPlatformRoleByCode('super_admin');

    if (!superAdminRole) {
      throw new Error(
        'The super_admin role does not exist. Run migrations first:\n' +
          '  cd apps/backend && npm run migration:run\n' +
          'This seed links a user to that role; it does not create it.',
      );
    }

    // eslint-disable-next-line no-console -- seed script progress output
    console.log('✅ Found super_admin role');

    // ============================================
    // 2. Create the superadmin user
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n📝 Creating superadmin user...');

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

    let superAdminUser = await userRepository.findByEmail(email);

    if (!superAdminUser) {
      const hashedPassword = await bcrypt.hash(password, 10);

      superAdminUser = await userRepository.create({
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
      console.log('✅ Superadmin user created');
      // eslint-disable-next-line no-console -- seed script progress output
      console.log(`   Email: ${email}`);
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('   ⚠️  Change this password in production.');
    } else {
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ Superadmin user already exists');
    }

    // ============================================
    // 3. Link the user to the role
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('\n📝 Assigning super_admin role to the user...');

    const existingUserRole = await userRoleRepository.findByUserAndRole(
      superAdminUser.id,
      superAdminRole.id,
    );

    if (!existingUserRole) {
      // Direct repository access so both the legacy `role` string and the
      // `roleId` FK are written. `role` is still NOT NULL in some environments.
      const userRole = userRoleRepository.repository.create({
        userId: superAdminUser.id,
        role: superAdminRole.code,
        roleId: superAdminRole.id,
      });
      await userRoleRepository.repository.save(userRole);
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ super_admin role assigned');
    } else {
      // eslint-disable-next-line no-console -- seed script progress output
      console.log('✅ User already has the super_admin role');
    }

    // ============================================
    // Summary
    // ============================================
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`\n${'='.repeat(50)}`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('🎉 Superadmin setup complete');
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('='.repeat(50));
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`\n   Role:  ${superAdminRole.name} (${superAdminRole.code})`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log(`   User:  ${superAdminUser.email}`);
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('   Grants: 0 — superadmin passes every check by bypass.\n');
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedSuperAdmin()
  .then(() => {
    // eslint-disable-next-line no-console -- seed script progress output
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
