/**
 * ============================================
 * COMMENT ENTITY TYPE ENUM
 * ============================================
 * Defines which entity types can have comments
 * Polymorphic reference for universal commenting system
 */
export enum CommentEntityType {
  // Projects & Tasks
  PROJECT = 'project',
  PROJECT_MILESTONE = 'project_milestone',
  PROJECT_TASK = 'project_task',

  // Sales & Quotes
  QUOTE = 'quote',
  CUSTOMER = 'customer',

  // Inventory
  PURCHASE_ORDER = 'purchase_order',
  MATERIAL_DISPATCH = 'material_dispatch',
  STOCK_ALLOCATION = 'stock_allocation',

  // Payments
  PAYMENT = 'payment',

  // Approvals
  APPROVAL_REQUEST = 'approval_request',

  // Service & Maintenance
  SERVICE_REQUEST = 'service_request',
  MAINTENANCE_TASK = 'maintenance_task',

  // Documents
  DOCUMENT = 'document',

  // Compliance
  COMPLIANCE_APPLICATION = 'compliance_application',
  INSPECTION = 'inspection',
  SUBSIDY_APPLICATION = 'subsidy_application',
  LOAN_APPLICATION = 'loan_application',
}

