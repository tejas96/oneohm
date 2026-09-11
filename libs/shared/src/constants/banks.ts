/**
 * ============================================
 * FINANCING BANKS & NBFCs
 * ============================================
 *
 * The lenders a customer can name when they ask for financing at onboarding.
 *
 * A list in code rather than a table, because it is a short list of the
 * branches OneOhm actually deals with and it changes once or twice a year.
 * A lookup table would cost every app a fetch to render one line, and a seed
 * plus a migration to add a branch. Editing this file is the whole update.
 *
 * `BANKS` holds real lenders only; "Other" is `BANK_OTHER`, which is a picker
 * state rather than a lender — see `isCustomBank`.
 */

export type BankCategory = 'nationalised' | 'private' | 'nbfc';

export interface BankOption {
  /**
   * Written verbatim into `customer_properties.financing_bank`, so a code that
   * has shipped must never be re-spelled — old rows would stop resolving and
   * start printing their raw code. The label is free to change.
   */
  code: string;
  label: string;
  category: BankCategory;
}

/**
 * The "Other" row every picker appends after the groups.
 *
 * A picker state, never a stored value: choosing it swaps in a text box and
 * what the rep types is written down instead. `LeadSource.OTHER` works the same
 * way, and `customer_profiles.lead_source` has never held the word "other"
 * either.
 */
export const BANK_OTHER = '__other__';

/** Heading each group renders under. */
export const BANK_CATEGORY_LABELS: Record<BankCategory, string> = {
  nationalised: 'Nationalised banks',
  private: 'Private banks',
  nbfc: 'NBFC',
};

/** The order every picker renders groups in. */
export const BANK_CATEGORY_ORDER: BankCategory[] = ['nationalised', 'private', 'nbfc'];

export const BANKS: BankOption[] = [
  { code: 'sbi', label: 'State Bank of India', category: 'nationalised' },
  { code: 'union_bank', label: 'Union Bank of India', category: 'nationalised' },
  { code: 'canara', label: 'Canara Bank', category: 'nationalised' },
  { code: 'bob', label: 'Bank of Baroda', category: 'nationalised' },
  { code: 'boi', label: 'Bank of India', category: 'nationalised' },
  { code: 'bom', label: 'Bank of Maharashtra', category: 'nationalised' },

  { code: 'rajarambapu', label: 'Rajarambapu Bank', category: 'private' },
  { code: 'rbl', label: 'Ratnakar Bank (RBL)', category: 'private' },
  { code: 'hdfc', label: 'HDFC Bank', category: 'private' },
  { code: 'icici', label: 'ICICI Bank', category: 'private' },
  { code: 'sangli_urban', label: 'Sangli Urban Bank', category: 'private' },

  { code: 'bajaj_finance', label: 'Bajaj Finance', category: 'nbfc' },
  { code: 'ecofy', label: 'Ecofy', category: 'nbfc' },
];

const BANK_BY_CODE = new Map(BANKS.map((bank) => [bank.code, bank]));

/** The banks in one group, in list order. */
export function banksByCategory(category: BankCategory): BankOption[] {
  return BANKS.filter((bank) => bank.category === category);
}

/**
 * True when a stored value is a name somebody typed rather than one off the
 * list.
 *
 * "Other" is a picker state, never a stored value: choosing it swaps in a text
 * box and what the rep types is stored instead — the same rule the lead source
 * follows, where the word "other" never reaches the database either. So an
 * unrecognised string is not a stale code to repair; it is the bank's name, and
 * a picker re-opening on that row must open showing its text box.
 *
 * `BANK_OTHER` is excluded on purpose. It is the one unrecognised string that
 * is NOT a name — a picker holding it momentarily has an empty field, not a
 * typed one — and every caller that forgets this ends up rendering the
 * sentinel to a rep as if it were their bank.
 */
export function isCustomBank(stored?: string | null): boolean {
  const value = stored?.trim();
  if (!value || value === BANK_OTHER) return false;
  return !BANK_BY_CODE.has(value);
}

/** What to print for a stored value. Empty string when no bank was named. */
export function bankLabel(stored?: string | null): string {
  const value = stored?.trim();
  if (!value) return '';
  return BANK_BY_CODE.get(value)?.label ?? value;
}
