import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Refactor Users and Profile Tables for Multi-Profile System
 *
 * This migration transforms the authentication system to support:
 * 1. Unified user authentication (one phone = one user)
 * 2. Multiple profiles per user (customer, reseller, employee)
 * 3. Users can have profiles across multiple organizations
 * 4. OTP-based authentication (password optional)
 *
 * Changes:
 * - Refactor users table (remove org-specific and profile fields)
 * - Rename customers → customer_profiles (add user_id)
 * - Rename resellers → reseller_profiles (add user_id)
 * - Create employee_profiles (from old user profile fields)
 */
export class RefactorUsersProfilesTables1700000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // STEP 1: Drop Foreign Key Constraints
    // ============================================

    // Drop foreign keys from user_roles
    await queryRunner.query(`
      ALTER TABLE user_roles 
      DROP CONSTRAINT IF EXISTS FK_user_roles_user_id;
    `);

    // Drop foreign keys from customers
    await queryRunner.query(`
      ALTER TABLE customers 
      DROP CONSTRAINT IF EXISTS FK_customers_created_by,
      DROP CONSTRAINT IF EXISTS FK_customers_updated_by;
    `);

    // Drop foreign keys from resellers
    await queryRunner.query(`
      ALTER TABLE resellers 
      DROP CONSTRAINT IF EXISTS FK_resellers_created_by,
      DROP CONSTRAINT IF EXISTS FK_resellers_updated_by;
    `);

    // ============================================
    // STEP 2: Create New Users Table Structure
    // ============================================

    // Rename old users table
    await queryRunner.query(`
      ALTER TABLE users RENAME TO users_old;
    `);

    // Create new users table (core authentication)
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Basic Info
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        
        -- Contact (Authentication)
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20) UNIQUE NOT NULL,
        
        -- Authentication
        password_hash VARCHAR(255),
        email_verified_at TIMESTAMP WITH TIME ZONE,
        phone_verified_at TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        
        -- Profile Completion
        profile_completed BOOLEAN DEFAULT false,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create indexes for new users table
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_email;
      DROP INDEX IF EXISTS idx_users_phone;
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_phone ON users(phone);
    `);

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_users
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // ============================================
    // STEP 3: Create Employee Profiles Table
    // ============================================

    await queryRunner.query(`
      CREATE TABLE employee_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        
        -- Contact (Organization-Specific)
        email VARCHAR(255),
        phone VARCHAR(20),
        alternate_phone VARCHAR(20),
        
        -- Profile
        avatar_url TEXT,
        date_of_birth DATE,
        gender VARCHAR(20),
        
        -- Address
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        pincode VARCHAR(10),
        
        -- Employment
        employee_id VARCHAR(50),
        designation VARCHAR(100),
        department VARCHAR(100),
        joining_date DATE,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by UUID,
        updated_by UUID
      );
    `);

    // Add unique constraints for employee_profiles
    await queryRunner.query(`
      ALTER TABLE employee_profiles
      ADD CONSTRAINT uq_employee_profiles_user_org UNIQUE (user_id, organization_id);
      
      ALTER TABLE employee_profiles
      ADD CONSTRAINT uq_employee_profiles_org_emp_id UNIQUE (organization_id, employee_id);
    `);

    // Create indexes for employee_profiles
    await queryRunner.query(`
      CREATE INDEX idx_employee_profiles_user_org ON employee_profiles(user_id, organization_id);
      CREATE INDEX idx_employee_profiles_org_status ON employee_profiles(organization_id, status, deleted_at);
      CREATE INDEX idx_employee_profiles_department ON employee_profiles(department, deleted_at);
    `);

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_employee_profiles
      BEFORE UPDATE ON employee_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // ============================================
    // STEP 4: Rename and Refactor Customers Table
    // ============================================

    // Rename customers to customer_profiles
    await queryRunner.query(`
      ALTER TABLE customers RENAME TO customer_profiles;
    `);

    // Add user_id column
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD COLUMN user_id UUID;
    `);

    // Drop old organization_id constraint and make nullable
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ALTER COLUMN organization_id DROP NOT NULL;
    `);

    // Create unique constraint
    await queryRunner.query(`
      ALTER TABLE customer_profiles
      ADD CONSTRAINT uq_customer_profiles_user_org UNIQUE (user_id, organization_id);
    `);

    // Update indexes (drop old, create new)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customers_organization_id_status_deleted_at;
      CREATE INDEX idx_customer_profiles_user_org ON customer_profiles(user_id, organization_id);
      CREATE INDEX idx_customer_profiles_org_status ON customer_profiles(organization_id, status, deleted_at);
      CREATE INDEX idx_customer_profiles_phone ON customer_profiles(phone) WHERE deleted_at IS NULL;
      CREATE INDEX idx_customer_profiles_email ON customer_profiles(email) WHERE deleted_at IS NULL;
      CREATE INDEX idx_customer_profiles_consumer_number ON customer_profiles(consumer_number) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // STEP 5: Rename and Refactor Resellers Table
    // ============================================

    // Rename resellers to reseller_profiles
    await queryRunner.query(`
      ALTER TABLE resellers RENAME TO reseller_profiles;
    `);

    // Add user_id column
    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ADD COLUMN user_id UUID;
    `);

    // Make fields nullable that were required
    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ALTER COLUMN contact_person_name DROP NOT NULL,
      ALTER COLUMN email DROP NOT NULL,
      ALTER COLUMN phone DROP NOT NULL;
    `);

    // Drop old organization_id constraint
    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ALTER COLUMN organization_id DROP NOT NULL;
    `);

    // Create unique constraint
    await queryRunner.query(`
      ALTER TABLE reseller_profiles
      ADD CONSTRAINT uq_reseller_profiles_user_org UNIQUE (user_id, organization_id);
    `);

    // Add unique constraint for organization + company_code
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resellers_organization_id_company_code;
      ALTER TABLE reseller_profiles
      ADD CONSTRAINT uq_reseller_profiles_org_company_code UNIQUE (organization_id, company_code);
    `);

    // Update indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resellers_organization_id_status_deleted_at;
      CREATE INDEX idx_reseller_profiles_user_org ON reseller_profiles(user_id, organization_id);
      CREATE INDEX idx_reseller_profiles_org_status ON reseller_profiles(organization_id, status, deleted_at);
      CREATE INDEX idx_reseller_profiles_email ON reseller_profiles(email) WHERE deleted_at IS NULL;
      CREATE INDEX idx_reseller_profiles_phone ON reseller_profiles(phone) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // STEP 5.5: Update Foreign Keys in Other Tables
    // ============================================
    // After renaming customers→customer_profiles and resellers→reseller_profiles,
    // we need to update all FKs in other tables that reference them

    // Drop and recreate FK constraints that reference customer_profiles (was customers)
    await queryRunner.query(`
      -- quotes table
      ALTER TABLE quotes 
      DROP CONSTRAINT IF EXISTS FK_quotes_customer_id;
      
      ALTER TABLE quotes 
      ADD CONSTRAINT FK_quotes_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      -- projects table
      ALTER TABLE projects 
      DROP CONSTRAINT IF EXISTS FK_projects_customer_id;
      
      ALTER TABLE projects 
      ADD CONSTRAINT FK_projects_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      -- payments table
      ALTER TABLE payments 
      DROP CONSTRAINT IF EXISTS fk_payments_customer;
      
      ALTER TABLE payments 
      ADD CONSTRAINT FK_payments_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      -- documents table
      ALTER TABLE documents 
      DROP CONSTRAINT IF EXISTS FK_documents_customer_id;
      
      ALTER TABLE documents 
      ADD CONSTRAINT FK_documents_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      -- service_requests table
      ALTER TABLE service_requests 
      DROP CONSTRAINT IF EXISTS FK_service_requests_customer_id;
      
      ALTER TABLE service_requests 
      ADD CONSTRAINT FK_service_requests_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      -- customer_feedback table
      ALTER TABLE customer_feedback 
      DROP CONSTRAINT IF EXISTS FK_customer_feedback_customer_id;
      
      ALTER TABLE customer_feedback 
      ADD CONSTRAINT FK_customer_feedback_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      -- loan_applications table
      ALTER TABLE loan_applications 
      DROP CONSTRAINT IF EXISTS FK_loan_applications_customer_id;
      
      ALTER TABLE loan_applications 
      ADD CONSTRAINT FK_loan_applications_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      -- subsidy_applications table
      ALTER TABLE subsidy_applications 
      DROP CONSTRAINT IF EXISTS FK_subsidy_applications_customer_id;
      
      ALTER TABLE subsidy_applications 
      ADD CONSTRAINT FK_subsidy_applications_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE;
    `);

    // Drop and recreate FK constraints that reference reseller_profiles (was resellers)
    await queryRunner.query(`
      -- customer_profiles.reseller_id
      ALTER TABLE customer_profiles 
      DROP CONSTRAINT IF EXISTS FK_customers_reseller_id;
      
      ALTER TABLE customer_profiles 
      ADD CONSTRAINT FK_customer_profiles_reseller_id 
      FOREIGN KEY (reseller_id) REFERENCES reseller_profiles(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      -- quotes.reseller_id
      ALTER TABLE quotes 
      DROP CONSTRAINT IF EXISTS FK_quotes_reseller_id;
      
      ALTER TABLE quotes 
      ADD CONSTRAINT FK_quotes_reseller_id 
      FOREIGN KEY (reseller_id) REFERENCES reseller_profiles(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      -- reseller_commissions.reseller_id
      ALTER TABLE reseller_commissions 
      DROP CONSTRAINT IF EXISTS FK_reseller_commissions_reseller_id;
      
      ALTER TABLE reseller_commissions 
      ADD CONSTRAINT FK_reseller_commissions_reseller_id 
      FOREIGN KEY (reseller_id) REFERENCES reseller_profiles(id) ON DELETE CASCADE;
    `);

    // ============================================
    // STEP 6: Add Foreign Key Constraints
    // ============================================

    // User_roles
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT FK_user_roles_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

    // Employee profiles (user_id and organization_id)
    await queryRunner.query(`
      ALTER TABLE employee_profiles 
      ADD CONSTRAINT FK_employee_profiles_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_profiles 
      ADD CONSTRAINT FK_employee_profiles_organization_id 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_profiles 
      ADD CONSTRAINT FK_employee_profiles_created_by 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_profiles 
      ADD CONSTRAINT FK_employee_profiles_updated_by 
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Customer profiles
    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD CONSTRAINT FK_customer_profiles_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD CONSTRAINT FK_customer_profiles_organization_id 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD CONSTRAINT FK_customer_profiles_created_by 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE customer_profiles 
      ADD CONSTRAINT FK_customer_profiles_updated_by 
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Reseller profiles
    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ADD CONSTRAINT FK_reseller_profiles_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ADD CONSTRAINT FK_reseller_profiles_organization_id 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ADD CONSTRAINT FK_reseller_profiles_created_by 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ADD CONSTRAINT FK_reseller_profiles_updated_by 
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // ============================================
    // STEP 7: Drop Old Users Table
    // ============================================
    await queryRunner.query(`
      DROP TABLE IF EXISTS users_old CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // STEP 1: Recreate users_old table (backup)
    // ============================================
    // Note: This won't restore data, just structure for rollback safety

    // ============================================
    // STEP 2: Drop Foreign Key Constraints (Reverse of Step 6)
    // ============================================

    // Employee profiles
    await queryRunner.query(`
      ALTER TABLE employee_profiles DROP CONSTRAINT IF EXISTS FK_employee_profiles_updated_by;
      ALTER TABLE employee_profiles DROP CONSTRAINT IF EXISTS FK_employee_profiles_created_by;
      ALTER TABLE employee_profiles DROP CONSTRAINT IF EXISTS FK_employee_profiles_organization_id;
      ALTER TABLE employee_profiles DROP CONSTRAINT IF EXISTS FK_employee_profiles_user_id;
    `);

    // Reseller profiles
    await queryRunner.query(`
      ALTER TABLE reseller_profiles DROP CONSTRAINT IF EXISTS FK_reseller_profiles_updated_by;
      ALTER TABLE reseller_profiles DROP CONSTRAINT IF EXISTS FK_reseller_profiles_created_by;
      ALTER TABLE reseller_profiles DROP CONSTRAINT IF EXISTS FK_reseller_profiles_organization_id;
      ALTER TABLE reseller_profiles DROP CONSTRAINT IF EXISTS FK_reseller_profiles_user_id;
    `);

    // Customer profiles
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS FK_customer_profiles_updated_by;
      ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS FK_customer_profiles_created_by;
      ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS FK_customer_profiles_organization_id;
      ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS FK_customer_profiles_user_id;
    `);

    // User roles
    await queryRunner.query(`
      ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS FK_user_roles_user_id;
    `);

    // ============================================
    // STEP 3: Restore Foreign Keys in Other Tables (Reverse of Step 5.5)
    // ============================================

    // Reseller commissions
    await queryRunner.query(`
      ALTER TABLE reseller_commissions DROP CONSTRAINT IF EXISTS FK_reseller_commissions_reseller_id;
      ALTER TABLE reseller_commissions 
      ADD CONSTRAINT FK_reseller_commissions_reseller_id 
      FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE CASCADE;
    `);

    // Quotes reseller
    await queryRunner.query(`
      ALTER TABLE quotes DROP CONSTRAINT IF EXISTS FK_quotes_reseller_id;
      ALTER TABLE quotes 
      ADD CONSTRAINT FK_quotes_reseller_id 
      FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE SET NULL;
    `);

    // Customer profiles reseller
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS FK_customer_profiles_reseller_id;
      ALTER TABLE customer_profiles 
      ADD CONSTRAINT FK_customers_reseller_id 
      FOREIGN KEY (reseller_id) REFERENCES resellers(id) ON DELETE SET NULL;
    `);

    // Subsidy applications
    await queryRunner.query(`
      ALTER TABLE subsidy_applications DROP CONSTRAINT IF EXISTS FK_subsidy_applications_customer_id;
      ALTER TABLE subsidy_applications 
      ADD CONSTRAINT FK_subsidy_applications_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // Loan applications
    await queryRunner.query(`
      ALTER TABLE loan_applications DROP CONSTRAINT IF EXISTS FK_loan_applications_customer_id;
      ALTER TABLE loan_applications 
      ADD CONSTRAINT FK_loan_applications_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // Customer feedback
    await queryRunner.query(`
      ALTER TABLE customer_feedback DROP CONSTRAINT IF EXISTS FK_customer_feedback_customer_id;
      ALTER TABLE customer_feedback 
      ADD CONSTRAINT FK_customer_feedback_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // Service requests
    await queryRunner.query(`
      ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS FK_service_requests_customer_id;
      ALTER TABLE service_requests 
      ADD CONSTRAINT FK_service_requests_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // Documents
    await queryRunner.query(`
      ALTER TABLE documents DROP CONSTRAINT IF EXISTS FK_documents_customer_id;
      ALTER TABLE documents 
      ADD CONSTRAINT FK_documents_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    `);

    // Payments
    await queryRunner.query(`
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS FK_payments_customer_id;
      ALTER TABLE payments 
      ADD CONSTRAINT fk_payments_customer 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // Projects
    await queryRunner.query(`
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS FK_projects_customer_id;
      ALTER TABLE projects 
      ADD CONSTRAINT FK_projects_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // Quotes
    await queryRunner.query(`
      ALTER TABLE quotes DROP CONSTRAINT IF EXISTS FK_quotes_customer_id;
      ALTER TABLE quotes 
      ADD CONSTRAINT FK_quotes_customer_id 
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    `);

    // ============================================
    // STEP 4: Revert Reseller Profiles (Reverse of Step 5)
    // ============================================

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_reseller_profiles_phone;
      DROP INDEX IF EXISTS idx_reseller_profiles_email;
      DROP INDEX IF EXISTS idx_reseller_profiles_org_status;
      DROP INDEX IF EXISTS idx_reseller_profiles_user_org;
    `);

    // Drop unique constraints
    await queryRunner.query(`
      ALTER TABLE reseller_profiles DROP CONSTRAINT IF EXISTS uq_reseller_profiles_org_company_code;
      ALTER TABLE reseller_profiles DROP CONSTRAINT IF EXISTS uq_reseller_profiles_user_org;
    `);

    // Restore NOT NULL constraints
    await queryRunner.query(`
      ALTER TABLE reseller_profiles 
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN phone SET NOT NULL,
      ALTER COLUMN email SET NOT NULL,
      ALTER COLUMN contact_person_name SET NOT NULL;
    `);

    // Drop user_id column
    await queryRunner.query(`
      ALTER TABLE reseller_profiles DROP COLUMN IF EXISTS user_id;
    `);

    // Rename back to resellers
    await queryRunner.query(`
      ALTER TABLE reseller_profiles RENAME TO resellers;
    `);

    // Recreate old indexes
    await queryRunner.query(`
      CREATE INDEX idx_resellers_organization_id_status_deleted_at 
      ON resellers(organization_id, status, deleted_at);
      
      CREATE INDEX idx_resellers_organization_id_company_code 
      ON resellers(organization_id, company_code);
    `);

    // ============================================
    // STEP 5: Revert Customer Profiles (Reverse of Step 4)
    // ============================================

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_profiles_consumer_number;
      DROP INDEX IF EXISTS idx_customer_profiles_email;
      DROP INDEX IF EXISTS idx_customer_profiles_phone;
      DROP INDEX IF EXISTS idx_customer_profiles_org_status;
      DROP INDEX IF EXISTS idx_customer_profiles_user_org;
    `);

    // Drop unique constraint
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP CONSTRAINT IF EXISTS uq_customer_profiles_user_org;
    `);

    // Restore NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE customer_profiles ALTER COLUMN organization_id SET NOT NULL;
    `);

    // Drop user_id column
    await queryRunner.query(`
      ALTER TABLE customer_profiles DROP COLUMN IF EXISTS user_id;
    `);

    // Rename back to customers
    await queryRunner.query(`
      ALTER TABLE customer_profiles RENAME TO customers;
    `);

    // Recreate old indexes
    await queryRunner.query(`
      CREATE INDEX idx_customers_organization_id_status_deleted_at 
      ON customers(organization_id, status, deleted_at);
    `);

    // ============================================
    // STEP 6: Drop Employee Profiles Table (Reverse of Step 3)
    // ============================================

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS set_timestamp_employee_profiles ON employee_profiles;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employee_profiles_department;
      DROP INDEX IF EXISTS idx_employee_profiles_org_status;
      DROP INDEX IF EXISTS idx_employee_profiles_user_org;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS employee_profiles CASCADE;
    `);

    // ============================================
    // STEP 7: Restore Old Users Table (Reverse of Step 2)
    // ============================================

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS set_timestamp_users ON users;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_phone;
      DROP INDEX IF EXISTS idx_users_email;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS users CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE users_old RENAME TO users;
    `);

    // ============================================
    // STEP 8: Restore Original Foreign Keys (Reverse of Step 1)
    // ============================================

    // Restore resellers foreign keys
    await queryRunner.query(`
      ALTER TABLE resellers 
      ADD CONSTRAINT FK_resellers_updated_by 
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
      
      ALTER TABLE resellers 
      ADD CONSTRAINT FK_resellers_created_by 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Restore customers foreign keys
    await queryRunner.query(`
      ALTER TABLE customers 
      ADD CONSTRAINT FK_customers_updated_by 
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
      
      ALTER TABLE customers 
      ADD CONSTRAINT FK_customers_created_by 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Restore user_roles foreign key
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT FK_user_roles_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
  }
}
