/**
 * Re-pin projects whose contract_quote_version_id is still NULL.
 *
 * M2 (1851000000001) backfilled every project that existed when it ran. But the
 * application code did not set the pin at conversion time, so every project
 * created between M2 and that fix landed with a NULL pin — and would have kept
 * it forever, because M2 only ever runs once.
 *
 * The selector differs from M2's in one deliberate way: it orders by
 * `version_number` before `created_at`. `quote_versions.version_number` is NOT
 * NULL and unique per quote; `created_at` is nullable, so ordering on it first
 * puts NULL-dated rows in an arbitrary position. M2 is left as-is — it has
 * already run against production and rewriting applied history would be worse
 * than the inconsistency.
 *
 * Idempotent by construction: guarded on `IS NULL`, so re-running is a no-op.
 * Deliberately never picks the latest version — that is the drift being fixed.
 */
export const REPIN_NULL_CONTRACT_QUOTE_VERSIONS = `
  UPDATE projects p
     SET contract_quote_version_id = COALESCE(
       (SELECT t.source_quote_version_id
          FROM project_payment_terms t
         WHERE t.project_id = p.id
           AND t.deleted_at IS NULL
           AND t.source_quote_version_id IS NOT NULL
         ORDER BY t.display_order, t.id
         LIMIT 1),
       (SELECT m.source_quote_version_id
          FROM payment_milestones m
         WHERE m.project_id = p.id
           AND m.source = 'quote_snapshot'
           AND m.source_quote_version_id IS NOT NULL
         ORDER BY m.display_order, m.id
         LIMIT 1),
       (SELECT qv.id
          FROM quote_versions qv
         WHERE qv.quote_id = p.quote_id
         ORDER BY qv.version_number ASC, qv.created_at ASC
         LIMIT 1)
     )
   WHERE p.contract_quote_version_id IS NULL
     AND p.quote_id IS NOT NULL
`;

/**
 * A project converted from a quote must name its contract version.
 *
 * Reported rather than enforced with NOT NULL: projects can legitimately be
 * created without a quote, and failing the migration on a data shape we have
 * not audited across every environment is not worth the strictness.
 */
export const ASSERT_CONTRACT_VERSION_PINNED = `
  DO $$
  DECLARE unpinned INT;
  BEGIN
    SELECT COUNT(*) INTO unpinned
      FROM projects p
     WHERE p.deleted_at IS NULL
       AND p.quote_id IS NOT NULL
       AND p.contract_quote_version_id IS NULL;
    IF unpinned > 0 THEN
      RAISE WARNING 'RepinContractQuoteVersions: % quote-derived project(s) still unpinned (their quote has no versions)', unpinned;
    END IF;
  END $$
`;

export const REPIN_CONTRACT_VERSIONS: string[] = [
  REPIN_NULL_CONTRACT_QUOTE_VERSIONS,
  ASSERT_CONTRACT_VERSION_PINNED,
];
