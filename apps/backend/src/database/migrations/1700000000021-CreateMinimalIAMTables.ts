import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Create Minimal IAM Tables (4 Core Tables)
 * Module 2: IAM - Features, Roles & Permissions
 *
 * Simplified IAM system with only essential tables:
 * 1. features - Application features/modules
 * 2. permissions - Granular permissions tied to features
 * 3. roles - Dynamic roles (replaces hardcoded enum)
 * 4. role_permissions - Many-to-many: roles ↔ permissions
 *
 * Removed optional tables for simplicity:
 * - permission_conditions (ABAC - can add later)
 * - role_feature_access (feature licensing - can add later)
 * - organization_feature_config (org licensing - can add later)
 */
export class CreateMinimalIAMTables1700000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // TABLE 1: features
    // ============================================
    await queryRunner.query(`
      CREATE TABLE features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Feature Info
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        
        -- UI Metadata
        icon VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        
        -- Grouping (hierarchical features)
        parent_feature_id UUID,
        
        -- Feature Type: module, sub_feature, component, workflow
        feature_type VARCHAR(50) DEFAULT 'module' CHECK (feature_type IN (
          'module',
          'sub_feature',
          'component',
          'workflow'
        )),
        
        -- Access Control
        requires_license BOOLEAN DEFAULT FALSE,
        license_tier VARCHAR(50),
        
        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        is_system_feature BOOLEAN DEFAULT TRUE,
        
        -- Metadata (JSONB for extensibility)
        metadata JSONB,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Foreign key for parent_feature_id
    await queryRunner.query(`
      ALTER TABLE features 
      ADD CONSTRAINT fk_features_parent 
      FOREIGN KEY (parent_feature_id) 
      REFERENCES features(id) 
      ON DELETE SET NULL;
    `);

    // Indexes for features
    await queryRunner.query(`
      CREATE INDEX idx_features_code ON features(code);
      CREATE INDEX idx_features_parent ON features(parent_feature_id);
      CREATE INDEX idx_features_type ON features(feature_type) WHERE is_active = TRUE;
      CREATE INDEX idx_features_active ON features(is_active) WHERE is_active = TRUE;
    `);

    // Trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_features
      BEFORE UPDATE ON features
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // ============================================
    // TABLE 2: permissions
    // ============================================
    await queryRunner.query(`
      CREATE TABLE permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Link to Feature
        feature_id UUID NOT NULL,
        
        -- Permission Details
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        
        -- Action Type (create, read, update, delete, approve, etc.)
        action VARCHAR(50) NOT NULL,
        
        -- Scope/Context: all, own, department, assigned, custom
        scope VARCHAR(50) DEFAULT 'all' CHECK (scope IN (
          'all',
          'own',
          'department',
          'assigned',
          'custom'
        )),
        
        -- Conditional Access (JSONB for complex rules)
        conditions JSONB,
        
        -- Permission Level: basic, standard, advanced, admin
        permission_level VARCHAR(50) DEFAULT 'standard' CHECK (permission_level IN (
          'basic',
          'standard',
          'advanced',
          'admin'
        )),
        
        -- UI Access Control
        show_in_menu BOOLEAN DEFAULT TRUE,
        menu_label VARCHAR(255),
        
        -- Dependencies (array of permission IDs)
        depends_on_permission_ids UUID[],
        
        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        is_system_permission BOOLEAN DEFAULT TRUE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_permissions_feature 
          FOREIGN KEY (feature_id) 
          REFERENCES features(id) 
          ON DELETE CASCADE
      );
    `);

    // Indexes for permissions
    await queryRunner.query(`
      CREATE INDEX idx_permissions_feature ON permissions(feature_id) WHERE is_active = TRUE;
      CREATE INDEX idx_permissions_code ON permissions(code);
      CREATE INDEX idx_permissions_action ON permissions(action);
      CREATE INDEX idx_permissions_scope ON permissions(scope);
    `);

    // Trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_permissions
      BEFORE UPDATE ON permissions
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // ============================================
    // TABLE 3: roles (replaces hardcoded enum)
    // ============================================
    await queryRunner.query(`
      CREATE TABLE roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        
        -- Role hierarchy
        parent_role_id UUID,
        level INTEGER DEFAULT 0,
        
        -- System roles (cannot be deleted)
        is_system_role BOOLEAN DEFAULT FALSE,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        CONSTRAINT uq_roles_org_code UNIQUE(organization_id, code),
        CONSTRAINT fk_roles_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_roles_parent 
          FOREIGN KEY (parent_role_id) 
          REFERENCES roles(id) 
          ON DELETE SET NULL
      );
    `);

    // Indexes for roles
    await queryRunner.query(`
      CREATE INDEX idx_roles_organization ON roles(organization_id) WHERE deleted_at IS NULL;
      CREATE INDEX idx_roles_parent ON roles(parent_role_id) WHERE deleted_at IS NULL;
      CREATE INDEX idx_roles_code ON roles(code) WHERE deleted_at IS NULL;
    `);

    // Trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER set_timestamp_roles
      BEFORE UPDATE ON roles
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // ============================================
    // TABLE 4: role_permissions (Many-to-Many)
    // ============================================
    await queryRunner.query(`
      CREATE TABLE role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID NOT NULL,
        permission_id UUID NOT NULL,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        
        CONSTRAINT uq_role_permissions UNIQUE(role_id, permission_id),
        CONSTRAINT fk_role_permissions_role 
          FOREIGN KEY (role_id) 
          REFERENCES roles(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_role_permissions_permission 
          FOREIGN KEY (permission_id) 
          REFERENCES permissions(id) 
          ON DELETE CASCADE
      );
    `);

    // Indexes for role_permissions
    await queryRunner.query(`
      CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
      CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
    `);

    // ============================================
    // MIGRATE EXISTING user_roles table
    // ============================================
    // Add role_id column to user_roles (will eventually replace 'role' enum column)
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD COLUMN role_id UUID;
    `);

    // Add foreign key for role_id
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT fk_user_roles_role 
      FOREIGN KEY (role_id) 
      REFERENCES roles(id) 
      ON DELETE CASCADE;
    `);

    // Create index for role_id
    await queryRunner.query(`
      CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order (respect foreign keys)

    // Drop user_roles modifications
    await queryRunner.query(`ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_role;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_roles_role_id;`);
    await queryRunner.query(`ALTER TABLE user_roles DROP COLUMN IF EXISTS role_id;`);

    // Drop role_permissions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_role_permissions_permission;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_role_permissions_role;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);

    // Drop roles
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_roles ON roles;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_roles_code;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_roles_parent;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_roles_organization;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles CASCADE;`);

    // Drop permissions
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_permissions ON permissions;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_permissions_scope;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_permissions_action;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_permissions_code;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_permissions_feature;`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions CASCADE;`);

    // Drop features
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_timestamp_features ON features;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_features_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_features_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_features_parent;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_features_code;`);
    await queryRunner.query(`DROP TABLE IF EXISTS features CASCADE;`);
  }
}
