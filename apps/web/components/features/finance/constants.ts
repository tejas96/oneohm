import {
  ExpenseCategory,
  PaymentTermStatus,
  PaymentTransactionStatus,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';

/**
 * Badge variants for the finance domain. Stays in lockstep with the
 * Tailwind tokens declared in tailwind.config.ts and the shared
 * status-chip component. When adding a new status, also add its label
 * in `@oneohm-epc/shared/constants/labels`.
 */
export const PAYMENT_TERM_STATUS_BADGE_VARIANT: Record<PaymentTermStatus, string> = {
  [PaymentTermStatus.PENDING]: 'secondary',
  [PaymentTermStatus.PARTIAL]: 'amber',
  [PaymentTermStatus.PAID]: 'green-subtle',
  [PaymentTermStatus.WAIVED]: 'muted',
  [PaymentTermStatus.CANCELLED]: 'red-subtle',
};

export const RECEIPT_STATUS_BADGE_VARIANT: Record<PaymentTransactionStatus, string> = {
  [PaymentTransactionStatus.PENDING]: 'warning',
  [PaymentTransactionStatus.RECEIVED]: 'info',
  [PaymentTransactionStatus.VERIFIED]: 'green-subtle',
  [PaymentTransactionStatus.CLEARED]: 'success',
  [PaymentTransactionStatus.BOUNCED]: 'error',
  [PaymentTransactionStatus.REFUNDED]: 'red-subtle',
};

export const REIMBURSEMENT_STATUS_BADGE_VARIANT: Record<ReimbursementStatus, string> = {
  [ReimbursementStatus.NOT_APPLICABLE]: 'muted',
  [ReimbursementStatus.PENDING]: 'warning',
  [ReimbursementStatus.REIMBURSED]: 'success',
};

export const EXPENSE_CATEGORY_BADGE_VARIANT: Record<ExpenseCategory, string> = {
  [ExpenseCategory.MATERIALS]: 'blue-subtle',
  [ExpenseCategory.LABOR]: 'teal',
  [ExpenseCategory.TRAVEL]: 'amber',
  [ExpenseCategory.EQUIPMENT]: 'purple',
  [ExpenseCategory.SUBCONTRACTOR]: 'green-subtle',
  [ExpenseCategory.PERMITS]: 'info',
  [ExpenseCategory.MISC]: 'secondary',
};

/**
 * Sub-tabs shown inside the Finance project tab. Kept in this module so
 * the URL ?tab=finance&sub=terms deep-link survives across visits.
 */
export const FINANCE_SUB_TABS = [
  { value: 'terms', label: 'Payment Terms' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'expenses', label: 'Expenses' },
] as const;

export type FinanceSubTab = (typeof FINANCE_SUB_TABS)[number]['value'];

export const FINANCE_DEFAULT_SUB_TAB: FinanceSubTab = 'terms';

const FINANCE_SUB_TAB_VALUES = new Set<string>(FINANCE_SUB_TABS.map((t) => t.value));

export function isFinanceSubTab(value: string | null | undefined): value is FinanceSubTab {
  return value != null && FINANCE_SUB_TAB_VALUES.has(value);
}

/**
 * FSM map: which transitions are allowed from each receipt status. Kept
 * in lockstep with the backend's STATUS_TRANSITIONS in receipt.service.
 * If they drift the backend will reject and surface a 400 with a clear
 * message; this map is purely about hiding/showing UI options.
 */
export const RECEIPT_NEXT_STATUSES: Readonly<
  Record<PaymentTransactionStatus, PaymentTransactionStatus[]>
> = {
  [PaymentTransactionStatus.PENDING]: [
    PaymentTransactionStatus.RECEIVED,
    PaymentTransactionStatus.BOUNCED,
  ],
  [PaymentTransactionStatus.RECEIVED]: [
    PaymentTransactionStatus.VERIFIED,
    PaymentTransactionStatus.BOUNCED,
  ],
  [PaymentTransactionStatus.VERIFIED]: [
    PaymentTransactionStatus.CLEARED,
    PaymentTransactionStatus.BOUNCED,
  ],
  [PaymentTransactionStatus.CLEARED]: [PaymentTransactionStatus.REFUNDED],
  [PaymentTransactionStatus.BOUNCED]: [],
  [PaymentTransactionStatus.REFUNDED]: [],
};
