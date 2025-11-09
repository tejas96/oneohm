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

    // ============================================
    // 4. SEED RESELLERS
    // ============================================
    console.log('\n🤝 Seeding Resellers...');

    await dataSource.query(`
      INSERT INTO resellers (
        organization_id,
        company_name,
        company_code,
        contact_person_name,
        email,
        phone,
        alternate_phone,
        address,
        city,
        state,
        country,
        pincode,
        gstin,
        pan,
        commission_percentage,
        commission_min_percentage,
        commission_max_percentage,
        bank_name,
        account_number,
        ifsc_code,
        account_holder_name,
        status,
        created_by
      )
      SELECT
        org.id,
        'SolarTech Partners',
        'RES-001',
        'Rajesh Kumar',
        'rajesh@solartech.com',
        '+91-9876543211',
        '+91-9876543212',
        '45 Solar Avenue, Tech Park',
        'Bangalore',
        'Karnataka',
        'India',
        '560037',
        '29XYZAB1234C1Z5',
        'XYZAB1234C',
        5.00,
        3.00,
        8.00,
        'HDFC Bank',
        '50100012345678',
        'HDFC0001234',
        'SolarTech Partners Pvt Ltd',
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, company_code) DO NOTHING;

      INSERT INTO resellers (
        organization_id,
        company_name,
        company_code,
        contact_person_name,
        email,
        phone,
        address,
        city,
        state,
        country,
        pincode,
        commission_percentage,
        status,
        created_by
      )
      SELECT
        org.id,
        'Green Energy Solutions',
        'RES-002',
        'Priya Sharma',
        'priya@greenenergy.com',
        '+91-9876543213',
        '78 Green Street, Business District',
        'Mumbai',
        'Maharashtra',
        'India',
        '400001',
        4.00,
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT (organization_id, company_code) DO NOTHING;
    `);

    console.log('✓ Resellers seeded (2 resellers)');

    // ============================================
    // 5. SEED CUSTOMERS
    // ============================================
    console.log('\n👥 Seeding Customers...');

    await dataSource.query(`
      -- Lead Customers (new inquiries)
      INSERT INTO customers (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        alternate_phone,
        consumer_number,
        consumer_name,
        current_load,
        address,
        city,
        state,
        country,
        pincode,
        property_name,
        property_type,
        lead_source,
        reseller_id,
        status,
        created_by
      )
      SELECT
        org.id,
        'Amit',
        'Patel',
        'amit.patel@example.com',
        '+91-9876543214',
        '+91-9876543215',
        'CONS123456',
        'AMIT PATEL',
        '5 KW',
        '101 Sunshine Apartments, MG Road',
        'Bangalore',
        'Karnataka',
        'India',
        '560001',
        'Sunshine Apartments',
        'Residential',
        'Website',
        res.id,
        'lead',
        u.id
      FROM organizations org, users u, resellers res
      WHERE org.code = 'ONEOHM-TEST' 
        AND u.email = 'admin@oneohm.com'
        AND res.company_code = 'RES-001'
      LIMIT 1
      ON CONFLICT DO NOTHING;

      INSERT INTO customers (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        consumer_number,
        consumer_name,
        current_load,
        address,
        city,
        state,
        country,
        pincode,
        property_type,
        lead_source,
        status,
        created_by
      )
      SELECT
        org.id,
        'Sneha',
        'Reddy',
        'sneha.reddy@example.com',
        '+91-9876543216',
        'CONS234567',
        'SNEHA REDDY',
        '7 KW',
        '202 Green Valley, Whitefield',
        'Bangalore',
        'Karnataka',
        'India',
        '560066',
        'Residential',
        'Referral',
        'lead',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT DO NOTHING;

      -- Prospect Customers (qualified leads)
      INSERT INTO customers (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        consumer_number,
        consumer_name,
        current_load,
        address,
        city,
        state,
        country,
        pincode,
        property_name,
        property_type,
        lead_source,
        reseller_id,
        status,
        created_by
      )
      SELECT
        org.id,
        'Rahul',
        'Singh',
        'rahul.singh@example.com',
        '+91-9876543217',
        'CONS345678',
        'RAHUL SINGH',
        '10 KW',
        '303 Skyline Towers, Koramangala',
        'Bangalore',
        'Karnataka',
        'India',
        '560034',
        'Skyline Towers',
        'Commercial',
        'Direct',
        res.id,
        'prospect',
        u.id
      FROM organizations org, users u, resellers res
      WHERE org.code = 'ONEOHM-TEST' 
        AND u.email = 'admin@oneohm.com'
        AND res.company_code = 'RES-002'
      LIMIT 1
      ON CONFLICT DO NOTHING;

      -- Active Customers (installed systems)
      INSERT INTO customers (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        alternate_phone,
        consumer_number,
        consumer_name,
        current_load,
        address,
        city,
        state,
        country,
        pincode,
        property_type,
        lead_source,
        status,
        created_by
      )
      SELECT
        org.id,
        'Priya',
        'Nair',
        'priya.nair@example.com',
        '+91-9876543218',
        '+91-9876543219',
        'CONS456789',
        'PRIYA NAIR',
        '8 KW',
        '404 Palm Grove, Indiranagar',
        'Bangalore',
        'Karnataka',
        'India',
        '560038',
        'Residential',
        'Website',
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT DO NOTHING;

      INSERT INTO customers (
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        consumer_number,
        consumer_name,
        current_load,
        address,
        city,
        state,
        country,
        pincode,
        property_name,
        property_type,
        lead_source,
        status,
        created_by
      )
      SELECT
        org.id,
        'Vijay',
        'Kumar',
        'vijay.kumar@example.com',
        '+91-9876543220',
        'CONS567890',
        'VIJAY KUMAR',
        '12 KW',
        '505 Tech Park, Electronic City',
        'Bangalore',
        'Karnataka',
        'India',
        '560100',
        'Tech Park Industries',
        'Commercial',
        'Referral',
        'active',
        u.id
      FROM organizations org, users u
      WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
      ON CONFLICT DO NOTHING;
    `);

    console.log('✓ Customers seeded (5 customers: 2 leads, 1 prospect, 2 active)');

    // ============================================
    // 6. SEED RESELLER COMMISSIONS (Sample)
    // ============================================
    console.log('\n💰 Seeding Reseller Commissions...');

    await dataSource.query(`
      INSERT INTO reseller_commissions (
        organization_id,
        reseller_id,
        project_value,
        commission_percentage,
        commission_amount,
        status,
        notes,
        created_by
      )
      SELECT
        org.id,
        res.id,
        500000.00,
        5.00,
        25000.00,
        'pending',
        'Commission for Amit Patel project - 10 KW residential installation',
        u.id
      FROM organizations org, users u, resellers res
      WHERE org.code = 'ONEOHM-TEST' 
        AND u.email = 'admin@oneohm.com'
        AND res.company_code = 'RES-001'
      LIMIT 1
      ON CONFLICT DO NOTHING;

      INSERT INTO reseller_commissions (
        organization_id,
        reseller_id,
        project_value,
        commission_percentage,
        commission_amount,
        status,
        approved_at,
        approved_by,
        notes,
        created_by
      )
      SELECT
        org.id,
        res.id,
        750000.00,
        4.00,
        30000.00,
        'approved',
        CURRENT_TIMESTAMP,
        u.id,
        'Commission for Rahul Singh project - 15 KW commercial installation',
        u.id
      FROM organizations org, users u, resellers res
      WHERE org.code = 'ONEOHM-TEST' 
        AND u.email = 'admin@oneohm.com'
        AND res.company_code = 'RES-002'
      LIMIT 1
      ON CONFLICT DO NOTHING;
    `);

    console.log('✓ Reseller commissions seeded (2 commissions)');

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📊 Seeded Data Summary:');
    console.log('  - 1 Organization');
    console.log('  - 1 Super Admin User');
    console.log('  - 2 Resellers');
    console.log('  - 5 Customers (2 leads, 1 prospect, 2 active)');
    console.log('  - 2 Reseller Commissions (1 pending, 1 approved)');
    console.log('');
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
