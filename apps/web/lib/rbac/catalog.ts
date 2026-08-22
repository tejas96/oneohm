/**
 * The permission catalog — the source of truth for RBAC in this app.
 *
 * Enforcement is frontend-only for now. The `permissions` table holds a mirror
 * of these 44 codes so the superadmin role builder has something to list, but
 * this file is what the UI actually gates on. The mirror is written by
 * migration 1855000000000-ResetRbacCatalog; keep the two in step by hand.
 *
 * Adding a code: add it here, add a row in a new migration. Admin and
 * superadmin pick it up for free — they bypass rather than hold grants.
 *
 * `description` is user-facing. It is the sentence the access dialog shows
 * someone who has just been refused, so write it for them, not for us.
 */

/** A gate that lets every logged-in user through. */
export const ALWAYS_OPEN = 'always-open' as const;

/** A gate only `super_admin` passes. `admin` is refused. Used for /admin. */
export const SUPERADMIN_ONLY = 'superadmin-only' as const;

export interface PermissionMeta {
  readonly code: string;
  readonly module: string;
  readonly name: string;
  readonly description: string;
}

export const PERMISSIONS = [
  // ==================== Customers ====================
  {
    code: 'customers.view',
    module: 'customers',
    name: 'View Customers',
    description: 'See the customer list and customer details',
  },
  {
    code: 'customers.create',
    module: 'customers',
    name: 'Create Customers',
    description: 'Add a new customer',
  },
  {
    code: 'customers.edit',
    module: 'customers',
    name: 'Edit Customers',
    description: 'Change customer details',
  },
  {
    code: 'customers.delete',
    module: 'customers',
    name: 'Delete Customers',
    description: 'Remove a customer',
  },
  {
    code: 'customers.assign',
    module: 'customers',
    name: 'Assign Customers',
    description: 'Assign a customer to a team member',
  },

  // ==================== Properties ====================
  {
    code: 'properties.view',
    module: 'properties',
    name: 'View Properties',
    description: 'See properties and site details',
  },
  {
    code: 'properties.create',
    module: 'properties',
    name: 'Create Properties',
    description: 'Add a new property',
  },
  {
    code: 'properties.edit',
    module: 'properties',
    name: 'Edit Properties',
    description: 'Change property details',
  },
  {
    code: 'properties.delete',
    module: 'properties',
    name: 'Delete Properties',
    description: 'Remove a property',
  },

  // ==================== Follow-ups ====================
  {
    code: 'followups.view',
    module: 'followups',
    name: 'View Follow-ups',
    description: 'See follow-ups',
  },
  {
    code: 'followups.manage',
    module: 'followups',
    name: 'Manage Follow-ups',
    description: 'Create, edit and complete follow-ups',
  },

  // ==================== Pipeline ====================
  {
    code: 'pipeline.view',
    module: 'pipeline',
    name: 'View Pipeline',
    description: 'See the sales funnel',
  },

  // ==================== Quotes ====================
  {
    code: 'quotes.view',
    module: 'quotes',
    name: 'View Quotes',
    description: 'See quotations',
  },
  {
    code: 'quotes.create',
    module: 'quotes',
    name: 'Create Quotes',
    description: 'Create a new quotation',
  },
  {
    code: 'quotes.edit',
    module: 'quotes',
    name: 'Edit Quotes',
    description: 'Change a quotation',
  },
  {
    code: 'quotes.delete',
    module: 'quotes',
    name: 'Delete Quotes',
    description: 'Remove a quotation',
  },
  {
    code: 'quotes.send',
    module: 'quotes',
    name: 'Send Quotes',
    description: 'Send a quotation to the customer',
  },
  {
    code: 'quotes.approve',
    module: 'quotes',
    name: 'Approve Quotes',
    description: 'Accept or reject a quotation',
  },
  {
    code: 'quotes.profitability',
    module: 'quotes',
    name: 'View Profitability',
    description: 'See margins, costs and the full price breakdown',
  },

  // ==================== Projects ====================
  {
    code: 'projects.view',
    module: 'projects',
    name: 'View Projects',
    description: 'See projects',
  },
  {
    code: 'projects.create',
    module: 'projects',
    name: 'Create Projects',
    description: 'Create a new project',
  },
  {
    code: 'projects.edit',
    module: 'projects',
    name: 'Edit Projects',
    description: 'Change project details',
  },
  {
    code: 'projects.delete',
    module: 'projects',
    name: 'Delete Projects',
    description: 'Remove a project',
  },
  {
    code: 'projects.tasks.manage',
    module: 'projects',
    name: 'Manage Project Tasks',
    description: 'Create, assign and update project tasks',
  },
  {
    code: 'projects.team.manage',
    module: 'projects',
    name: 'Manage Project Team',
    description: 'Add or remove project team members',
  },

  // ==================== Inventory ====================
  {
    code: 'inventory.view',
    module: 'inventory',
    name: 'View Inventory',
    description: 'See stock levels and inventory screens',
  },
  {
    code: 'inventory.stock.manage',
    module: 'inventory',
    name: 'Manage Stock',
    description: 'Adjust stock and record stock movements',
  },
  {
    code: 'inventory.warehouses.manage',
    module: 'inventory',
    name: 'Manage Warehouses',
    description: 'Create and change warehouses',
  },
  {
    code: 'inventory.purchase_orders.view',
    module: 'inventory',
    name: 'View Purchase Orders',
    description: 'See purchase orders',
  },
  {
    code: 'inventory.purchase_orders.manage',
    module: 'inventory',
    name: 'Manage Purchase Orders',
    description: 'Create and change purchase orders',
  },
  {
    code: 'inventory.purchase_orders.approve',
    module: 'inventory',
    name: 'Approve Purchase Orders',
    description: 'Approve or reject purchase orders',
  },
  {
    code: 'inventory.vendors.manage',
    module: 'inventory',
    name: 'Manage Vendors',
    description: 'Create and change vendors',
  },
  {
    code: 'inventory.dispatches.manage',
    module: 'inventory',
    name: 'Manage Dispatches',
    description: 'Create and update material dispatches',
  },
  {
    code: 'inventory.allocations.manage',
    module: 'inventory',
    name: 'Manage Allocations',
    description: 'Allocate stock to projects',
  },
  {
    code: 'inventory.transactions.view',
    module: 'inventory',
    name: 'View Transactions',
    description: 'See the stock transaction history',
  },

  // ==================== Finance ====================
  {
    code: 'finance.view',
    module: 'finance',
    name: 'View Finance',
    description: 'See the finance section and the cash ledger',
  },
  {
    code: 'finance.receivables.view',
    module: 'finance',
    name: 'View Receivables',
    description: 'See customer receivables and outstanding amounts',
  },
  {
    code: 'finance.payments.record',
    module: 'finance',
    name: 'Record Payments',
    description: 'Record a customer payment',
  },
  {
    code: 'finance.approvals.view',
    module: 'finance',
    name: 'View Payment Approvals',
    description: 'See payment approval requests',
  },
  {
    code: 'finance.approvals.process',
    module: 'finance',
    name: 'Process Payment Approvals',
    description: 'Approve or reject payment requests',
  },

  // ==================== Service ====================
  {
    code: 'service.view',
    module: 'service',
    name: 'View Service',
    description: 'See service tickets',
  },
  {
    code: 'service.manage',
    module: 'service',
    name: 'Manage Service',
    description: 'Create and update service tickets',
  },

  // ==================== Dashboard ====================
  {
    code: 'dashboard.employees.view',
    module: 'dashboard',
    name: 'View Employee Dashboards',
    description: "See another employee's My Work dashboard",
  },
  {
    code: 'dashboard.business.view',
    module: 'dashboard',
    name: 'View Business Mode',
    description: 'See the organisation-wide business overview on the dashboard',
  },
] as const satisfies readonly PermissionMeta[];

/**
 * A union of the 44 literal codes.
 *
 * `as const satisfies` above is load-bearing: `as const` narrows each `code`
 * to its literal so this union is 44 strings, while `satisfies` still checks
 * the shape. Annotating `PERMISSIONS: readonly PermissionMeta[]` instead would
 * widen `code` back to `string` and every typo would compile silently.
 */
export type PermissionCode = (typeof PERMISSIONS)[number]['code'];

/** Anything that can gate a route, nav item, tab or button. */
export type Gate = PermissionCode | typeof ALWAYS_OPEN | typeof SUPERADMIN_ONLY;

export const PERMISSION_BY_CODE = new Map<string, PermissionMeta>(
  PERMISSIONS.map((p) => [p.code, p]),
);
