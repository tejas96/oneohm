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
}

/**
 * Notification Severity (TS enum only — DB column stays VARCHAR + CHECK)
 */
export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}
