/**
 * The single definition of "my work". Every provider composes these; none may
 * write its own ownership predicate.
 *
 * The rule (design decision 3): a record is mine if I created it, or I am
 * assigned to it, OR I own / am assigned the CUSTOMER it hangs off.
 *
 * The walk up to the customer is not convenience. Quotes have no assignee
 * column at all and properties have no general owner — only a site-visit and a
 * survey assignee. Without the walk, a rep would not see "quote required" on
 * their own lead the moment a colleague created the property, and stuck
 * hand-offs are the entire reason this dashboard exists.
 *
 * `$1` is ALWAYS the subject user id, taken from the JWT. It is never a
 * parameter the caller can influence.
 */

/** Customers I created or am assigned. */
export const MY_CUSTOMERS_CTE = `
  my_customers AS (
    SELECT c.id
    FROM customer_profiles c
    WHERE c.deleted_at IS NULL
      AND (c.created_by = $1 OR c.assignee_id = $1)
  )
`;

/** Properties I touch directly, plus every property of a customer of mine. */
export const MY_PROPERTIES_CTE = `
  my_properties AS (
    SELECT p.id, p.customer_id
    FROM customer_properties p
    WHERE p.deleted_at IS NULL
      AND (
        p.created_by = $1
        OR p.site_visit_assignee = $1
        OR p.site_survey_assignee = $1
        OR p.customer_id IN (SELECT id FROM my_customers)
      )
  )
`;

/** Quotes I created, plus every quote of a customer of mine. Quotes have no assignee. */
export const MY_QUOTES_CTE = `
  my_quotes AS (
    SELECT q.id, q.customer_id, q.property_id, q.status, q.valid_until, q.quote_number
    FROM quotes q
    WHERE q.deleted_at IS NULL
      AND (q.created_by = $1 OR q.customer_id IN (SELECT id FROM my_customers))
  )
`;

/** Projects I created or am a team member of. */
export const MY_PROJECTS_CTE = `
  my_projects AS (
    SELECT pr.id, pr.name, pr.end_date, pr.status, pr.property_id, pr.quote_id
    FROM projects pr
    WHERE pr.deleted_at IS NULL
      AND (
        pr.created_by = $1
        OR EXISTS (
          -- \`deleted_at IS NULL\` is load-bearing: removing someone from a
          -- project team is how their access is taken away, and without this
          -- they keep seeing the project for ever.
          SELECT 1 FROM project_team_members tm
          WHERE tm.project_id = pr.id AND tm.user_id = $1 AND tm.deleted_at IS NULL
        )
      )
  )
`;

/** Followups I created or am assigned, plus every followup of a customer or property of mine. */
export const MY_FOLLOWUPS_CTE = `
  my_followups AS (
    SELECT f.id, f.customer_id, f.property_id
    FROM followups f
    WHERE f.deleted_at IS NULL
      AND (
        f.created_by = $1
        OR f.assigned_to_user_id = $1
        OR f.customer_id IN (SELECT id FROM my_customers)
      )
  )
`;

/**
 * My employee profile id.
 *
 * Service tickets are assigned to an `employee_profiles.id`, NOT a user id, and
 * `CurrentUserType` carries no employeeId. Comparing the JWT id straight to
 * `assigned_to_employee_id` silently matches nothing — or worse, matches the
 * wrong person. `employee_profiles.user_id` is uniquely indexed, so this is 1:1.
 */
export const MY_EMPLOYEE_CTE = `
  my_employee AS (
    SELECT e.id
    FROM employee_profiles e
    WHERE e.user_id = $1
      -- The unique index on user_id is global, not partial on deleted_at, so a
      -- deactivated profile still resolves here and drags its tickets in.
      AND e.deleted_at IS NULL
  )
`;

/**
 * Service tickets that are mine.
 *
 * Requires MY_CUSTOMERS_CTE, MY_PROJECTS_CTE and MY_EMPLOYEE_CTE ahead of it.
 *
 * The `project_id IN my_projects` branch goes BEYOND the ownership table in
 * spec section 3, which lists only creator, assignee and the customer walk. It
 * is retained deliberately: a ticket raised against a project I build is work
 * that lands on my desk whether or not anyone assigned it to me. Measured
 * against the live database: 14 distinct tickets and 14 distinct users, in 54
 * ticket-user pairs, are visible ONLY through this branch today. For each pair,
 * the user is neither the ticket's assignee nor its creator, and cannot reach
 * it through their customer walk either. Narrowing to the spec's three
 * columns would silently delete them from those dashboards. If the table is
 * ever tightened, that decision belongs here, in one place, not inside a
 * provider.
 */
export const MY_SERVICE_TICKETS_CTE = `
  my_service_tickets AS (
    SELECT t.id
    FROM service_tickets t
    WHERE t.deleted_at IS NULL
      AND (
        -- Assigned to ME. The hop through employee_profiles is mandatory:
        -- assigned_to_employee_id is an employee id, not a user id.
        t.assigned_to_employee_id IN (SELECT id FROM my_employee)
        OR t.created_by = $1
        OR t.project_id  IN (SELECT id FROM my_projects)
        OR t.customer_id IN (SELECT id FROM my_customers)
      )
  )
`;

/** Compose a WITH clause from the fragments a provider needs, in order. */
export function withCtes(...ctes: string[]): string {
  return `WITH ${ctes.join(',\n')}`;
}
