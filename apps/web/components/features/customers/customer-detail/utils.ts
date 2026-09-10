export function getCustomerDisplayName(parts: {
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}): string {
  return [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(' ').trim();
}

export function isTabActive(activeTab: string, tab: string): boolean {
  return activeTab === tab;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ============================================================================
// Receivables
// ============================================================================

/** The ageing fields of a `CustomerAging` row, which is all these helpers read. */
export interface AgingBuckets {
  totalOutstanding: number;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90plus: number;
}

/**
 * How much of the balance is actually late.
 *
 * The AR report's `current` bucket is defined as `due_date IS NULL OR due_date
 * >= today` — money that is owed but **not yet due**. Everything else is past
 * its date. Treating the whole balance as a problem paints an account that is
 * paying exactly to schedule in the same alarm colour as one that is 90 days
 * late.
 */
export function getOverdueAmount(aging: AgingBuckets | undefined): number {
  if (!aging) return 0;
  return aging.bucket0to30 + aging.bucket31to60 + aging.bucket61to90 + aging.bucket90plus;
}

export type BalanceTone = 'success' | 'neutral' | 'warning' | 'danger';

/**
 * One rule for colouring a receivables balance, shared by the summary tile,
 * the overview card and the finance tab so they can never disagree about how
 * worried to look.
 */
export function getBalanceTone(aging: AgingBuckets | undefined): BalanceTone {
  const outstanding = aging?.totalOutstanding ?? 0;
  if (outstanding <= 0) return 'success';
  if ((aging?.bucket90plus ?? 0) > 0) return 'danger';
  return getOverdueAmount(aging) > 0 ? 'warning' : 'neutral';
}
