import { formatCurrency } from './format';

/** The contract figures a converted site carries. */
interface SiteContract {
  /** The project's contract as it stands. Present only once converted. */
  contractValue?: number | null;
  /** Agreed after signing; the contract less the signed quote. */
  changeOrderValue?: number | null;
}

/**
 * The note to put under a QUOTE's price when its project has since moved on.
 *
 * A quote page should keep showing the quote's own value — that is the document
 * the customer signed, and rewriting it would be a lie. But leaving it entirely
 * silent is what made the numbers look contradictory, so the quote says what it
 * was and points at what the project became.
 *
 * Returns `null` when there is nothing to say, which is the common case.
 */
export function contractMovedNote(input: SiteContract): string | null {
  const contract = input.contractValue;
  const changeOrders = input.changeOrderValue ?? 0;
  if (contract == null || changeOrders === 0) return null;
  return `Project contract is now ${formatCurrency(contract)} after change orders`;
}
