/**
 * `DROP COLUMN` cascades to dependent indexes and foreign key constraints, so
 * the 39 FKs and 90 indexes are not dropped by hand — only the indexes worth
 * keeping are rebuilt, in 03-indexes.sql.ts.
 *
 * The dropped organizations row, recorded for posterity:
 *   id      9f6d06b2-d7b6-48f6-ba38-66af76c4ca27
 *   name    OneOhm            code   ONEOHM_EPC
 *   email   sanjay@oneohm.com phone  +919850808484
 *   address Plot No.93, Vasantdada Industrial Estate, Sangli, Maharashtra 416416
 *   gstin   27AABCU9603R1ZM   pan    AABCU9603R
 *   timezone Asia/Kolkata     currency INR      date_format DD-MM-YYYY
 *   default_project_timeline_weeks 4  default_quote_validity_days 30
 *   max_quote_versions 3
 * These values now live in libs/shared/src/constants/company.ts.
 *
 * `organization_settings` is absent from this list because the whole table is
 * dropped by the migration — it held zero rows and had no consumer.
 */
const TABLES = [
  'approval_requests',
  'approval_templates',
  'audit_logs',
  'bom',
  'brands',
  'comments',
  'compliance_applications',
  'customer_feedback',
  'customer_profiles',
  'customer_properties',
  'documents',
  'employee_commissions',
  'employee_profiles',
  'followups',
  'inspections',
  'installation_pricing',
  'integrations',
  'inventory_stock',
  'inventory_transactions',
  'invitations',
  'ledger_entries',
  'maintenance_tasks',
  'material_dispatches',
  'notifications',
  'numbering_sequences',
  'payment_milestones',
  'payments',
  'product_prices',
  'product_types',
  'products',
  'project_expenses',
  'project_maintenance_configs',
  'project_payment_terms',
  'purchase_orders',
  'quote_configurations',
  'quotes',
  'return_requests',
  'roles',
  'saved_views',
  'security_events',
  'service_requests',
  'stock_allocations',
  'subsidy_applications',
  'subsidy_configurations',
  'user_roles',
  'vendors',
  'warehouses',
  'workflow_steps',
];

export const ORG_CLEANUP_DROP_COLUMNS: string[] = TABLES.map(
  (t) => `ALTER TABLE ${t} DROP COLUMN organization_id`,
);
