/**
 * Pre-flight guards. Every composite unique index that currently leads with
 * `organization_id` becomes narrower once the column goes. With one tenant these
 * cannot collide — but "cannot" is exactly the assumption worth checking before
 * irreversible DDL, so each one fails loudly instead of silently deduplicating.
 */

/**
 * Quote a value as a SQL string literal. Several column expressions below
 * contain single quotes — `specifications ->> 'structure_type'` — and
 * interpolating those raw into the RAISE message produces a syntax error at
 * migration time, i.e. exactly when it is most expensive to discover.
 */
const lit = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Split a column list on top-level commas, leaving parenthesised expressions
 * such as `(specifications ->> 'structure_type')` intact.
 */
const splitColumns = (cols: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of cols) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() !== '') out.push(current.trim());
  return out;
};

/**
 * A Postgres unique index permits unlimited NULLs — two rows with a NULL
 * `employee_id` do not conflict. `GROUP BY`, however, collapses all NULLs into
 * a single group, so a naive duplicate check reports a violation that the index
 * would happily accept. `employee_profiles` has 30 such rows; without this
 * guard the migration refuses to run against real data, and "fixing" the data to
 * satisfy it would corrupt 30 employee records to appease a bug in the check.
 */
const assertUnique = (table: string, cols: string, where = 'TRUE'): string => {
  const notNull = splitColumns(cols)
    .map((c) => `${c} IS NOT NULL`)
    .join(' AND ');
  return `
  DO $$
  DECLARE dupes INT;
  BEGIN
    SELECT COUNT(*) INTO dupes FROM (
      SELECT ${cols} FROM ${table} WHERE (${where}) AND ${notNull}
      GROUP BY ${cols} HAVING COUNT(*) > 1
    ) d;
    IF dupes > 0 THEN
      RAISE EXCEPTION
        'org-cleanup: % duplicate group(s) in %(%) would violate uniqueness once organization_id is dropped',
        dupes, ${lit(table)}, ${lit(cols)};
    END IF;
  END $$;
`;
};

export const ORG_CLEANUP_ASSERTIONS: string[] = [
  `DO $$
   DECLARE n INT;
   BEGIN
     SELECT COUNT(*) INTO n FROM organizations;
     IF n <> 1 THEN
       RAISE EXCEPTION 'org-cleanup: expected exactly 1 organization, found %', n;
     END IF;
   END $$;`,

  assertUnique('customer_profiles', 'user_id'),
  assertUnique('customer_profiles', 'lower(email)', 'deleted_at IS NULL AND email IS NOT NULL'),
  assertUnique('customer_profiles', 'phone', 'deleted_at IS NULL AND phone IS NOT NULL'),
  assertUnique('employee_profiles', 'user_id'),
  assertUnique('employee_profiles', 'employee_id'),
  assertUnique('employee_profiles', 'company_code', 'company_code IS NOT NULL'),
  assertUnique('numbering_sequences', 'sequence_key'),
  assertUnique('ledger_entries', 'entry_no'),
  assertUnique('payments', 'payment_number', 'deleted_at IS NULL'),
  assertUnique('project_expenses', 'expense_number', 'deleted_at IS NULL'),
  assertUnique('purchase_orders', 'po_number'),
  assertUnique('material_dispatches', 'dispatch_number'),
  assertUnique('brands', 'name'),
  assertUnique('products', 'code'),
  assertUnique('product_types', 'code'),
  assertUnique('vendors', 'code'),
  assertUnique('warehouses', 'code'),
  assertUnique('roles', 'code'),
  assertUnique('approval_templates', 'code, deleted_at'),
  assertUnique('workflow_steps', 'code, deleted_at'),
  assertUnique(
    'workflow_steps',
    'change_request_type',
    'deleted_at IS NULL AND change_request_type IS NOT NULL',
  ),
  assertUnique('integrations', 'provider, category'),
  assertUnique('installation_pricing', 'min_system_size_kw, max_system_size_kw'),
  assertUnique('subsidy_configurations', 'scheme_code', 'scheme_code IS NOT NULL'),
  assertUnique('saved_views', 'user_id, resource, name'),
  assertUnique('user_roles', 'user_id, role_id'),
  assertUnique('user_roles', 'user_id, role', 'role IS NOT NULL'),
  assertUnique('quote_configurations', 'is_active', 'is_active = TRUE'),
  assertUnique(
    'products',
    "product_type_id, (specifications ->> 'structure_type')",
    "status = 'active' AND deleted_at IS NULL AND (specifications ->> 'structure_type') IS NOT NULL AND (specifications ->> 'structure_type') <> ''",
  ),
];
