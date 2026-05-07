/**
 * Aging buckets for AR. Buckets are computed from `due_date` for unpaid
 * payment terms:
 *   - current : due_date >= today OR due_date IS NULL
 *   - 0-30    : 1-30 days overdue
 *   - 31-60   : 31-60 days overdue
 *   - 61-90   : 61-90 days overdue
 *   - 90+     : >90 days overdue
 */
export const AGING_BUCKETS = ['current', '0-30', '31-60', '61-90', '90+'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];
