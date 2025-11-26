import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * E2E Test User Migration - Sanjay Patil
 * Creates a complete test user with all 3 profiles: Customer, Employee, and Reseller
 * 
 * Test Credentials:
 * - Phone: +919000000000
 * - Email: sanjay@test.com
 * - Name: Sanjay Patil
 * - Password: Test@123456
 * - OTP: 123456 (development mode)
 */
export class CreateTestUserSanjayPatil1732604400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // STEP 1: Create Default Test Organization
    // ========================================
    const orgId = '00000000-0000-0000-0000-000000000001'; // Fixed UUID for test org
    
    await queryRunner.query(`
      INSERT INTO organizations (
        id,
        name,
        code,
        email,
        phone,
        address,
        city,
        state,
        country,
        pincode,
        status,
        created_at,
        updated_at
      ) VALUES (
        '${orgId}',
        'OneOhm Test Organization',
        'ONEOHM-TEST-ORG',
        'test@oneohm.com',
        '+919876543210',
        '1st Floor, Tech Park, Whitefield',
        'Bangalore',
        'Karnataka',
        'India',
        '560066',
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW()
    `);
    
    const organizationId = orgId;
    console.log(`✅ Created/Updated test organization: OneOhm Test Organization (${organizationId})`);

    // ========================================
    // STEP 2: Create Base User
    // ========================================
    const passwordHash = await bcrypt.hash('Test@123456', 10);
    const userId = '11111111-1111-1111-1111-111111111111'; // Fixed UUID for testing
    
    // Check if user already exists
    const existingUser = await queryRunner.query(`
      SELECT id FROM users WHERE id = '${userId}' OR phone = '+919000000000' OR email = 'sanjay@test.com'
    `);
    
    if (existingUser.length > 0) {
      console.log(`ℹ️  User already exists, skipping user creation`);
    } else {
      await queryRunner.query(`
        INSERT INTO users (
          id,
          first_name,
          last_name,
          email,
          phone,
          password_hash,
          status,
          profile_completed,
          phone_verified_at,
          email_verified_at,
          created_at,
          updated_at
        ) VALUES (
          '${userId}',
          'Sanjay',
          'Patil',
          'sanjay@test.com',
          '+919000000000',
          '${passwordHash}',
          'active',
          true,
          NOW(),
          NOW(),
          NOW(),
          NOW()
        )
      `);
      console.log(`✅ Created user: Sanjay Patil (${userId})`);
    }

    // ========================================
    // STEP 3: Create Customer Profile
    // ========================================
    await queryRunner.query(`
      INSERT INTO customer_profiles (
        id,
        user_id,
        organization_id,
        email,
        phone,
        address,
        city,
        state,
        country,
        pincode,
        consumer_number,
        consumer_name,
        property_type,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        '${userId}',
        '${organizationId}',
        'sanjay@test.com',
        '+919000000000',
        '123, Test Street, Model Town',
        'Mumbai',
        'Maharashtra',
        'India',
        '400001',
        'CUST-TEST-111111',
        'Sanjay Patil House',
        'residential',
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, organization_id) DO NOTHING
    `);
    console.log(`✅ Created customer profile`);

    // ========================================
    // STEP 4: Create Employee Profile
    // ========================================
    await queryRunner.query(`
      INSERT INTO employee_profiles (
        id,
        user_id,
        organization_id,
        email,
        phone,
        employee_id,
        designation,
        department,
        joining_date,
        address,
        city,
        state,
        country,
        pincode,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        '${userId}',
        '${organizationId}',
        'sanjay@test.com',
        '+919000000000',
        'EMP-TEST-111111',
        'Senior Manager',
        'Sales',
        NOW(),
        '123, Test Street, Model Town',
        'Mumbai',
        'Maharashtra',
        'India',
        '400001',
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, organization_id) DO NOTHING
    `);
    console.log(`✅ Created employee profile`);

    // ========================================
    // STEP 5: Create Reseller Profile
    // ========================================
    await queryRunner.query(`
      INSERT INTO reseller_profiles (
        id,
        user_id,
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
        gstin,
        pan,
        commission_percentage,
        commission_min_percentage,
        commission_max_percentage,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        '${userId}',
        '${organizationId}',
        'Patil Solar Solutions',
        'PSS-TEST-111111',
        'Sanjay Patil',
        'sanjay@test.com',
        '+919000000000',
        '456, Business Park, Andheri East',
        'Mumbai',
        'Maharashtra',
        'India',
        '400001',
        '27ABCDE1234F1Z5',
        'ABCDE1234F',
        5.0,
        2.0,
        10.0,
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, organization_id) DO NOTHING
    `);
    console.log(`✅ Created reseller profile`);

    // ========================================
    // STEP 6: Create Default Roles for Organization (if not exist)
    // ========================================
    // Check if roles already exist for this organization
    const existingRoles = await queryRunner.query(`
      SELECT code FROM roles 
      WHERE code IN ('customer', 'employee_basic', 'reseller') 
      AND organization_id = '${organizationId}'
    `);
    
    const existingRoleCodes = existingRoles.map((r: any) => r.code);
    
    if (!existingRoleCodes.includes('customer')) {
      await queryRunner.query(`
        INSERT INTO roles (id, name, code, description, organization_id, created_at, updated_at) 
        VALUES (
          'e4087673-d1f2-4cf3-9bdb-74575a5aec75', 
          'Customer', 
          'customer', 
          'Default role for customer profiles',
          '${organizationId}',
          NOW(), 
          NOW()
        )
      `);
      console.log(`✅ Created role: customer (organization-specific)`);
    }
    
    if (!existingRoleCodes.includes('employee_basic')) {
      await queryRunner.query(`
        INSERT INTO roles (id, name, code, description, organization_id, created_at, updated_at) 
        VALUES (
          '221a873a-36da-4b41-84fe-faad7dc4a2c0', 
          'Employee (Basic)', 
          'employee_basic', 
          'Default role for employee profiles',
          '${organizationId}',
          NOW(), 
          NOW()
        )
      `);
      console.log(`✅ Created role: employee_basic (organization-specific)`);
    }
    
    if (!existingRoleCodes.includes('reseller')) {
      await queryRunner.query(`
        INSERT INTO roles (id, name, code, description, organization_id, created_at, updated_at) 
        VALUES (
          '3afc4223-d748-41fb-b7df-8171d44f7954', 
          'Reseller', 
          'reseller', 
          'Default role for reseller profiles',
          '${organizationId}',
          NOW(), 
          NOW()
        )
      `);
      console.log(`✅ Created role: reseller (organization-specific)`);
    }
    
    console.log(`✅ Verified all default roles exist for organization`);

    // ========================================
    // STEP 7: Assign Roles
    // ========================================
    // Get role IDs
    const rolesResult = await queryRunner.query(`
      SELECT id, code FROM roles WHERE code IN ('customer', 'employee_basic', 'reseller')
    `);
    
    if (!rolesResult || rolesResult.length === 0) {
      console.warn('⚠️  Warning: Default roles not found. Skipping role assignment.');
    } else {
      for (const role of rolesResult) {
        // Check if role already assigned
        const existingRole = await queryRunner.query(`
          SELECT id FROM user_roles 
          WHERE user_id = '${userId}' 
          AND role_id = '${role.id}' 
          AND organization_id = '${organizationId}'
        `);
        
        if (existingRole.length === 0) {
          await queryRunner.query(`
            INSERT INTO user_roles (
              user_id,
              role_id,
              role,
              organization_id,
              created_at
            ) VALUES (
              '${userId}',
              '${role.id}',
              '${role.code}',
              '${organizationId}',
              NOW()
            )
          `);
          console.log(`✅ Assigned role: ${role.code}`);
        } else {
          console.log(`ℹ️  Role ${role.code} already assigned`);
        }
      }
    }

    // ========================================
    // STEP 8: Create Test OTP Entry
    // ========================================
    const otpHash = await bcrypt.hash('123456', 10);
    await queryRunner.query(`
      INSERT INTO security_events (
        id,
        event_type,
        event_category,
        severity,
        status,
        user_id,
        organization_id,
        ip_address,
        metadata,
        expires_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'otp_sent',
        'authentication',
        'info',
        'pending',
        '${userId}',
        '${organizationId}',
        '127.0.0.1',
        jsonb_build_object(
          'phone', '+919000000000',
          'otpHash', '${otpHash}',
          'expirySeconds', 300,
          'verified', false,
          'attempts', 0
        ),
        NOW() + INTERVAL '5 minutes',
        NOW(),
        NOW()
      )
    `);
    console.log(`✅ Created test OTP entry (OTP: 123456)`);

    console.log(`
    ====================================
    ✅ Test User Created Successfully!
    ====================================
    
    🏢 Organization:
    - ID: ${organizationId}
    - Name: OneOhm Test Organization
    - Code: ONEOHM-TEST-ORG
    - Email: test@oneohm.com
    
    👤 User Details:
    - ID: ${userId}
    - Name: Sanjay Patil
    - Email: sanjay@test.com
    - Phone: +919000000000
    - Password: Test@123456
    - Test OTP: 123456
    
    📊 Profiles Created:
    ✅ Customer Profile
       - Consumer Number: CUST-TEST-111111
       - Address: 123, Test Street, Model Town, Mumbai
    
    ✅ Employee Profile
       - Employee ID: EMP-TEST-111111
       - Designation: Senior Manager
       - Department: Sales
    
    ✅ Reseller Profile
       - Company: Patil Solar Solutions
       - Company Code: PSS-TEST-111111
       - Commission: 5%
       - GSTIN: 27ABCDE1234F1Z5
    
    🔐 Test Credentials:
    - Login via OTP: +911111111111 (OTP: 123456)
    - Login via Password: sanjay@test.com / Test@123456
    
    🧪 API Testing:
    1. POST /api/v1/auth/otp/request {"phone": "+919000000000"}
    2. POST /api/v1/auth/otp/verify {"phone": "+919000000000", "otp": "123456"}
    3. POST /api/v1/auth/login {"email": "sanjay@test.com", "password": "Test@123456"}
    ====================================
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const userId = '11111111-1111-1111-1111-111111111111';
    const orgId = '00000000-0000-0000-0000-000000000001';
    
    console.log('🗑️  Cleaning up test user: Sanjay Patil...');
    
    // Delete in reverse order (foreign key constraints)
    await queryRunner.query(`DELETE FROM user_roles WHERE user_id = '${userId}'`);
    console.log('✅ Deleted user roles');
    
    await queryRunner.query(`DELETE FROM security_events WHERE user_id = '${userId}'`);
    console.log('✅ Deleted security events');
    
    await queryRunner.query(`DELETE FROM reseller_profiles WHERE user_id = '${userId}'`);
    console.log('✅ Deleted reseller profile');
    
    await queryRunner.query(`DELETE FROM employee_profiles WHERE user_id = '${userId}'`);
    console.log('✅ Deleted employee profile');
    
    await queryRunner.query(`DELETE FROM customer_profiles WHERE user_id = '${userId}'`);
    console.log('✅ Deleted customer profile');
    
    await queryRunner.query(`DELETE FROM users WHERE id = '${userId}'`);
    console.log('✅ Deleted user');
    
    // Delete test roles (only if no other users are using them)
    await queryRunner.query(`
      DELETE FROM roles 
      WHERE code IN ('customer', 'employee_basic', 'reseller')
      AND id IN ('e4087673-d1f2-4cf3-9bdb-74575a5aec75', '221a873a-36da-4b41-84fe-faad7dc4a2c0', '3afc4223-d748-41fb-b7df-8171d44f7954')
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.role_id = roles.id 
        AND ur.user_id != '${userId}'
      )
    `);
    console.log('✅ Deleted test roles (if unused by others)');
    
    // Only delete organization if no other data references it
    await queryRunner.query(`
      DELETE FROM organizations 
      WHERE id = '${orgId}' 
      AND NOT EXISTS (SELECT 1 FROM users WHERE users.id != '${userId}' LIMIT 1)
    `);
    console.log('✅ Deleted test organization (if no other data)');
    
    console.log('🎉 Test user cleanup complete!');
  }
}

