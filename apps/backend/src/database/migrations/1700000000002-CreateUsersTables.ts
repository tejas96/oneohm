import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTables1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // USERS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        
        -- Personal Info
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        alternate_phone VARCHAR(20),
        
        -- Authentication
        password_hash VARCHAR(255) NOT NULL,
        email_verified_at TIMESTAMP WITH TIME ZONE,
        phone_verified_at TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        
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

    // Create indexes for users table
    await queryRunner.query(`
      CREATE INDEX idx_users_organization ON users(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_department ON users(department) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // USER_ROLES TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        
        UNIQUE(user_id, role)
      );
    `);

    // Create indexes for user_roles table
    await queryRunner.query(`
      CREATE INDEX idx_user_roles_user ON user_roles(user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_user_roles_role ON user_roles(role);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user_roles table
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles CASCADE;`);

    // Drop users table
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
  }
}
