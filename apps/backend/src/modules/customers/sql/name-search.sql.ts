import { escapeIlikePattern } from '@tejas96/shared/utils';

/**
 * A typed name against a customer's stored name — the one rule the customer
 * list and the quote list search by.
 *
 * Stored names carry stray white space ("Hanmant " + "Kharade", a tab after a
 * surname), and a middle name the lists do not show but the customer page
 * does. So the typed term is compared, with the white space on both sides
 * squeezed to single spaces, against "first last" and against
 * "first middle last". It only adds matches to the plain per-column search.
 *
 * `alias` is the customer_profiles alias in the caller's query. Binds
 * `:nameTerm` (see `nameSearchParams`).
 */
export function customerNameMatchesSearch(alias: string): string {
  const squeezed = (columns: string): string =>
    `LOWER(btrim(regexp_replace(concat_ws(' ', ${columns}), '\\s+', ' ', 'g')))`;
  const firstLast = squeezed(`${alias}.first_name, ${alias}.last_name`);
  const full = squeezed(`${alias}.first_name, ${alias}.middle_name, ${alias}.last_name`);
  return `(${firstLast} LIKE :nameTerm ESCAPE '\\' OR ${full} LIKE :nameTerm ESCAPE '\\')`;
}

export function nameSearchParams(search: string): { nameTerm: string } {
  return { nameTerm: `%${escapeIlikePattern(search.trim().replace(/\s+/g, ' ').toLowerCase())}%` };
}

/**
 * A typed term as a "contains" pattern for LIKE / ILIKE ... ESCAPE '\\': `%` and
 * `_` in what the user typed are those characters, not wildcards.
 */
export function containsPattern(search: string): string {
  return `%${escapeIlikePattern(search)}%`;
}
