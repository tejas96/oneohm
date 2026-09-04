import { formatCurrency } from './format';

/**
 * The money figures a site row can carry. Structural, so this works for a
 * `CustomerPropertyResponse`, a property list row, or anything else assembled
 * from the same fields.
 */
export interface SiteValueInput {
  /** The latest quote's own price. Frozen at signing; never moves after. */
  latestQuoteFinalPrice?: number | null;
  /** The project's contract as it stands. Present only once converted. */
  contractValue?: number | null;
  /** The part of the contract that came from the signed quote. */
  quotedValue?: number | null;
  /** Agreed after signing. quotedValue + changeOrderValue === contractValue. */
  changeOrderValue?: number | null;
}

export interface SiteValue {
  /** The headline figure, already formatted. `null` when there is nothing to show. */
  label: string | null;
  /**
   * The line that explains the headline, formatted — present ONLY when the
   * contract has moved away from the quote. `null` the rest of the time, so a
   * row with nothing to explain stays as quiet as it is today.
   */
  note: string | null;
  /** True when the headline is a live contract rather than a quote price. */
  isContract: boolean;
}

/**
 * What a site is worth, and whether that needs explaining.
 *
 * Every screen listing a site used to print `latestQuoteFinalPrice`. That is
 * correct for a row standing for a QUOTE and wrong for a row standing for a
 * converted site: billing the customer for material added on site moves the
 * project's contract, the quote stays where it was, and the customer page, the
 * property page and the site list all keep reporting the original figure while
 * the project's own Money tab shows a larger one. Nothing on screen reconciled
 * the two, so both looked authoritative and one was stale.
 *
 * The rule this encodes:
 *
 *  - a converted site shows its CONTRACT, plus a line naming the split;
 *  - a site whose contract still equals its quote shows one number and no
 *    note, because there is nothing to explain;
 *  - a site with no project shows its quote price, unchanged.
 *
 * It lives here rather than in each screen so the five places that show a site
 * value cannot drift into telling five different stories, and so the wording
 * matches the projects list, which already says "quote ₹X + ₹Y in change
 * orders".
 */
export function siteValue(input: SiteValueInput): SiteValue {
  const contract = input.contractValue;
  const changeOrders = input.changeOrderValue ?? 0;
  const quoted = input.quotedValue;

  // Converted, and the contract has moved. The only case that needs two lines.
  //
  // The test is on `changeOrders`, not on contract-vs-quote-price: those two
  // can differ for reasons that are not change orders at all (a project
  // converted from an older quote version, a milestone edited by hand), and a
  // note claiming "in change orders" would then be describing the wrong thing.
  if (contract != null && changeOrders !== 0) {
    const quotedPart = quoted ?? contract - changeOrders;
    const sign = changeOrders > 0 ? '+' : '−';
    return {
      label: formatCurrency(contract),
      note: `quote ${formatCurrency(quotedPart)} ${sign} ${formatCurrency(Math.abs(changeOrders))} in change orders`,
      isContract: true,
    };
  }

  // Converted with nothing agreed since: one number, no explanation needed.
  if (contract != null) {
    return { label: formatCurrency(contract), isContract: true, note: null };
  }

  // Not converted. The quote price is the only figure there is.
  const quotePrice = input.latestQuoteFinalPrice;
  return {
    label: quotePrice ? formatCurrency(quotePrice) : null,
    note: null,
    isContract: false,
  };
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
export function contractMovedNote(input: SiteValueInput): string | null {
  const contract = input.contractValue;
  const changeOrders = input.changeOrderValue ?? 0;
  if (contract == null || changeOrders === 0) return null;
  return `Project contract is now ${formatCurrency(contract)} after change orders`;
}
