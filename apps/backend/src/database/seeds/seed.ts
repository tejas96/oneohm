import * as bcrypt from 'bcrypt';

import loadConfig from '../../config/configuration';
import dataSource from '../ormconfig';
import { seedDefaultProfileRoles } from './default-profile-roles.seed';

const config = loadConfig();

/**
 * Database Seed Script
 * Creates initial data for development and testing
 *
 * Usage: npm run seed
 */
async function seed(): Promise<void> {
  await dataSource.initialize();

  console.error('🌱 Starting database seeding...\n');

  try {
    // ============================================
    // 1. SEED ORGANIZATIONS
    // ============================================
    console.error('📦 Seeding Organizations...');

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

    console.error('✓ Organization seeded');

    // ============================================
    // 2. SEED SUPER ADMIN USER
    // ============================================
    console.error('\n👤 Seeding Super Admin User...');

    const seedPassword = config.seed.platformAdminPassword;
    const seedEmail = config.seed.platformAdminEmail;
    const seedPhone = config.seed.platformAdminPhone;
    const passwordHash = await bcrypt.hash(seedPassword, 10);

    await dataSource.query(
      `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        phone,
        password_hash,
        status,
        profile_completed
      )
      VALUES (
        'Super',
        'Admin',
        $1,
        $2,
        $3,
        'active',
        true
      )
      ON CONFLICT (email) DO NOTHING;
    `,
      [seedEmail, seedPhone, passwordHash],
    );

    console.error('✓ Super Admin user created');
    console.error(`  Email: ${seedEmail}`);
    console.error(`  Password: ${seedPassword}`);

    // ============================================
    // 3. ASSIGN SUPER_ADMIN ROLE
    // ============================================
    console.error('\n🔐 Assigning Super Admin role...');

    await dataSource.query(
      `
      INSERT INTO user_roles (user_id, role, created_by)
      SELECT
        u.id,
        'super_admin',
        u.id
      FROM users u
      WHERE u.email = $1
      ON CONFLICT (user_id, role) DO NOTHING;
    `,
      [seedEmail],
    );

    console.error('✓ Role assigned');

    // ============================================
    // 4. SEED RESELLERS
    // ============================================
    console.error('\n🤝 Seeding Resellers...');

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

    console.error('✓ Resellers seeded (2 resellers)');

    // ============================================
    // 5. SEED CUSTOMERS
    // ============================================
    console.error('\n👥 Seeding Customers...');

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

    console.error('✓ Customers seeded (5 customers: 2 leads, 1 prospect, 2 active)');

    // ============================================
    // 6. SEED RESELLER COMMISSIONS (Sample)
    // ============================================
    console.error('\n💰 Seeding Reseller Commissions...');

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

    console.error('✓ Reseller commissions seeded (2 commissions)');

    // ============================================
    // 7. SEED PRODUCT CATEGORIES
    // ============================================
    console.error('\n📂 Seeding Product Categories...');

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

    console.error('✓ Product categories seeded (9 categories)');

    // ============================================
    // 8. SEED PRODUCTS
    // ============================================
    console.error('\n🔧 Seeding Products...');

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

    console.error('✓ Products seeded (6 products)');

    // ============================================
    // 7. SEED QUOTES & QUOTATIONS
    // ============================================
    console.error('\n💼 Seeding Quotes...');

    // Quote 1: Draft quote for lead customer
    await dataSource.query(`
      INSERT INTO quotes (
        organization_id, customer_id, quote_number, quote_date,
        valid_until, system_type, system_size_kw, project_type,
        installation_address, installation_city, installation_state,
        installation_pincode, discount_amount, status,
        created_by
      )
      SELECT
        org.id,
        c.id,
        'QT-ONEOHM-TEST-2024-0001',
        '2024-01-15'::date,
        '2024-02-14'::date,
        'on_grid',
        10.0,
        'residential',
        '456 Residential Area, Koramangala',
        'Bangalore',
        'Karnataka',
        '560034',
        5000.00,
        'draft',
        u.id
      FROM organizations org, customers c, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND c.email = 'rajesh.kumar@example.com'
        AND u.email = 'admin@oneohm.com'
        AND org.id = c.organization_id
      ON CONFLICT DO NOTHING;
    `);

    // Quote 2: Sent quote for prospect customer
    await dataSource.query(`
      INSERT INTO quotes (
        organization_id, customer_id, quote_number, quote_date,
        valid_until, system_type, system_size_kw, project_type,
        installation_address, installation_city, installation_state,
        installation_pincode, discount_amount, status,
        created_by
      )
      SELECT
        org.id,
        c.id,
        'QT-ONEOHM-TEST-2024-0002',
        '2024-01-20'::date,
        '2024-02-19'::date,
        'on_grid',
        15.0,
        'commercial',
        '789 Commercial Complex, Whitefield',
        'Bangalore',
        'Karnataka',
        '560066',
        10000.00,
        'sent',
        u.id
      FROM organizations org, customers c, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND c.email = 'anita.sharma@greentech.com'
        AND u.email = 'admin@oneohm.com'
        AND org.id = c.organization_id
      ON CONFLICT DO NOTHING;
    `);

    // Quote 3: Accepted quote for active customer
    await dataSource.query(`
      INSERT INTO quotes (
        organization_id, customer_id, quote_number, quote_date,
        valid_until, system_type, system_size_kw, project_type,
        installation_address, installation_city, installation_state,
        installation_pincode, discount_amount, status,
        created_by
      )
      SELECT
        org.id,
        c.id,
        'QT-ONEOHM-TEST-2024-0003',
        '2024-01-10'::date,
        '2024-02-09'::date,
        'hybrid',
        20.0,
        'commercial',
        '321 Industrial Park, Peenya',
        'Bangalore',
        'Karnataka',
        '560058',
        15000.00,
        'accepted',
        u.id
      FROM organizations org, customers c, users u
      WHERE org.code = 'ONEOHM-TEST'
        AND c.email = 'priya.verma@example.com'
        AND u.email = 'admin@oneohm.com'
        AND org.id = c.organization_id
      ON CONFLICT DO NOTHING;
    `);

    console.error('✓ Quotes seeded (3 quotes)');

    // ============================================
    // 8. SEED QUOTE VERSIONS
    // ============================================
    console.error('\n📋 Seeding Quote Versions...');

    // Version 1 for Quote 1 (Draft)
    await dataSource.query(`
      INSERT INTO quote_versions (
        quote_id, version_number, system_type, system_size_kw,
        base_price, gst_12_on_70_percent, gst_18_on_30_percent,
        total_gst, total_price, subsidy_amount, discount_amount,
        final_price, payment_milestones, is_current, created_by
      )
      SELECT
        q.id,
        1,
        'on_grid',
        10.0,
        550000.00,
        46200.00,
        29700.00,
        75900.00,
        625900.00,
        50000.00,
        5000.00,
        570900.00,
        '[
          {"stage": "booking", "percentage": 30, "amount": 171270.00, "dueDate": "2024-02-01"},
          {"stage": "installation", "percentage": 40, "amount": 228360.00, "dueDate": "2024-03-01"},
          {"stage": "commissioning", "percentage": 30, "amount": 171270.00, "dueDate": "2024-03-15"}
        ]'::jsonb,
        true,
        u.id
      FROM quotes q, users u
      WHERE q.quote_number = 'QT-ONEOHM-TEST-2024-0001'
        AND u.email = 'admin@oneohm.com'
      ON CONFLICT DO NOTHING;
    `);

    // Version 1 for Quote 2 (Sent)
    await dataSource.query(`
      INSERT INTO quote_versions (
        quote_id, version_number, system_type, system_size_kw,
        base_price, gst_12_on_70_percent, gst_18_on_30_percent,
        total_gst, total_price, subsidy_amount, discount_amount,
        final_price, payment_milestones, is_current, created_by
      )
      SELECT
        q.id,
        1,
        'on_grid',
        15.0,
        825000.00,
        69300.00,
        44550.00,
        113850.00,
        938850.00,
        75000.00,
        10000.00,
        853850.00,
        '[
          {"stage": "booking", "percentage": 25, "amount": 213462.50, "dueDate": "2024-02-15"},
          {"stage": "material_delivery", "percentage": 35, "amount": 298847.50, "dueDate": "2024-03-01"},
          {"stage": "installation", "percentage": 30, "amount": 256155.00, "dueDate": "2024-03-20"},
          {"stage": "commissioning", "percentage": 10, "amount": 85385.00, "dueDate": "2024-04-01"}
        ]'::jsonb,
        true,
        u.id
      FROM quotes q, users u
      WHERE q.quote_number = 'QT-ONEOHM-TEST-2024-0002'
        AND u.email = 'admin@oneohm.com'
      ON CONFLICT DO NOTHING;
    `);

    // Version 1 for Quote 3 (Accepted)
    await dataSource.query(`
      INSERT INTO quote_versions (
        quote_id, version_number, system_type, system_size_kw,
        base_price, gst_12_on_70_percent, gst_18_on_30_percent,
        total_gst, total_price, subsidy_amount, discount_amount,
        final_price, payment_milestones, is_current, created_by
      )
      SELECT
        q.id,
        1,
        'hybrid',
        20.0,
        1100000.00,
        92400.00,
        59400.00,
        151800.00,
        1251800.00,
        100000.00,
        15000.00,
        1136800.00,
        '[
          {"stage": "booking", "percentage": 20, "amount": 227360.00, "dueDate": "2024-01-25"},
          {"stage": "material_delivery", "percentage": 30, "amount": 341040.00, "dueDate": "2024-02-10"},
          {"stage": "installation", "percentage": 30, "amount": 341040.00, "dueDate": "2024-03-05"},
          {"stage": "commissioning", "percentage": 20, "amount": 227360.00, "dueDate": "2024-03-25"}
        ]'::jsonb,
        true,
        u.id
      FROM quotes q, users u
      WHERE q.quote_number = 'QT-ONEOHM-TEST-2024-0003'
        AND u.email = 'admin@oneohm.com'
      ON CONFLICT DO NOTHING;
    `);

    console.error('✓ Quote Versions seeded (3 versions)');

    // ============================================
    // 9. SEED QUOTE LINE ITEMS
    // ============================================
    console.error('\n📦 Seeding Quote Line Items...');

    // Line items for Quote 1 Version 1
    await dataSource.query(`
      INSERT INTO quote_line_items (
        quote_version_id, product_id, item_category, item_name,
        item_description, specifications, quantity, unit_price,
        discount_percentage, net_price, tax_rate, tax_amount, display_order
      )
      SELECT
        qv.id,
        p.id,
        'solar_panel',
        p.name,
        p.description,
        p.specifications,
        18,
        28000.00,
        5.0,
        26600.00,
        12.0,
        3192.00,
        1
      FROM quote_versions qv, quotes q, products p
      WHERE qv.quote_id = q.id
        AND q.quote_number = 'QT-ONEOHM-TEST-2024-0001'
        AND p.code = 'JINKO-550W'
        AND qv.version_number = 1
      ON CONFLICT DO NOTHING;
    `);

    await dataSource.query(`
      INSERT INTO quote_line_items (
        quote_version_id, product_id, item_category, item_name,
        item_description, specifications, quantity, unit_price,
        discount_percentage, net_price, tax_rate, tax_amount, display_order
      )
      SELECT
        qv.id,
        p.id,
        'inverter',
        p.name,
        p.description,
        p.specifications,
        1,
        85000.00,
        5.0,
        80750.00,
        18.0,
        14535.00,
        2
      FROM quote_versions qv, quotes q, products p
      WHERE qv.quote_id = q.id
        AND q.quote_number = 'QT-ONEOHM-TEST-2024-0001'
        AND p.code = 'SUNGROW-10KW'
        AND qv.version_number = 1
      ON CONFLICT DO NOTHING;
    `);

    // Line items for Quote 2 Version 1
    await dataSource.query(`
      INSERT INTO quote_line_items (
        quote_version_id, product_id, item_category, item_name,
        item_description, specifications, quantity, unit_price,
        discount_percentage, net_price, tax_rate, tax_amount, display_order
      )
      SELECT
        qv.id,
        p.id,
        'solar_panel',
        p.name,
        p.description,
        p.specifications,
        27,
        29000.00,
        3.0,
        28130.00,
        12.0,
        3375.60,
        1
      FROM quote_versions qv, quotes q, products p
      WHERE qv.quote_id = q.id
        AND q.quote_number = 'QT-ONEOHM-TEST-2024-0002'
        AND p.code = 'ADANI-545W'
        AND qv.version_number = 1
      ON CONFLICT DO NOTHING;
    `);

    await dataSource.query(`
      INSERT INTO quote_line_items (
        quote_version_id, product_id, item_category, item_name,
        item_description, specifications, quantity, unit_price,
        discount_percentage, net_price, tax_rate, tax_amount, display_order
      )
      SELECT
        qv.id,
        p.id,
        'inverter',
        p.name,
        p.description,
        p.specifications,
        1,
        125000.00,
        3.0,
        121250.00,
        18.0,
        21825.00,
        2
      FROM quote_versions qv, quotes q, products p
      WHERE qv.quote_id = q.id
        AND q.quote_number = 'QT-ONEOHM-TEST-2024-0002'
        AND p.code = 'GROWATT-15KW'
        AND qv.version_number = 1
      ON CONFLICT DO NOTHING;
    `);

    // Line items for Quote 3 Version 1 (more comprehensive with battery)
    await dataSource.query(`
      INSERT INTO quote_line_items (
        quote_version_id, product_id, item_category, item_name,
        item_description, specifications, quantity, unit_price,
        discount_percentage, net_price, tax_rate, tax_amount, display_order
      )
      SELECT
        qv.id,
        p.id,
        'solar_panel',
        p.name,
        p.description,
        p.specifications,
        36,
        28000.00,
        5.0,
        26600.00,
        12.0,
        3192.00,
        1
      FROM quote_versions qv, quotes q, products p
      WHERE qv.quote_id = q.id
        AND q.quote_number = 'QT-ONEOHM-TEST-2024-0003'
        AND p.code = 'JINKO-550W'
        AND qv.version_number = 1
      ON CONFLICT DO NOTHING;
    `);

    await dataSource.query(`
      INSERT INTO quote_line_items (
        quote_version_id, product_id, item_category, item_name,
        item_description, specifications, quantity, unit_price,
        discount_percentage, net_price, tax_rate, tax_amount, display_order
      )
      SELECT
        qv.id,
        p.id,
        'inverter',
        p.name,
        p.description,
        p.specifications,
        1,
        125000.00,
        5.0,
        118750.00,
        18.0,
        21375.00,
        2
      FROM quote_versions qv, quotes q, products p
      WHERE qv.quote_id = q.id
        AND q.quote_number = 'QT-ONEOHM-TEST-2024-0003'
        AND p.code = 'GROWATT-15KW'
        AND qv.version_number = 1
      ON CONFLICT DO NOTHING;
    `);

    await dataSource.query(`
      INSERT INTO quote_line_items (
        quote_version_id, product_id, item_category, item_name,
        item_description, specifications, quantity, unit_price,
        discount_percentage, net_price, tax_rate, tax_amount, display_order
      )
      SELECT
        qv.id,
        p.id,
        'battery',
        p.name,
        p.description,
        p.specifications,
        2,
        95000.00,
        5.0,
        90250.00,
        18.0,
        16245.00,
        3
      FROM quote_versions qv, quotes q, products p
      WHERE qv.quote_id = q.id
        AND q.quote_number = 'QT-ONEOHM-TEST-2024-0003'
        AND p.code = 'LUMINOUS-10KWH'
        AND qv.version_number = 1
      ON CONFLICT DO NOTHING;
    `);

    console.error('✓ Quote Line Items seeded (7 line items across 3 quotes)');

    // ============================================
    // SEED DEFAULT PROFILE ROLES
    // ============================================
    await seedDefaultProfileRoles(dataSource);

    console.error('\n✅ Database seeding completed successfully!\n');
    console.error('📊 Seeded Data Summary:');
    console.error('  - 1 Organization');
    console.error('  - 1 Super Admin User');
    console.error('  - 2 Resellers');
    console.error('  - 5 Customers (2 leads, 1 prospect, 2 active)');
    console.error('  - 2 Reseller Commissions (1 pending, 1 approved)');
    console.error('  - 9 Product Categories (hierarchical)');
    console.error('  - 6 Products (panels, inverters, batteries, mounting)');
    console.error('  - 3 Quotes (1 draft, 1 sent, 1 accepted)');
    console.error('  - 3 Quote Versions (with GST calculations & payment milestones)');
    console.error('  - 7 Quote Line Items (linked to products)');
    console.error('  - 3 Default Profile Roles (customer, reseller, employee_basic)');
    console.error('');
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
      console.error('✨ Seed script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed script failed:', error);
      process.exit(1);
    });
}

export { seed };
