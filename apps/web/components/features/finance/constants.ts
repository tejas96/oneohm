import {
  ExpenseCategory,
  PaymentTermStatus,
  PaymentTransactionStatus,
  ReimbursementStatus,
} from '@tejas96/shared/types';

import { type StatusChipColor } from '@/components/ui';
import type { AgingBucket } from '@/lib/hooks/resources';

/**
 * Semantic MUI palette colors for finance status chips. These feed
 * `<MUIStatusChip color={...} />` so all finance status indicators stay
 * in lockstep with the MUI theme. When adding a new status value, also
 * add its label in `@tejas96/shared/constants/labels`.
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

// ============================================================================
// Org Finance Module — shared constants (slice 4 of finance_module_v1)
// ============================================================================

/**
 * Bucket order matches the backend's CASE expression in
 * FinanceAggregationService. The Customers AR table renders columns in
 * this order; the Outstanding page filter chips use the same order.
 */
export const AGING_BUCKETS: readonly AgingBucket[] = [
  'current',
  '0-30',
  '31-60',
  '61-90',
  '90+',
] as const;

export const AGING_BUCKET_COLOR: Record<AgingBucket, StatusChipColor> = {
  current: 'success',
  '0-30': 'info',
  '31-60': 'warning',
  '61-90': 'warning',
  '90+': 'error',
};

export const AGING_BUCKET_LABEL: Record<AgingBucket, string> = {
  current: 'Current',
  '0-30': '0-30 days',
  '31-60': '31-60 days',
  '61-90': '61-90 days',
  '90+': '90+ days',
};

/**
 * FY-aware date-range presets. FY = April-March (Indian fiscal calendar).
 * `custom` opens a pair of MUIDatePicker controls for a manual range.
 */
export const FY_PRESETS = [
  'this-month',
  'last-month',
  'this-quarter',
  'this-fy',
  'last-fy',
  'custom',
] as const;
export type FyPreset = (typeof FY_PRESETS)[number];

export const FY_PRESET_LABEL: Record<FyPreset, string> = {
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'this-quarter': 'This Quarter',
  'this-fy': 'This FY',
  'last-fy': 'Last FY',
  custom: 'Custom',
};

/**
 * Panel-section grouping for the Finance rail panel. Used by
 * lib/config/navigation.ts to render the OVERVIEW / LEDGERS / INSIGHTS
 * sub-headers above the panel items. Just labels here — paths/icons
 * live in navigation.ts so role/permission filtering stays centralized.
 */
export const FINANCE_PANEL_SECTIONS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'ledgers', label: 'LEDGERS' },
  { id: 'insights', label: 'INSIGHTS' },
] as const;

export type FinancePanelSectionId = (typeof FINANCE_PANEL_SECTIONS)[number]['id'];
