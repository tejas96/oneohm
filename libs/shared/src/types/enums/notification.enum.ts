/**
 * Notification Type (TS enum only — DB column stays VARCHAR + CHECK)
 */
export enum NotificationType {
  LOW_STOCK = 'low_stock',
  PO_APPROVED = 'po_approved',
  PO_RECEIVED = 'po_received',
  ALLOCATION_CANCELLED = 'allocation_cancelled',
  DISPATCH_DELAYED = 'dispatch_delayed',
  SYSTEM = 'system',
  // Consumer-facing events
  PROPERTY_CREATED = 'property_created',
  QUOTATION_CREATED = 'quotation_created',
  PROJECT_ONBOARDED = 'project_onboarded',
  PROJECT_COMPLETED = 'project_completed',
  CHAT_MESSAGE = 'chat_message',
  // Payment approvals (staff, web bell)
  PAYMENT_APPROVAL_PENDING = 'payment_approval_pending',
  PAYMENT_APPROVED = 'payment_approved',
  PAYMENT_REJECTED = 'payment_rejected',
  // Staff work — "this is yours now" (instant) and the morning summaries
  TASK_ASSIGNED = 'task_assigned',
  TASK_BLOCKED = 'task_blocked',
  PROJECT_ASSIGNED = 'project_assigned',
  PROJECT_TEAM_ADDED = 'project_team_added',
  LEAD_ASSIGNED = 'lead_assigned',
  FOLLOWUP_ASSIGNED = 'followup_assigned',
  SITE_VISIT_ASSIGNED = 'site_visit_assigned',
  SITE_SURVEY_ASSIGNED = 'site_survey_assigned',
  SERVICE_TICKET_ASSIGNED = 'service_ticket_assigned',
  DAILY_SUMMARY = 'daily_summary',
  ADMIN_DAILY_SUMMARY = 'admin_daily_summary',
}

/**
 * Notification Severity (TS enum only — DB column stays VARCHAR + CHECK)
 */
export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}
