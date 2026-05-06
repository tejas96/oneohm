import {
  ExpenseCategory,
  PaymentTermStatus,
  PaymentTransactionStatus,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';

import { type StatusChipColor } from '@/components/ui';

/**
 * Semantic MUI palette colors for finance status chips. These feed
 * `<MUIStatusChip color={...} />` so all finance status indicators stay
 * in lockstep with the MUI theme. When adding a new status value, also
 * add its label in `@oneohm-epc/shared/constants/labels`.
 *
 * For categories without an obvious semantic color (e.g. expense
 * categories), we omit them from the map and let `MUIStatusChip`'s
 * deterministic auto-color kick in via `colorSeed`.
 */
export const PAYMENT_TERM_STATUS_COLOR: Record<PaymentTermStatus, StatusChipColor> = {
  [PaymentTermStatus.PENDING]: 'default',
  [PaymentTermStatus.PARTIAL]: 'warning',
  [PaymentTermStatus.PAID]: 'success',
  [PaymentTermStatus.WAIVED]: 'default',
  [PaymentTermStatus.CANCELLED]: 'error',
};

export const RECEIPT_STATUS_COLOR: Record<PaymentTransactionStatus, StatusChipColor> = {
  [PaymentTransactionStatus.PENDING]: 'warning',
  [PaymentTransactionStatus.RECEIVED]: 'info',
  [PaymentTransactionStatus.VERIFIED]: 'primary',
  [PaymentTransactionStatus.CLEARED]: 'success',
  [PaymentTransactionStatus.BOUNCED]: 'error',
  [PaymentTransactionStatus.REFUNDED]: 'default',
};

export const REIMBURSEMENT_STATUS_COLOR: Record<ReimbursementStatus, StatusChipColor> = {
  [ReimbursementStatus.NOT_APPLICABLE]: 'default',
  [ReimbursementStatus.PENDING]: 'warning',
  [ReimbursementStatus.REIMBURSED]: 'success',
};

/**
 * Expense categories don't have semantic colors — they're business
 * groupings, not states. We deliberately leave them as `undefined` so
 * `MUIStatusChip` uses its deterministic hash-based color picker. The
 * raw enum value is passed as `colorSeed` for stable color mapping.
 */
export const EXPENSE_CATEGORY_COLOR: Partial<Record<ExpenseCategory, StatusChipColor>> = {};

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
