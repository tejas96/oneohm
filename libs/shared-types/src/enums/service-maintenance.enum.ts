/**
 * ============================================
 * SERVICE & MAINTENANCE ENUMS
 * ============================================
 * Schema Reference: Lines 1562-1721
 */

/**
 * Maintenance Configuration Status
 * Schema: project_maintenance_configs.status (line 1585)
 */
export enum MaintenanceConfigStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
}

/**
 * Maintenance Task Status
 * Schema: maintenance_tasks.status (lines 1625-1627)
 */
export enum MaintenanceTaskStatus {
  SCHEDULED = 'scheduled',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  OVERDUE = 'overdue',
}

/**
 * Service Request Status
 * Schema: service_requests.status (lines 1687-1689)
 */
export enum ServiceRequestStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

/**
 * Service Request Priority
 * Schema: service_requests.priority (line 1676)
 */
export enum ServiceRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

