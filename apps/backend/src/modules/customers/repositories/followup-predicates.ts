/**
 * The single definition of "this lead needs a follow-up".
 *
 * Three places ask that question — the /followups gaps tab, the customer-list
 * chip and its count, and the per-property dot. Each takes its condition from
 * here rather than writing its own NOT EXISTS, because a second copy is how a
 * chip that reads 41 ends up beside a list showing 37.
 *
 * Every fragment takes the caller's table alias so it can be dropped into an
 * existing query without renaming anything.
 */

/**
 * An open site with nobody owing it an action.
 *
 * @param alias table alias for `customer_properties`
 */
export function PROPERTY_NEEDS_FOLLOWUP(alias: string): string {
  return `
    ${alias}.deleted_at IS NULL
    AND ${alias}.status NOT IN ('converted', 'lost')
    AND NOT EXISTS (
      SELECT 1 FROM followups f
       WHERE f.property_id = ${alias}.id
         AND f.deleted_at IS NULL
         AND f.status = 'pending')
    AND NOT EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.property_id = ${alias}.id
         AND q.deleted_at IS NULL
         AND q.status = 'accepted')
  `;
}

/**
 * An enquiry that never got a site and has nothing pending.
 *
 * @param alias table alias for `customer_profiles`
 */
export function CUSTOMER_LEAD_NEEDS_FOLLOWUP(alias: string): string {
  return `
    ${alias}.deleted_at IS NULL
    AND ${alias}.status IN ('lead', 'prospect')
    AND NOT EXISTS (
      SELECT 1 FROM customer_properties p
       WHERE p.customer_id = ${alias}.id
         AND p.deleted_at IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM followups f
       WHERE f.customer_id = ${alias}.id
         AND f.deleted_at IS NULL
         AND f.status = 'pending')
  `;
}

/**
 * A customer worth chasing: at least one unattended site, or a property-less
 * lead with nothing pending.
 *
 * Note this counts CUSTOMERS, while the gaps query counts LEAD UNITS — one
 * customer with three unattended sites is one row here and three there. The
 * two totals are meant to differ; see the design spec §7.
 *
 * @param alias table alias for `customer_profiles`
 */
export function CUSTOMER_NEEDS_FOLLOWUP(alias: string): string {
  return `
    ${alias}.deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM customer_properties p
         WHERE p.customer_id = ${alias}.id
           AND ${PROPERTY_NEEDS_FOLLOWUP('p')})
      OR (${CUSTOMER_LEAD_NEEDS_FOLLOWUP(alias)})
    )
  `;
}
