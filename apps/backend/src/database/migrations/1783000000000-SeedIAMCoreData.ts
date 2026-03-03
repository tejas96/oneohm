import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Seed IAM Core Data
 * Upserts ~108 permissions and 15 org-level roles as a catalog.
 * NO role_permissions mappings are created — the super admin
 * assigns permissions to roles via the IAM UI after deployment.
 */
export class SeedIAMCoreData1783000000000 implements MigrationInterface {
  name = 'SeedIAMCoreData1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.seedPermissions(queryRunner);
    await this.seedRoles(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permissionCodes = this.getPermissions().map((p) => p.code);
    const roleCodes = this.getRoles().map((r) => r.code);

    if (permissionCodes.length > 0) {
      const ph = permissionCodes.map((_, i) => `$${i + 1}`).join(', ');
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code IN (${ph}))`,
        permissionCodes,
      );
      await queryRunner.query(`DELETE FROM permissions WHERE code IN (${ph})`, permissionCodes);
    }

    if (roleCodes.length > 0) {
      const ph = roleCodes.map((_, i) => `$${i + 1}`).join(', ');
      await queryRunner.query(
        `DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles WHERE code IN (${ph}))`,
        roleCodes,
      );
      await queryRunner.query(`DELETE FROM roles WHERE code IN (${ph})`, roleCodes);
    }
  }

  private async seedPermissions(queryRunner: QueryRunner): Promise<void> {
    const permissions = this.getPermissions();

    for (const p of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (id, name, code, action, scope, is_active, is_system_permission, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, true, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           action = EXCLUDED.action,
           scope = EXCLUDED.scope,
           is_active = true,
           updated_at = NOW()`,
        [p.name, p.code, p.action, p.scope],
      );
    }
  }

  private async seedRoles(queryRunner: QueryRunner): Promise<void> {
    const orgs = await queryRunner.query(`SELECT id FROM organizations`);

    if (!orgs || orgs.length === 0) {
      console.warn('No organizations found — skipping role seeding.');
      return;
    }

    const roles = this.getRoles();

    for (const org of orgs) {
      for (const r of roles) {
        const existing = await queryRunner.query(
          `SELECT id FROM roles
           WHERE organization_id = $1 AND code = $2 AND deleted_at IS NULL
           LIMIT 1`,
          [org.id, r.code],
        );

        if (existing.length > 0) {
          await queryRunner.query(
            `UPDATE roles SET
               name = $2, description = $3, is_system_role = true, level = $4, updated_at = NOW()
             WHERE id = $1`,
            [existing[0].id, r.name, r.description, r.level],
          );
        } else {
          await queryRunner.query(
            `INSERT INTO roles (id, organization_id, code, name, description, is_system_role, level, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, NOW(), NOW())`,
            [org.id, r.code, r.name, r.description, r.level],
          );
        }
      }
    }
  }

  private getPermissions(): Array<{
    name: string;
    code: string;
    action: string;
    scope: string;
  }> {
    return [
      // customers
      { name: 'Create Customers', code: 'customers:create', action: 'create', scope: 'all' },
      { name: 'Read Customers', code: 'customers:read', action: 'read', scope: 'all' },
      { name: 'Update Customers', code: 'customers:update', action: 'update', scope: 'all' },
      {
        name: 'Update Customer Status',
        code: 'customers:update-status',
        action: 'update-status',
        scope: 'all',
      },
      { name: 'Delete Customers', code: 'customers:delete', action: 'delete', scope: 'all' },
      { name: 'Read Own Customers', code: 'customers:read:own', action: 'read', scope: 'own' },
      {
        name: 'Update Own Customers',
        code: 'customers:update:own',
        action: 'update',
        scope: 'own',
      },

      // properties
      { name: 'Create Properties', code: 'properties:create', action: 'create', scope: 'all' },
      { name: 'Read Properties', code: 'properties:read', action: 'read', scope: 'all' },
      { name: 'Update Properties', code: 'properties:update', action: 'update', scope: 'all' },
      { name: 'Delete Properties', code: 'properties:delete', action: 'delete', scope: 'all' },

      // followups
      { name: 'Create Followups', code: 'followups:create', action: 'create', scope: 'all' },
      { name: 'Read Followups', code: 'followups:read', action: 'read', scope: 'all' },
      { name: 'Update Followups', code: 'followups:update', action: 'update', scope: 'all' },
      { name: 'Delete Followups', code: 'followups:delete', action: 'delete', scope: 'all' },

      // site-visits
      { name: 'Read Site Visits', code: 'site-visits:read', action: 'read', scope: 'all' },
      { name: 'Create Site Visits', code: 'site-visits:create', action: 'create', scope: 'all' },
      { name: 'Update Site Visits', code: 'site-visits:update', action: 'update', scope: 'all' },
      { name: 'Delete Site Visits', code: 'site-visits:delete', action: 'delete', scope: 'all' },

      // quotes
      { name: 'Create Quotes', code: 'quotes:create', action: 'create', scope: 'all' },
      { name: 'Read Quotes', code: 'quotes:read', action: 'read', scope: 'all' },
      { name: 'Update Quotes', code: 'quotes:update', action: 'update', scope: 'all' },
      { name: 'Send Quotes', code: 'quotes:send', action: 'send', scope: 'all' },
      { name: 'Accept Quotes', code: 'quotes:accept', action: 'accept', scope: 'all' },
      { name: 'Reject Quotes', code: 'quotes:reject', action: 'reject', scope: 'all' },
      { name: 'Delete Quotes', code: 'quotes:delete', action: 'delete', scope: 'all' },

      // projects
      { name: 'Create Projects', code: 'projects:create', action: 'create', scope: 'all' },
      { name: 'Read Projects', code: 'projects:read', action: 'read', scope: 'all' },
      { name: 'Update Projects', code: 'projects:update', action: 'update', scope: 'all' },
      {
        name: 'Update Project Status',
        code: 'projects:update-status',
        action: 'update-status',
        scope: 'all',
      },
      { name: 'Delete Projects', code: 'projects:delete', action: 'delete', scope: 'all' },

      // project-tasks
      {
        name: 'Create Project Tasks',
        code: 'project-tasks:create',
        action: 'create',
        scope: 'all',
      },
      { name: 'Read Project Tasks', code: 'project-tasks:read', action: 'read', scope: 'all' },
      {
        name: 'Update Project Tasks',
        code: 'project-tasks:update',
        action: 'update',
        scope: 'all',
      },
      {
        name: 'Update Task Status',
        code: 'project-tasks:update-status',
        action: 'update-status',
        scope: 'all',
      },
      {
        name: 'Assign Project Tasks',
        code: 'project-tasks:assign',
        action: 'assign',
        scope: 'all',
      },
      {
        name: 'Delete Project Tasks',
        code: 'project-tasks:delete',
        action: 'delete',
        scope: 'all',
      },

      // milestones
      { name: 'Create Milestones', code: 'milestones:create', action: 'create', scope: 'all' },
      { name: 'Read Milestones', code: 'milestones:read', action: 'read', scope: 'all' },
      { name: 'Update Milestones', code: 'milestones:update', action: 'update', scope: 'all' },
      {
        name: 'Update Milestone Status',
        code: 'milestones:update-status',
        action: 'update-status',
        scope: 'all',
      },
      { name: 'Delete Milestones', code: 'milestones:delete', action: 'delete', scope: 'all' },

      // project-team
      { name: 'Read Project Team', code: 'project-team:read', action: 'read', scope: 'all' },
      { name: 'Manage Project Team', code: 'project-team:manage', action: 'manage', scope: 'all' },

      // survey
      { name: 'Create Surveys', code: 'survey:create', action: 'create', scope: 'all' },
      { name: 'Read Surveys', code: 'survey:read', action: 'read', scope: 'all' },
      { name: 'Update Surveys', code: 'survey:update', action: 'update', scope: 'all' },
      { name: 'Delete Surveys', code: 'survey:delete', action: 'delete', scope: 'all' },

      // workflow-steps
      {
        name: 'Create Workflow Steps',
        code: 'workflow-steps:create',
        action: 'create',
        scope: 'all',
      },
      { name: 'Read Workflow Steps', code: 'workflow-steps:read', action: 'read', scope: 'all' },
      {
        name: 'Update Workflow Steps',
        code: 'workflow-steps:update',
        action: 'update',
        scope: 'all',
      },
      {
        name: 'Delete Workflow Steps',
        code: 'workflow-steps:delete',
        action: 'delete',
        scope: 'all',
      },

      // employees
      { name: 'Create Employees', code: 'employees:create', action: 'create', scope: 'all' },
      { name: 'Read Employees', code: 'employees:read', action: 'read', scope: 'all' },
      { name: 'Update Employees', code: 'employees:update', action: 'update', scope: 'all' },
      {
        name: 'Update Employee Status',
        code: 'employees:update-status',
        action: 'update-status',
        scope: 'all',
      },
      { name: 'Delete Employees', code: 'employees:delete', action: 'delete', scope: 'all' },

      // users
      { name: 'Create Users', code: 'users:create', action: 'create', scope: 'all' },
      { name: 'Read Users', code: 'users:read', action: 'read', scope: 'all' },
      { name: 'Update Users', code: 'users:update', action: 'update', scope: 'all' },
      {
        name: 'Update User Status',
        code: 'users:update-status',
        action: 'update-status',
        scope: 'all',
      },
      { name: 'Delete Users', code: 'users:delete', action: 'delete', scope: 'all' },

      // resellers
      { name: 'Create Resellers', code: 'resellers:create', action: 'create', scope: 'all' },
      { name: 'Read Resellers', code: 'resellers:read', action: 'read', scope: 'all' },
      { name: 'Update Resellers', code: 'resellers:update', action: 'update', scope: 'all' },
      {
        name: 'Update Reseller Status',
        code: 'resellers:update-status',
        action: 'update-status',
        scope: 'all',
      },
      { name: 'Delete Resellers', code: 'resellers:delete', action: 'delete', scope: 'all' },
      {
        name: 'Read Own Reseller Profile',
        code: 'resellers:read:own',
        action: 'read',
        scope: 'own',
      },
      {
        name: 'Update Own Reseller Profile',
        code: 'resellers:update:own',
        action: 'update',
        scope: 'own',
      },

      // payments
      { name: 'Create Payments', code: 'payments:create', action: 'create', scope: 'all' },
      { name: 'Read Payments', code: 'payments:read', action: 'read', scope: 'all' },
      { name: 'Update Payments', code: 'payments:update', action: 'update', scope: 'all' },
      {
        name: 'Update Payment Status',
        code: 'payments:update-status',
        action: 'update-status',
        scope: 'all',
      },
      { name: 'Reconcile Payments', code: 'payments:reconcile', action: 'reconcile', scope: 'all' },
      { name: 'Delete Payments', code: 'payments:delete', action: 'delete', scope: 'all' },

      // inventory
      { name: 'Read Inventory', code: 'inventory:read', action: 'read', scope: 'all' },
      { name: 'Update Inventory', code: 'inventory:update', action: 'update', scope: 'all' },

      // vendors
      { name: 'Create Vendors', code: 'vendors:create', action: 'create', scope: 'all' },
      { name: 'Read Vendors', code: 'vendors:read', action: 'read', scope: 'all' },
      { name: 'Update Vendors', code: 'vendors:update', action: 'update', scope: 'all' },
      { name: 'Delete Vendors', code: 'vendors:delete', action: 'delete', scope: 'all' },

      // purchase-orders
      {
        name: 'Create Purchase Orders',
        code: 'purchase-orders:create',
        action: 'create',
        scope: 'all',
      },
      { name: 'Read Purchase Orders', code: 'purchase-orders:read', action: 'read', scope: 'all' },
      {
        name: 'Update Purchase Orders',
        code: 'purchase-orders:update',
        action: 'update',
        scope: 'all',
      },
      {
        name: 'Approve Purchase Orders',
        code: 'purchase-orders:approve',
        action: 'approve',
        scope: 'all',
      },
      {
        name: 'Delete Purchase Orders',
        code: 'purchase-orders:delete',
        action: 'delete',
        scope: 'all',
      },

      // compliance
      {
        name: 'Create Compliance Records',
        code: 'compliance:create',
        action: 'create',
        scope: 'all',
      },
      { name: 'Read Compliance Records', code: 'compliance:read', action: 'read', scope: 'all' },
      {
        name: 'Update Compliance Records',
        code: 'compliance:update',
        action: 'update',
        scope: 'all',
      },
      { name: 'Approve Compliance', code: 'compliance:approve', action: 'approve', scope: 'all' },
      { name: 'Reject Compliance', code: 'compliance:reject', action: 'reject', scope: 'all' },
      {
        name: 'Delete Compliance Records',
        code: 'compliance:delete',
        action: 'delete',
        scope: 'all',
      },

      // approvals
      { name: 'Create Approvals', code: 'approvals:create', action: 'create', scope: 'all' },
      { name: 'Read Approvals', code: 'approvals:read', action: 'read', scope: 'all' },
      { name: 'Process Approvals', code: 'approvals:process', action: 'process', scope: 'all' },
      { name: 'Cancel Approvals', code: 'approvals:cancel', action: 'cancel', scope: 'all' },

      // iam
      { name: 'Read Permissions', code: 'iam:permissions:read', action: 'read', scope: 'all' },
      {
        name: 'Create Permissions',
        code: 'iam:permissions:create',
        action: 'create',
        scope: 'all',
      },
      {
        name: 'Update Permissions',
        code: 'iam:permissions:update',
        action: 'update',
        scope: 'all',
      },
      {
        name: 'Delete Permissions',
        code: 'iam:permissions:delete',
        action: 'delete',
        scope: 'all',
      },
      { name: 'Read Roles', code: 'iam:roles:read', action: 'read', scope: 'all' },
      { name: 'Create Roles', code: 'iam:roles:create', action: 'create', scope: 'all' },
      { name: 'Update Roles', code: 'iam:roles:update', action: 'update', scope: 'all' },
      { name: 'Delete Roles', code: 'iam:roles:delete', action: 'delete', scope: 'all' },
      {
        name: 'Assign Permissions to Roles',
        code: 'iam:roles:assign-permissions',
        action: 'assign-permissions',
        scope: 'all',
      },
      { name: 'Read User Roles', code: 'iam:user-roles:read', action: 'read', scope: 'all' },
      { name: 'Assign User Roles', code: 'iam:user-roles:assign', action: 'assign', scope: 'all' },
      { name: 'Remove User Roles', code: 'iam:user-roles:remove', action: 'remove', scope: 'all' },

      // profile
      { name: 'Read Own Profile', code: 'profile:read:own', action: 'read', scope: 'own' },
      { name: 'Update Own Profile', code: 'profile:update:own', action: 'update', scope: 'own' },
    ];
  }

  private getRoles(): Array<{
    code: string;
    name: string;
    description: string;
    level: number;
  }> {
    return [
      // Organization Business Roles
      {
        code: 'super_admin',
        name: 'Super Admin',
        description: 'Full organization access',
        level: 1,
      },
      {
        code: 'admin',
        name: 'Admin',
        description: 'Organization admin with broad access',
        level: 2,
      },
      {
        code: 'sales_executive',
        name: 'Sales Executive',
        description: 'Sales and customer management',
        level: 3,
      },
      {
        code: 'accounts_manager',
        name: 'Accounts Manager',
        description: 'Financial and payment management',
        level: 3,
      },
      {
        code: 'project_manager',
        name: 'Project Manager',
        description: 'Project and team management',
        level: 3,
      },
      {
        code: 'inventory_manager',
        name: 'Inventory Manager',
        description: 'Inventory and vendor management',
        level: 3,
      },
      {
        code: 'compliance_officer',
        name: 'Compliance Officer',
        description: 'Regulatory compliance management',
        level: 3,
      },
      {
        code: 'employee_basic',
        name: 'Employee Basic',
        description: 'Basic employee access',
        level: 4,
      },

      // Workflow Operational Roles
      {
        code: 'liaisoning',
        name: 'Liaisoning Officer',
        description: 'Net metering, permits, subsidy, and commissioning tasks',
        level: 3,
      },
      {
        code: 'design_engineer',
        name: 'Design Engineer',
        description: 'DSS work, design confirmation tasks',
        level: 3,
      },
      {
        code: 'store',
        name: 'Store Manager',
        description: 'Material dispatch and inventory tasks',
        level: 3,
      },
      {
        code: 'execution',
        name: 'Execution Engineer',
        description: 'Installation, electrical, and QC tasks',
        level: 3,
      },
      {
        code: 'loan',
        name: 'Loan Officer',
        description: 'Loan processing and disbursement tasks',
        level: 3,
      },

      // Profile Auto-Assigned Roles
      { code: 'customer', name: 'Customer', description: 'Customer portal access', level: 5 },
      { code: 'reseller', name: 'Reseller', description: 'Reseller portal access', level: 5 },
    ];
  }
}
