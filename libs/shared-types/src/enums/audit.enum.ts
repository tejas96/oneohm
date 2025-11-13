/**
 * Audit action types
 */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',
  CANCEL = 'cancel',
  RESTORE = 'restore',
}

/**
 * Entity types that can be audited
 */
export enum AuditEntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  CUSTOMER = 'customer',
  RESELLER = 'reseller',
  PRODUCT = 'product',
  QUOTE = 'quote',
  QUOTATION = 'quotation',
  PROJECT = 'project',
  MILESTONE = 'milestone',
  INVENTORY = 'inventory',
  PAYMENT = 'payment',
  APPROVAL = 'approval',
  COMMENT = 'comment',
  DOCUMENT = 'document',
  SERVICE_REQUEST = 'service_request',
  MAINTENANCE_TASK = 'maintenance_task',
  CUSTOMER_FEEDBACK = 'customer_feedback',
  LOAN_APPLICATION = 'loan_application',
  COMPLIANCE_APPLICATION = 'compliance_application',
  INSPECTION = 'inspection',
  SUBSIDY_APPLICATION = 'subsidy_application',
}
