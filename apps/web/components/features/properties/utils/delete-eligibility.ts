import { LoanStatus, ChangeRequestStatus } from '@tejas96/shared/types';

export const ORG_ADMIN_ROLES = ['admin', 'super_admin'] as const;

const ACTIVE_LOAN_STATUSES: LoanStatus[] = [LoanStatus.INITIATED, LoanStatus.APPLIED];

export function getPropertyDeleteBlockReasons(
  property: {
    projectId?: string;
    latestQuoteId?: string;
    hasActiveLoan?: boolean;
    project?: { id?: string } | null;
    changeRequests?: Array<{ status?: ChangeRequestStatus | string }>;
  },
  loan?: { status: LoanStatus | string } | null,
): string[] {
  const reasons: string[] = [];

  if (property.projectId || property.project?.id) {
    reasons.push('Cannot delete: property has been converted to a project');
  }

  if (property.latestQuoteId) {
    reasons.push('Cannot delete: property has quotations');
  }

  const hasActiveLoan =
    property.hasActiveLoan === true ||
    (loan != null && ACTIVE_LOAN_STATUSES.includes(loan.status as LoanStatus));

  if (hasActiveLoan) {
    reasons.push('Cannot delete: property has an active loan application in progress');
  }

  const hasPendingChangeRequests = (property.changeRequests ?? []).some(
    (cr) => cr.status === ChangeRequestStatus.PENDING || cr.status === 'pending',
  );
  if (hasPendingChangeRequests) {
    reasons.push('Cannot delete: property has pending change requests');
  }

  return reasons;
}

export function getCustomerDeleteBlockReasons(customer: {
  propertyCount?: number;
  hasQuotes?: boolean;
  deleteBlockReasons?: string[];
}): string[] {
  if (customer.deleteBlockReasons && customer.deleteBlockReasons.length > 0) {
    return customer.deleteBlockReasons;
  }

  const reasons: string[] = [];

  if ((customer.propertyCount ?? 0) > 0) {
    reasons.push('Remove all properties before deleting this customer.');
  }
  if (customer.hasQuotes) {
    reasons.push('Cannot delete: customer has quotations');
  }

  return reasons;
}

export function formatDeleteBlockTooltip(reasons: string[]): string | undefined {
  return reasons.length > 0 ? reasons.join(' ') : undefined;
}
