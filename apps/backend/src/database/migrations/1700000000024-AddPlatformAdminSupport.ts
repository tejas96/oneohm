import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Platform Admin Support
 *
 * Changes:
 * 1. Make roles.organization_id nullable (for platform_admin role)
 * 2. Add organization_id to user_roles table (multi-tenant role assignments)
 * 3. Update unique constraints on user_roles
 * 4. Create invitations table for user onboarding
 */
export class AddPlatformAdminSupport1700000000024 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Make roles.organization_id NULLABLE
    // ============================================
    await queryRunner.query(`
      ALTER TABLE roles 
      ALTER COLUMN organization_id DROP NOT NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN roles.organization_id IS 
      'Organization ID - NULL for platform-level roles (e.g., platform_admin)';
    `);

    // ============================================
    // 2. Add organization_id to user_roles
    // ============================================
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD COLUMN organization_id UUID;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN user_roles.organization_id IS 
      'Organization ID for role assignment - NULL for platform-level roles';
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE user_roles 
      ADD CONSTRAINT fk_user_roles_organization 
      FOREIGN KEY (organization_id) 
      REFERENCES organizations(id) 
      ON DELETE CASCADE;
    `);

    // Add index for performance
    await queryRunner.query(`
      CREATE INDEX idx_user_roles_organization_id 
      ON user_roles(organization_id) 
      WHERE organization_id IS NOT NULL;
    `);

    // ============================================
    // 3. Update unique constraint on user_roles
    // ============================================
    // Drop old constraint if exists
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_user_roles_user_id_role;
    `);

    // Create new unique constraint: user can have same role in different orgs
    // Using COALESCE to handle NULL organization_id for platform roles
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_user_roles_user_org_role 
      ON user_roles(
        user_id, 
        role_id, 
        COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
      );
    `);

    // ============================================
    // 4. Create invitations table
    // ============================================
    await queryRunner.query(`
      CREATE TABLE invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        organization_id UUID NOT NULL,
        role_id UUID NOT NULL,
        invited_by UUID,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        accepted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_invitations_organization 
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        CONSTRAINT fk_invitations_role 
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_invitations_invited_by 
          FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_invitations_status 
          CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
      );
    `);

    // Add indexes for invitations
    await queryRunner.query(`
      CREATE INDEX idx_invitations_email ON invitations(email);
      CREATE INDEX idx_invitations_token ON invitations(token);
      CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
      CREATE INDEX idx_invitations_status ON invitations(status);
      CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
    `);

    // Add updated_at trigger
    await queryRunner.query(`
      CREATE TRIGGER update_invitations_updated_at
      BEFORE UPDATE ON invitations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE invitations IS 'User invitation tokens for onboarding';
      COMMENT ON COLUMN invitations.token IS 'Unique invitation token (UUID-based)';
      COMMENT ON COLUMN invitations.status IS 'pending, accepted, expired, cancelled';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Reverse: Drop invitations table
    // ============================================
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS invitations CASCADE;`);

    // ============================================
    // Reverse: Remove organization_id from user_roles
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_roles_user_org_role;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_roles_organization_id;`);
    await queryRunner.query(
      `ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_organization;`,
    );
    await queryRunner.query(`ALTER TABLE user_roles DROP COLUMN IF EXISTS organization_id;`);

    // Restore old constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_user_roles_user_id_role 
      ON user_roles(user_id, role);
    `);

    // ============================================
    // Reverse: Make roles.organization_id NOT NULL again
    // ============================================
    // Note: This will fail if platform_admin role exists with NULL organization_id
    // Delete platform roles before running down migration
    await queryRunner.query(`DELETE FROM roles WHERE organization_id IS NULL;`);
    await queryRunner.query(`
      ALTER TABLE roles 
      ALTER COLUMN organization_id SET NOT NULL;
    `);
  }
}
