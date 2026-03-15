/**
 * Approval Workflow Enums
 * Module: Module 7 - Approval Workflows
 */

/**
 * Workflow types that can have approval processes
 */
export enum ApprovalWorkflowType {
  PURCHASE_ORDER = 'purchase_order',
  QUOTE = 'quote',
  PROJECT = 'project',
  EXPENSE = 'expense',
  CUSTOMER_CREDIT = 'customer_credit',
}

/**
 * Types of approvers in a stage
 */
export enum ApproverType {
  ROLE_BASED = 'role_based', // Approval by specific roles (e.g., MANAGER, ADMIN)
  USER_BASED = 'user_based', // Approval by specific users
  DYNAMIC = 'dynamic', // Dynamically determined (e.g., creator's manager)
  ANY_USER = 'any_user', // Any user with permission
}

/**
 * Approval requirement types for a stage
 */
export enum ApprovalRequirementType {
  ANY = 'any', // Any one approver can approve
  ALL = 'all', // All approvers must approve
  MAJORITY = 'majority', // Majority of approvers must approve
  COUNT = 'count', // Specific count of approvers required
}

/**
 * Approval request status
 */
export enum ApprovalRequestStatus {
  PENDING = 'pending', // Just created, not yet assigned
  IN_PROGRESS = 'in_progress', // Currently being reviewed
  APPROVED = 'approved', // All stages approved
  REJECTED = 'rejected', // Rejected at any stage
  CANCELLED = 'cancelled', // Cancelled by requestor/admin
  EXPIRED = 'expired', // Expired due to timeout
}

/**
 * Approval request priority
 */
export enum ApprovalRequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Approval action types for history
 */
export enum ApprovalAction {
  SUBMITTED = 'submitted', // Request submitted
  ASSIGNED = 'assigned', // Assigned to approver
  APPROVED = 'approved', // Approved by approver
  REJECTED = 'rejected', // Rejected by approver
  COMMENTED = 'commented', // Comment added
  REASSIGNED = 'reassigned', // Reassigned to different approver
  ESCALATED = 'escalated', // Escalated due to timeout
  CANCELLED = 'cancelled', // Request cancelled
  AUTO_APPROVED = 'auto_approved', // Auto-approved based on rules
}

/**
 * Approval decision for history
 */
export enum ApprovalDecision {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

/**
 * Auto action on timeout
 */
export enum AutoActionOnTimeout {
  APPROVE = 'approve',
  REJECT = 'reject',
  ESCALATE = 'escalate',
}
