import * as bcrypt from 'bcrypt';

import loadConfig from '../../config/configuration';
import dataSource from '../ormconfig';

const config = loadConfig();

const ORG_CODE = 'ONEOHM';
const EMPLOYEE_PASSWORD = 'password@123';

const ORG_ROLES = [
  { code: 'super_admin', name: 'Super Admin', description: 'Full organization access', level: 1 },
  { code: 'admin', name: 'Admin', description: 'Organization admin with broad access', level: 2 },
  { code: 'sales_executive', name: 'Sales Executive', description: 'Sales and customer management', level: 3 },
  { code: 'accounts_manager', name: 'Accounts Manager', description: 'Financial and payment management', level: 3 },
  { code: 'project_manager', name: 'Project Manager', description: 'Project and team management', level: 3 },
  { code: 'inventory_manager', name: 'Inventory Manager', description: 'Inventory and vendor management', level: 3 },
  { code: 'compliance_officer', name: 'Compliance Officer', description: 'Regulatory compliance management', level: 3 },
  { code: 'employee_basic', name: 'Employee Basic', description: 'Basic employee access', level: 4 },
  { code: 'liaisoning', name: 'Liaisoning Officer', description: 'Net metering, permits, subsidy, and commissioning tasks', level: 3 },
  { code: 'design_engineer', name: 'Design Engineer', description: 'DSS work, design confirmation tasks', level: 3 },
  { code: 'store', name: 'Store Manager', description: 'Material dispatch and inventory tasks', level: 3 },
  { code: 'execution', name: 'Execution Engineer', description: 'Installation, electrical, and QC tasks', level: 3 },
  { code: 'loan', name: 'Loan Officer', description: 'Loan processing and disbursement tasks', level: 3 },
  { code: 'customer', name: 'Customer', description: 'Customer portal access', level: 5 },
  { code: 'reseller', name: 'Reseller', description: 'Reseller portal access', level: 5 },
];

const EMPLOYEES: Array<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employeeId: string;
  roles: string[];
}> = [
  { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@oneohm.com', phone: '+919876500001', designation: 'Admin', department: 'Management', employeeId: 'EMP-001', roles: ['admin'] },
  { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@oneohm.com', phone: '+919876500002', designation: 'Sales Executive', department: 'Sales', employeeId: 'EMP-002', roles: ['sales_executive'] },
  { firstName: 'Vikram', lastName: 'Desai', email: 'vikram.desai@oneohm.com', phone: '+919876500003', designation: 'Accounts Manager', department: 'Finance', employeeId: 'EMP-003', roles: ['accounts_manager'] },
  { firstName: 'Neha', lastName: 'Kulkarni', email: 'neha.kulkarni@oneohm.com', phone: '+919876500004', designation: 'Project Manager', department: 'Projects', employeeId: 'EMP-004', roles: ['project_manager'] },
  { firstName: 'Sanjay', lastName: 'Verma', email: 'sanjay.verma@oneohm.com', phone: '+919876500005', designation: 'Inventory Manager', department: 'Inventory', employeeId: 'EMP-005', roles: ['inventory_manager'] },
  { firstName: 'Deepa', lastName: 'Iyer', email: 'deepa.iyer@oneohm.com', phone: '+919876500006', designation: 'Compliance Officer', department: 'Compliance', employeeId: 'EMP-006', roles: ['compliance_officer'] },
  { firstName: 'Ajay', lastName: 'Mehta', email: 'ajay.mehta@oneohm.com', phone: '+919876500007', designation: 'Liaisoning Officer', department: 'Liaisoning', employeeId: 'EMP-007', roles: ['liaisoning'] },
  { firstName: 'Kavita', lastName: 'Rao', email: 'kavita.rao@oneohm.com', phone: '+919876500008', designation: 'Design Engineer', department: 'Engineering', employeeId: 'EMP-008', roles: ['design_engineer'] },
  { firstName: 'Suresh', lastName: 'Joshi', email: 'suresh.joshi@oneohm.com', phone: '+919876500009', designation: 'Store & Execution Lead', department: 'Operations', employeeId: 'EMP-009', roles: ['store', 'execution'] },
  { firstName: 'Anita', lastName: 'Gupta', email: 'anita.gupta@oneohm.com', phone: '+919876500010', designation: 'Loan Officer', department: 'Finance', employeeId: 'EMP-010', roles: ['loan', 'employee_basic'] },
];

async function seed(): Promise<void> {
  await dataSource.initialize();

  console.error('🌱 Starting database seeding...\n');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ============================================
    // 1. CREATE ORGANIZATION
    // ============================================
    console.error('📦 Seeding Organization...');

    await queryRunner.query(`
      INSERT INTO organizations (
        name, code, email, phone, address, city, state, country, pincode,
        gstin, pan, timezone, currency, date_format,
        default_project_timeline_weeks, default_quote_validity_days,
        max_quote_versions, status
      ) VALUES (
        'OneOhm EPC Solutions',
        $1,
        'info@oneohm.com',
        '+919876543210',
        '123 Solar Park Road, Hinjewadi Phase 2',
        'Pune',
        'Maharashtra',
        'India',
        '411057',
        '27ABCDE1234F1Z5',
        'ABCDE1234F',
        'Asia/Kolkata',
        'INR',
        'DD-MM-YYYY',
        4, 30, 3,
        'active'
      )
      ON CONFLICT (code) DO NOTHING;
    `, [ORG_CODE]);

    console.error('  ✓ Organization created');

    // ============================================
    // 2. SEED ORG-LEVEL ROLES (idempotent)
    // ============================================
    console.error('\n🔐 Seeding Roles...');

    const [org] = await queryRunner.query(
      `SELECT id FROM organizations WHERE code = $1`,
      [ORG_CODE],
    );

    if (!org) {
      throw new Error(`Organization with code '${ORG_CODE}' not found after insert`);
    }

    const orgId: string = org.id;

    for (const role of ORG_ROLES) {
      const existing = await queryRunner.query(
        `SELECT id FROM roles WHERE organization_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
        [orgId, role.code],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO roles (id, organization_id, code, name, description, is_system_role, level, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, NOW(), NOW())`,
          [orgId, role.code, role.name, role.description, role.level],
        );
      }
    }

    console.error(`  ✓ ${ORG_ROLES.length} roles ensured`);

    // ============================================
    // 3. CREATE SUPER ADMIN USER
    // ============================================
    console.error('\n👤 Seeding Super Admin...');

    const adminEmail = config.seed.platformAdminEmail;
    const adminPhone = config.seed.platformAdminPhone;
    const adminPasswordHash = await bcrypt.hash(config.seed.platformAdminPassword, 10);

    await upsertUser(queryRunner, 'Super', 'Admin', adminEmail, adminPhone, adminPasswordHash);

    const [adminUser] = await queryRunner.query(
      `SELECT id FROM users WHERE phone = $1`,
      [adminPhone],
    );

    if (!adminUser) {
      throw new Error('Super Admin user not found after insert');
    }

    await queryRunner.query(
      `INSERT INTO employee_profiles (user_id, organization_id, email, phone, designation, department, employee_id, status)
       VALUES ($1, $2, $3, $4, 'Super Admin', 'Management', 'EMP-000', 'active')
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [adminUser.id, orgId, adminEmail, adminPhone],
    );

    await assignRole(queryRunner, adminUser.id, orgId, 'super_admin');

    console.error(`  ✓ Super Admin created (${adminEmail})`);

    // ============================================
    // 4. CREATE 10 EMPLOYEES
    // ============================================
    console.error('\n👥 Seeding 10 Employees...');

    const empPasswordHash = await bcrypt.hash(EMPLOYEE_PASSWORD, 10);

    for (const emp of EMPLOYEES) {
      await upsertUser(queryRunner, emp.firstName, emp.lastName, emp.email, emp.phone, empPasswordHash);

      const [user] = await queryRunner.query(
        `SELECT id FROM users WHERE phone = $1`,
        [emp.phone],
      );

      if (!user) {
        console.error(`  ⚠ Could not find user for ${emp.email}, skipping`);
        continue;
      }

      await queryRunner.query(
        `INSERT INTO employee_profiles (user_id, organization_id, email, phone, designation, department, employee_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT (user_id, organization_id) DO NOTHING`,
        [user.id, orgId, emp.email, emp.phone, emp.designation, emp.department, emp.employeeId],
      );

      for (const roleCode of emp.roles) {
        await assignRole(queryRunner, user.id, orgId, roleCode);
      }

      console.error(`  ✓ ${emp.firstName} ${emp.lastName} → ${emp.roles.join(', ')}`);
    }

    // ============================================
    // 5. CREATE CUSTOMER + PROPERTY
    // ============================================
    console.error('\n🏠 Seeding Customer & Property...');

    const customerPhone = '+919876500100';
    const customerEmail = 'amit.patel@example.com';

    await upsertUser(queryRunner, 'Amit', 'Patel', customerEmail, customerPhone, empPasswordHash, false);

    const [customerUser] = await queryRunner.query(
      `SELECT id FROM users WHERE phone = $1`,
      [customerPhone],
    );

    if (!customerUser) {
      throw new Error('Customer user not found after insert');
    }

    await queryRunner.query(
      `INSERT INTO customer_profiles (
         user_id, organization_id, customer_code,
         first_name, last_name, email, phone,
         address, city, state, country, pincode,
         lead_source, status, created_by
       ) VALUES (
         $1, $2, 'CUST-001',
         'Amit', 'Patel', $3, $4,
         '101 Sunshine Apartments, MG Road',
         'Pune', 'Maharashtra', 'India', '411001',
         'Website', 'active', $5
       )
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [customerUser.id, orgId, customerEmail, customerPhone, adminUser.id],
    );

    const [customerProfile] = await queryRunner.query(
      `SELECT id FROM customer_profiles WHERE user_id = $1 AND organization_id = $2`,
      [customerUser.id, orgId],
    );

    if (!customerProfile) {
      throw new Error('Customer profile not found after insert');
    }

    await queryRunner.query(
      `INSERT INTO customer_properties (
         customer_id, organization_id, property_code, property_name,
         property_type, address, city, state, country, pincode,
         consumer_number, consumer_name, current_load,
         connection_type, sanctioned_load, monthly_bill,
         lead_temperature, is_primary, status, created_by
       ) VALUES (
         $1, $2, 'PROP-001', 'Sunshine Apartments',
         'residential', '101 Sunshine Apartments, MG Road',
         'Pune', 'Maharashtra', 'India', '411001',
         'MH12345678', 'AMIT PATEL', '5 KW',
         'single_phase', 5.00, 2500.00,
         'warm', true, 'active', $3
       )
       ON CONFLICT (property_code) DO NOTHING`,
      [customerProfile.id, orgId, adminUser.id],
    );

    await assignRole(queryRunner, customerUser.id, orgId, 'customer');

    console.error('  ✓ Customer: Amit Patel + Property: Sunshine Apartments');

    // ============================================
    // 6. CREATE QUOTE CONFIGURATION
    // ============================================
    console.error('\n⚙️  Seeding Quote Configuration...');

    const existingConfig = await queryRunner.query(
      `SELECT id FROM quote_configurations WHERE organization_id = $1 LIMIT 1`,
      [orgId],
    );

    if (existingConfig.length === 0) {
      await queryRunner.query(
        `INSERT INTO quote_configurations (
           organization_id,
           default_validity_days,
           max_versions,
           default_completion_weeks,
           gst_config,
           wattage_rounding,
           payment_milestones,
           show_inventory_stock,
           is_active
         ) VALUES (
           $1, 30, 3, 4,
           '{"rate1": 5, "rate1Percentage": 70, "rate2": 18, "rate2Percentage": 30}',
           '{"roundTo": 10, "roundUpThreshold": 5}',
           '[{"stage":"advance","name":"Advance","percentage":10,"order":1},{"stage":"installation_complete","name":"Installation Complete","percentage":85,"order":2},{"stage":"commissioning","name":"Commissioning","percentage":5,"order":3}]',
           true,
           true
         )`,
        [orgId],
      );
    }

    console.error('  ✓ Quote configuration created');

    // ============================================
    // COMMIT TRANSACTION
    // ============================================
    await queryRunner.commitTransaction();

    // ============================================
    // SUMMARY
    // ============================================
    console.error(`\n${'='.repeat(50)}`);
    console.error('✅ Database seeding completed!\n');
    console.error('📊 Seeded Data:');
    console.error('  • 1 Organization (ONEOHM)');
    console.error(`  • 1 Super Admin (${adminEmail})`);
    console.error('  • 10 Employees');
    console.error('  • 1 Customer (Amit Patel) + 1 Property');
    console.error('  • 1 Quote Configuration');
    console.error(`  • ${ORG_ROLES.length} Org Roles`);
    console.error('\n📋 Employee Roster:');
    for (const emp of EMPLOYEES) {
      console.error(`  ${emp.employeeId} ${emp.firstName} ${emp.lastName} — ${emp.roles.join(', ')}`);
    }
    console.error(`\n${'='.repeat(50)}`);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

async function upsertUser(
  queryRunner: import('typeorm').QueryRunner,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  passwordHash: string,
  profileCompleted = true,
): Promise<void> {
  const existing = await queryRunner.query(
    `SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1`,
    [email, phone],
  );
  if (existing.length > 0) return;

  await queryRunner.query(
    `INSERT INTO users (first_name, last_name, email, phone, password_hash, status, profile_completed)
     VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
    [firstName, lastName, email, phone, passwordHash, profileCompleted],
  );
}

async function assignRole(
  queryRunner: import('typeorm').QueryRunner,
  userId: string,
  orgId: string,
  roleCode: string,
): Promise<void> {
  const existing = await queryRunner.query(
    `SELECT 1 FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND r.code = $2 AND r.organization_id = $3
     LIMIT 1`,
    [userId, roleCode, orgId],
  );

  if (existing.length > 0) return;

  await queryRunner.query(
    `INSERT INTO user_roles (user_id, role, role_id, organization_id, created_by)
     SELECT $1, $2, r.id, $3, $1
     FROM roles r
     WHERE r.code = $2 AND r.organization_id = $3 AND r.deleted_at IS NULL
     LIMIT 1`,
    [userId, roleCode, orgId],
  );
}

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
