import { ALWAYS_OPEN, SUPERADMIN_ONLY, type Gate } from './catalog';

/**
 * URL → gate.
 *
 * **Order matters: the first match wins.** Specific patterns must come before
 * general ones, which is why `/admin` is first and `/projects/my-tasks`
 * precedes `/projects`. Getting this order wrong does not fail loudly — it
 * quietly gates a page on the wrong permission.
 *
 * Read by `middleware.ts` (server-side, before any HTML is sent) and by the
 * dashboard layout (client-side, for soft navigation).
 */
export const ROUTE_GATES: ReadonlyArray<{ pattern: RegExp; gate: Gate }> = [
  // The admin panel is gated by ROLE, not permission. `admin` is refused here;
  // only `super_admin` gets in. There are deliberately no `admin.*` codes.
  { pattern: /^\/admin(\/|$)/, gate: SUPERADMIN_ONLY },
  { pattern: /^\/dev(\/|$)/, gate: SUPERADMIN_ONLY },

  // Always open, so nobody can ever be left with a blank app.
  { pattern: /^\/$/, gate: ALWAYS_OPEN },
  { pattern: /^\/profile(\/|$)/, gate: ALWAYS_OPEN },
  { pattern: /^\/help(\/|$)/, gate: ALWAYS_OPEN },
  { pattern: /^\/denied(\/|$)/, gate: ALWAYS_OPEN },
  // Your own task list is your own work, not a view onto the projects module.
  { pattern: /^\/projects\/my-tasks(\/|$)/, gate: ALWAYS_OPEN },

  // CRM
  { pattern: /^\/customers(\/|$)/, gate: 'customers.view' },
  { pattern: /^\/crm(\/|$)/, gate: 'customers.view' },
  { pattern: /^\/onboarding(\/|$)/, gate: 'properties.create' },
  { pattern: /^\/properties(\/|$)/, gate: 'properties.view' },
  { pattern: /^\/followups(\/|$)/, gate: 'followups.view' },
  { pattern: /^\/pipeline(\/|$)/, gate: 'pipeline.view' },

  // Quotes
  { pattern: /^\/quotes\/new(\/|$)/, gate: 'quotes.create' },
  { pattern: /^\/quotes(\/|$)/, gate: 'quotes.view' },

  // Projects
  { pattern: /^\/projects\/new(\/|$)/, gate: 'projects.create' },
  { pattern: /^\/projects(\/|$)/, gate: 'projects.view' },

  // Inventory
  { pattern: /^\/inventory\/purchase-orders(\/|$)/, gate: 'inventory.purchase_orders.view' },
  { pattern: /^\/inventory\/transactions(\/|$)/, gate: 'inventory.transactions.view' },
  { pattern: /^\/inventory(\/|$)/, gate: 'inventory.view' },
  { pattern: /^\/vendors(\/|$)/, gate: 'inventory.view' },

  // Finance
  { pattern: /^\/finance\/receivables(\/|$)/, gate: 'finance.receivables.view' },
  { pattern: /^\/finance\/approvals(\/|$)/, gate: 'finance.approvals.view' },
  { pattern: /^\/finance(\/|$)/, gate: 'finance.view' },

  // Service
  { pattern: /^\/service(\/|$)/, gate: 'service.view' },
];

/**
 * Unmapped routes default to open.
 *
 * Deliberate: a page nobody remembered to map should not silently lock
 * everyone out. The manual walkthrough is what catches gaps, not a surprise
 * deny screen in production.
 */
export function gateForPath(pathname: string): Gate {
  return ROUTE_GATES.find((r) => r.pattern.test(pathname))?.gate ?? ALWAYS_OPEN;
}
