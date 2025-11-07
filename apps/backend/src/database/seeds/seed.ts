/* eslint-disable no-console */
import * as bcrypt from 'bcrypt';

import dataSource from '../ormconfig';

/**
 * Database Seed Script
 * Creates initial data for development and testing
 *
 * Usage: npm run seed
 */
async function seed() {
  await dataSource.initialize();

  console.log('🌱 Starting database seeding...\n');

  try {
    // ============================================
    // 1. SEED ORGANIZATIONS
    // ============================================
    console.log('📦 Seeding Organizations...');

    await dataSource.query(`
      INSERT INTO organizations (
        name, code, email, phone, address, city, state, country, pincode,
        gstin, pan, timezone, currency, date_format,
        default_project_timeline_weeks, default_quote_validity_days,
        max_quote_versions, status
      ) VALUES (
        'OneOhm Test Organization',
        'ONEOHM-TEST',
        'test@oneohm.com',
        '+91-9876543210',
        '123 Test Street, Solar Park',
        'Bangalore',
        'Karnataka',
        'India',
        '560001',
        '29ABCDE1234F1Z5',
        'ABCDE1234F',
        'Asia/Kolkata',
        'INR',
        'DD-MM-YYYY',
        4,
        30,
        3,
        'active'
      )
      ON CONFLICT (code) DO NOTHING
      RETURNING id;
    `);

    console.log('✓ Organization seeded');

    // ============================================
    // 2. SEED SUPER ADMIN USER
    // ============================================
    console.log('\n👤 Seeding Super Admin User...');

    // Password: Admin@123
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    await dataSource.query(
      `
      INSERT INTO users (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        password_hash,
        status,
        designation,
        department,
        country
      )
      SELECT
        id,
        'Super',
        'Admin',
        'admin@oneohm.com',
        '+91-9999999999',
        $1,
        'active',
        'System Administrator',
        'IT',
        'India'
      FROM organizations
      WHERE code = 'ONEOHM-TEST'
      ON CONFLICT (email) DO NOTHING;
    `,
      [passwordHash],
    );

    console.log('✓ Super Admin user created');
    console.log('  Email: admin@oneohm.com');
    console.log('  Password: Admin@123');

    // ============================================
    // 3. ASSIGN SUPER_ADMIN ROLE
    // ============================================
    console.log('\n🔐 Assigning Super Admin role...');

    await dataSource.query(`
      INSERT INTO user_roles (user_id, role, created_by)
      SELECT
        u.id,
        'super_admin',
        u.id
      FROM users u
      WHERE u.email = 'admin@oneohm.com'
      ON CONFLICT (user_id, role) DO NOTHING;
    `);

    console.log('✓ Role assigned');

    console.log('\n✅ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✨ Seed script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed script failed:', error);
      process.exit(1);
    });
}

export { seed };
