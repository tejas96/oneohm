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

    // ============================================
    // 7. SEED PRODUCT CATEGORIES
    // ============================================
    console.log('\n📂 Seeding Product Categories...');

    await dataSource.query(`
          -- Level 1: Top Categories
          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'Solar Panels',
            'SOLAR_PANELS',
            'Photovoltaic solar panels for electricity generation',
            NULL,
            u.id
          FROM organizations org, users u
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
          ON CONFLICT (organization_id, code) DO NOTHING;

          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'Inverters',
            'INVERTERS',
            'Solar inverters for DC to AC conversion',
            NULL,
            u.id
          FROM organizations org, users u
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
          ON CONFLICT (organization_id, code) DO NOTHING;

          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'Batteries',
            'BATTERIES',
            'Energy storage batteries',
            NULL,
            u.id
          FROM organizations org, users u
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
          ON CONFLICT (organization_id, code) DO NOTHING;

          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'Mounting Structures',
            'MOUNTING',
            'Solar panel mounting and racking systems',
            NULL,
            u.id
          FROM organizations org, users u
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com'
          ON CONFLICT (organization_id, code) DO NOTHING;

          -- Level 2: Solar Panel Subcategories
          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'Monocrystalline Panels',
            'MONO_PANELS',
            'High-efficiency monocrystalline solar panels',
            cat.id,
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'SOLAR_PANELS' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'Polycrystalline Panels',
            'POLY_PANELS',
            'Cost-effective polycrystalline solar panels',
            cat.id,
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'SOLAR_PANELS' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          -- Level 2: Inverter Subcategories
          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'String Inverters',
            'STRING_INV',
            'String inverters for residential and commercial use',
            cat.id,
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'INVERTERS' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          INSERT INTO product_categories (organization_id, name, code, description, parent_category_id, created_by)
          SELECT 
            org.id,
            'Hybrid Inverters',
            'HYBRID_INV',
            'Hybrid inverters with battery support',
            cat.id,
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'INVERTERS' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;
        `);

    console.log('✓ Product categories seeded (9 categories)');

    // ============================================
    // 8. SEED PRODUCTS
    // ============================================
    console.log('\n🔧 Seeding Products...');

    await dataSource.query(`
          -- Solar Panels
          INSERT INTO products (
            organization_id, category_id, name, code, description, type,
            specifications, brand, manufacturer, model_number,
            unit_of_measure, product_warranty_years, performance_warranty_years,
            status, created_by
          )
          SELECT
            org.id,
            cat.id,
            'Jinko Solar Tiger Neo 550W',
            'JINKO-550W',
            'High-efficiency monocrystalline solar panel with N-type TOPCon technology',
            'solar_panel',
            '{"common": {"wattage": 550, "efficiency": 21.5, "cellType": "Monocrystalline", "dimensions": "2278x1134x35mm", "weight": 27.5}}'::jsonb,
            'Jinko Solar',
            'Jinko Solar Co. Ltd',
            'JKM550M-7RL4-V',
            'pcs',
            12,
            25,
            'active',
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'MONO_PANELS' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          INSERT INTO products (
            organization_id, category_id, name, code, description, type,
            specifications, brand, manufacturer, model_number,
            unit_of_measure, product_warranty_years, performance_warranty_years,
            status, created_by
          )
          SELECT
            org.id,
            cat.id,
            'Trina Solar Vertex 535W',
            'TRINA-535W',
            'High power monocrystalline module with multi-busbar technology',
            'solar_panel',
            '{"common": {"wattage": 535, "efficiency": 20.9, "cellType": "Monocrystalline", "dimensions": "2187x1102x35mm", "weight": 27.3}}'::jsonb,
            'Trina Solar',
            'Trina Solar Limited',
            'TSM-535DE18M',
            'pcs',
            12,
            25,
            'active',
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'MONO_PANELS' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          -- Inverters
          INSERT INTO products (
            organization_id, category_id, name, code, description, type,
            specifications, brand, manufacturer, model_number,
            unit_of_measure, product_warranty_years,
            status, created_by
          )
          SELECT
            org.id,
            cat.id,
            'Growatt 5kW On-Grid Inverter',
            'GROWATT-5KW',
            'Single-phase on-grid inverter with 2 MPPT',
            'inverter',
            '{"common": {"capacity": 5, "inputVoltage": "140-850V DC", "outputVoltage": "230V AC", "phases": 1, "mpptChannels": 2, "efficiency": 98.4}}'::jsonb,
            'Growatt',
            'Growatt New Energy Co. Ltd',
            'MIN 5000TL-X',
            'pcs',
            5,
            'active',
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'STRING_INV' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          INSERT INTO products (
            organization_id, category_id, name, code, description, type,
            specifications, brand, manufacturer, model_number,
            unit_of_measure, product_warranty_years,
            status, created_by
          )
          SELECT
            org.id,
            cat.id,
            'Deye 8kW Hybrid Inverter',
            'DEYE-8KW-HYB',
            'Hybrid inverter with battery charging capability',
            'inverter',
            '{"common": {"capacity": 8, "inputVoltage": "125-550V DC", "outputVoltage": "230V AC", "phases": 1, "mpptChannels": 2, "efficiency": 97.6}}'::jsonb,
            'Deye',
            'Deye Inverter Technology Co. Ltd',
            'SUN-8K-SG04LP3-EU',
            'pcs',
            5,
            'active',
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'HYBRID_INV' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          -- Batteries
          INSERT INTO products (
            organization_id, category_id, name, code, description, type,
            specifications, brand, manufacturer, model_number,
            unit_of_measure, product_warranty_years,
            status, created_by
          )
          SELECT
            org.id,
            cat.id,
            'Pylontech US3000C 3.5kWh',
            'PYLON-3.5KWH',
            'Lithium-ion battery module for residential energy storage',
            'battery',
            '{"common": {"capacity": 3.5, "voltage": 48, "chemistry": "Lithium Iron Phosphate", "cycleLife": 6000, "depthOfDischarge": 95, "weight": 37}}'::jsonb,
            'Pylontech',
            'Pylontech Co. Ltd',
            'US3000C',
            'pcs',
            10,
            'active',
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'BATTERIES' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;

          -- Mounting Structures
          INSERT INTO products (
            organization_id, category_id, name, code, description, type,
            specifications, brand, manufacturer,
            unit_of_measure, product_warranty_years,
            status, created_by
          )
          SELECT
            org.id,
            cat.id,
            'Aluminum Rooftop Mounting Kit',
            'MNT-ROOF-AL',
            'Complete aluminum mounting structure for residential rooftops',
            'mounting_structure',
            '{"additional": {"material": "Aluminum 6005-T5", "panelsPerKit": 10, "tiltAngle": "10-30 degrees", "windLoad": "Up to 200 km/h"}}'::jsonb,
            'Generic',
            'Various',
            'set',
            10,
            'active',
            u.id
          FROM organizations org, users u, product_categories cat
          WHERE org.code = 'ONEOHM-TEST' AND u.email = 'admin@oneohm.com' AND cat.code = 'MOUNTING' AND org.id = cat.organization_id
          ON CONFLICT (organization_id, code) DO NOTHING;
        `);

    console.log('✓ Products seeded (6 products)');

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📊 Seeded Data Summary:');
    console.log('  - 1 Organization');
    console.log('  - 1 Super Admin User');
    console.log('  - 2 Resellers');
    console.log('  - 5 Customers (2 leads, 1 prospect, 2 active)');
    console.log('  - 2 Reseller Commissions (1 pending, 1 approved)');
    console.log('  - 9 Product Categories (hierarchical)');
    console.log('  - 6 Products (panels, inverters, batteries, mounting)');
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
