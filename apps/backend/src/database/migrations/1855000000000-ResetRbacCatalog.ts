import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Resets the RBAC catalog for the frontend-only permission model.
 *
 * Replaces the previous 110+ colon-style codes (`quotes:read`) with 42
 * dot-style codes (`quotes.view`) derived from the rail menu, tabs and action
 * buttons. Enforcement moves to the web app; the backend keeps this table only
 * so the superadmin role builder has something to list.
 *
 * ONE-WAY. `down()` restores the dropped columns and removes these 42 codes,
 * but it cannot bring back the previous catalog or any of its grants — `up()`
 * deletes those permanently. Do not treat `down()` as a safety net.
 *
 * Role assignments survive: every `user_roles` row is kept, so nobody has to
 * be re-assigned. The roles they point at simply hold no permissions until a
 * superadmin fills them in.
 */
export class ResetRbacCatalog1855000000000 implements MigrationInterface {
  name = 'ResetRbacCatalog1855000000000';

  /** Columns the old ABAC-flavoured model needed and the new one does not. */
  private readonly deadColumns = [
    'action',
    'scope',
    'conditions',
    'permission_level',
    'show_in_menu',
    'menu_label',
    'depends_on_permission_ids',
    'is_system_permission',
  ];

  private readonly permissions: Array<{
    code: string;
    module: string;
    name: string;
    description: string;
  }> = [
    // customers
    { code: 'customers.view', module: 'customers', name: 'View Customers', description: 'See the customer list and customer details' },
    { code: 'customers.create', module: 'customers', name: 'Create Customers', description: 'Add a new customer' },
    { code: 'customers.edit', module: 'customers', name: 'Edit Customers', description: 'Change customer details' },
    { code: 'customers.delete', module: 'customers', name: 'Delete Customers', description: 'Remove a customer' },
    { code: 'customers.assign', module: 'customers', name: 'Assign Customers', description: 'Assign a customer to a team member' },
    // properties
    { code: 'properties.view', module: 'properties', name: 'View Properties', description: 'See properties and site details' },
    { code: 'properties.create', module: 'properties', name: 'Create Properties', description: 'Add a new property' },
    { code: 'properties.edit', module: 'properties', name: 'Edit Properties', description: 'Change property details' },
    { code: 'properties.delete', module: 'properties', name: 'Delete Properties', description: 'Remove a property' },
    // followups
    { code: 'followups.view', module: 'followups', name: 'View Follow-ups', description: 'See follow-ups' },
    { code: 'followups.manage', module: 'followups', name: 'Manage Follow-ups', description: 'Create, edit and complete follow-ups' },
    // pipeline
    { code: 'pipeline.view', module: 'pipeline', name: 'View Pipeline', description: 'See the sales funnel' },
    // quotes
    { code: 'quotes.view', module: 'quotes', name: 'View Quotes', description: 'See quotations' },
    { code: 'quotes.create', module: 'quotes', name: 'Create Quotes', description: 'Create a new quotation' },
    { code: 'quotes.edit', module: 'quotes', name: 'Edit Quotes', description: 'Change a quotation' },
    { code: 'quotes.delete', module: 'quotes', name: 'Delete Quotes', description: 'Remove a quotation' },
    { code: 'quotes.send', module: 'quotes', name: 'Send Quotes', description: 'Send a quotation to the customer' },
    { code: 'quotes.approve', module: 'quotes', name: 'Approve Quotes', description: 'Accept or reject a quotation' },
    { code: 'quotes.profitability', module: 'quotes', name: 'View Profitability', description: 'See margins, costs and the full price breakdown' },
    // projects
    { code: 'projects.view', module: 'projects', name: 'View Projects', description: 'See projects' },
    { code: 'projects.create', module: 'projects', name: 'Create Projects', description: 'Create a new project' },
    { code: 'projects.edit', module: 'projects', name: 'Edit Projects', description: 'Change project details' },
    { code: 'projects.delete', module: 'projects', name: 'Delete Projects', description: 'Remove a project' },
    { code: 'projects.tasks.manage', module: 'projects', name: 'Manage Project Tasks', description: 'Create, assign and update project tasks' },
    { code: 'projects.team.manage', module: 'projects', name: 'Manage Project Team', description: 'Add or remove project team members' },
    // inventory
    { code: 'inventory.view', module: 'inventory', name: 'View Inventory', description: 'See stock levels and inventory screens' },
    { code: 'inventory.stock.manage', module: 'inventory', name: 'Manage Stock', description: 'Adjust stock and record stock movements' },
    { code: 'inventory.warehouses.manage', module: 'inventory', name: 'Manage Warehouses', description: 'Create and change warehouses' },
    { code: 'inventory.purchase_orders.view', module: 'inventory', name: 'View Purchase Orders', description: 'See purchase orders' },
    { code: 'inventory.purchase_orders.manage', module: 'inventory', name: 'Manage Purchase Orders', description: 'Create and change purchase orders' },
    { code: 'inventory.purchase_orders.approve', module: 'inventory', name: 'Approve Purchase Orders', description: 'Approve or reject purchase orders' },
    { code: 'inventory.vendors.manage', module: 'inventory', name: 'Manage Vendors', description: 'Create and change vendors' },
    { code: 'inventory.dispatches.manage', module: 'inventory', name: 'Manage Dispatches', description: 'Create and update material dispatches' },
    { code: 'inventory.allocations.manage', module: 'inventory', name: 'Manage Allocations', description: 'Allocate stock to projects' },
    { code: 'inventory.transactions.view', module: 'inventory', name: 'View Transactions', description: 'See the stock transaction history' },
    // finance
    { code: 'finance.view', module: 'finance', name: 'View Finance', description: 'See the finance section and the cash ledger' },
    { code: 'finance.receivables.view', module: 'finance', name: 'View Receivables', description: 'See customer receivables and outstanding amounts' },
    { code: 'finance.payments.record', module: 'finance', name: 'Record Payments', description: 'Record a customer payment' },
    { code: 'finance.approvals.view', module: 'finance', name: 'View Payment Approvals', description: 'See payment approval requests' },
    { code: 'finance.approvals.process', module: 'finance', name: 'Process Payment Approvals', description: 'Approve or reject payment requests' },
    // service
    { code: 'service.view', module: 'service', name: 'View Service', description: 'See service tickets' },
    { code: 'service.manage', module: 'service', name: 'Manage Service', description: 'Create and update service tickets' },
  ];

  private readonly systemRoles = [
    {
      code: 'super_admin',
      name: 'Superadmin',
      description: 'Full access, including the admin panel. Passes every check by bypass.',
    },
    {
      code: 'admin',
      name: 'Admin',
      description: 'Full access except the admin panel. Passes every permission check by bypass.',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Wipe every grant. This is what turns the surviving roles into empty
    //    shells while leaving user_roles — and therefore people — untouched.
    await queryRunner.query(`DELETE FROM role_permissions`);

    // 2. Wipe the old catalog.
    await queryRunner.query(`DELETE FROM permissions`);

    // 3. Slim the table. Dropping these columns also drops the check
    //    constraints and indexes that hang off them.
    for (const col of this.deadColumns) {
      await queryRunner.query(`ALTER TABLE permissions DROP COLUMN IF EXISTS "${col}"`);
    }
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module VARCHAR(50) NOT NULL DEFAULT ''`,
    );

    // 4. Insert the 42.
    for (const p of this.permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (id, code, name, description, module, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())`,
        [p.code, p.name, p.description, p.module],
      );
    }

    // 5. Guarantee the two system roles BEFORE folding platform_admin into
    //    super_admin, so the fold always has a target to point at.
    for (const r of this.systemRoles) {
      await queryRunner.query(
        `INSERT INTO roles (id, code, name, description, is_system_role, level, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, true, 0, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           is_system_role = true,
           updated_at = NOW()`,
        [r.code, r.name, r.description],
      );
    }

    // 6. Fold platform_admin into super_admin.
    //    Drop links that would collide first — a user holding both roles would
    //    otherwise end up with two identical user_roles rows.
    await queryRunner.query(
      `DELETE FROM user_roles ur
       WHERE ur.role_id IN (SELECT id FROM roles WHERE code = 'platform_admin')
         AND EXISTS (
           SELECT 1 FROM user_roles ur2
           JOIN roles r2 ON r2.id = ur2.role_id
           WHERE ur2.user_id = ur.user_id AND r2.code = 'super_admin'
         )`,
    );
    await queryRunner.query(
      `UPDATE user_roles
       SET role_id = (SELECT id FROM roles WHERE code = 'super_admin')
       WHERE role_id IN (SELECT id FROM roles WHERE code = 'platform_admin')`,
    );
    await queryRunner.query(
      `UPDATE user_roles SET role = 'super_admin' WHERE role = 'platform_admin'`,
    );
    await queryRunner.query(`DELETE FROM roles WHERE code = 'platform_admin'`);

    // 7. Every other role becomes an ordinary, editable shell so the superadmin
    //    can rename, refill or delete it from the admin panel.
    await queryRunner.query(
      `UPDATE roles SET is_system_role = false WHERE code NOT IN ('super_admin', 'admin')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM role_permissions`);
    await queryRunner.query(`DELETE FROM permissions`);
    await queryRunner.query(`ALTER TABLE permissions DROP COLUMN IF EXISTS module`);

    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS action VARCHAR(50) NOT NULL DEFAULT 'read'`,
    );
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope VARCHAR(50) DEFAULT 'all'`,
    );
    await queryRunner.query(`ALTER TABLE permissions ADD COLUMN IF NOT EXISTS conditions JSONB`);
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_level VARCHAR(50) DEFAULT 'standard'`,
    );
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS menu_label VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS depends_on_permission_ids UUID[]`,
    );
    await queryRunner.query(
      `ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_system_permission BOOLEAN DEFAULT true`,
    );
  }
}
