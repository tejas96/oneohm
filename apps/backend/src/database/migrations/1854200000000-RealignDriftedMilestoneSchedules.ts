import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Realign 12 milestone schedules that disagree with their signed quote.
 *
 * WHAT WENT WRONG
 *   `quote_versions.payment_milestones` stores an amount per milestone. For 12
 *   quotes written between March and June 2026 those amounts were computed
 *   against a total that is not the quote's `final_price` — most often the
 *   PRE-discount total, so the discount the customer was given never reached
 *   the payment schedule. Conversion then copied them faithfully
 *   (`conversion_drift` is 0 for all 12), so the project inherited the
 *   disagreement.
 *
 *   The write path has since been fixed: quotes created through either the
 *   quote builder or `create-from-calculation` now produce schedules that match
 *   `final_price` to within a paise, and `reconcileToContract` absorbs that
 *   paise at conversion. No quote created after June 2026 carries this. This
 *   migration repairs the data the old path left behind.
 *
 * WHO IT AFFECTS
 *   9 projects bill the customer MORE than they agreed — Rs 1,20,679.33 in
 *   total, up to Rs 20,693.98 on one project. Two customers have already paid
 *   their agreed price in full and are still being chased: Chandabi Jakate paid
 *   Rs 1,66,500.00 against an agreed Rs 1,66,116.39 and the system still shows
 *   Rs 18,506.18 outstanding.
 *   3 projects bill LESS than agreed, Rs 72,203.00 in the company's disfavour.
 *
 * WHY IT REALLOCATES AS WELL AS REPRICES
 *   Repricing alone is not enough. Where a receipt was allocated against an
 *   inflated milestone, shrinking that milestone strands the allocation on it
 *   as over-allocation while later milestones still show a balance — so the
 *   customer keeps being chased. Measured: repricing alone fixes 9 of 12 and
 *   leaves Chandabi Jakate still chased for Rs 16,611.64.
 *
 *   It would also break an invariant the database currently satisfies:
 *   `v_milestone_balance` has ZERO over-allocated milestones today. So the 16
 *   allocation rows on the 7 affected projects are rebuilt with the same
 *   interval-intersection waterfall the original backfill used
 *   (`sql/ledger/05-allocate-waterfall.sql.ts`), which cannot over-allocate by
 *   construction. None of the affected projects has a reversal, so there is no
 *   reversal mirroring to preserve.
 *
 * WHY IT SCALES BY AMOUNT AND NOT BY PERCENTAGE
 *   `payment_milestones.percentage` is display-only and unusable here: 4 of the
 *   12 projects have no percentages at all. `amount_paise` is authoritative,
 *   and the stored amounts are internally consistent — all milestones on a
 *   project imply the same (wrong) total — so scaling them preserves the agreed
 *   proportions. The rounding remainder goes to the final milestone, the same
 *   rule `reconcileToContract` and `splitByPercentage` apply.
 *
 * SELECTION IS BY CONDITION, NOT BY ID
 *   Rows are chosen by "milestone sum differs from the pinned quote version by
 *   more than 100 paise". A 1-paise rounding difference is deliberately left
 *   alone. Re-running is therefore a no-op: once realigned, nothing matches.
 *
 * BEFORE RUNNING
 *   Produce the before/after record for finance sign-off:
 *     apps/backend/src/database/scripts/realign-drifted-milestones-preview.sql
 */
export class RealignDriftedMilestoneSchedules1854200000000 implements MigrationInterface {
  name = 'RealignDriftedMilestoneSchedules1854200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The set of projects to repair, frozen before anything changes. Every
    // later step reads from this so the selection cannot shift mid-migration
    // as amounts are rewritten.
    await queryRunner.query(`
      CREATE TEMP TABLE drift_targets ON COMMIT DROP AS
      SELECT
        pr.id                                   AS project_id,
        pr.project_number,
        ROUND(qv.final_price * 100)::bigint     AS target_paise,
        SUM(pm.amount_paise)                    AS current_paise
      FROM projects pr
      JOIN quote_versions qv     ON qv.id = pr.contract_quote_version_id
      JOIN payment_milestones pm ON pm.project_id = pr.id AND pm.source = 'quote_snapshot'
      WHERE pr.deleted_at IS NULL
      GROUP BY pr.id, pr.project_number, qv.final_price
      HAVING ABS(ROUND(qv.final_price * 100)::bigint - SUM(pm.amount_paise)) > 100
    `);

    const rows = (await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM drift_targets`,
    )) as Array<{ count: number }>;

    if ((rows[0]?.count ?? 0) === 0) {
      // Already realigned, or running against a database that never carried
      // the bad quotes. Nothing to do.
      return;
    }

    // ---- 1. Reprice ------------------------------------------------------
    // Only quote_snapshot milestones. Change orders and manual milestones are
    // separate agreements and are not part of the signed quote total.
    await queryRunner.query(`
      WITH scaled AS (
        SELECT
          pm.id,
          d.target_paise,
          ROUND(pm.amount_paise::numeric * d.target_paise / d.current_paise)::bigint AS scaled_paise,
          ROW_NUMBER() OVER (
            PARTITION BY d.project_id ORDER BY pm.display_order DESC, pm.id DESC
          ) AS rn_from_end,
          SUM(ROUND(pm.amount_paise::numeric * d.target_paise / d.current_paise)::bigint)
            OVER (PARTITION BY d.project_id) AS scaled_sum
        FROM drift_targets d
        JOIN payment_milestones pm
          ON pm.project_id = d.project_id AND pm.source = 'quote_snapshot'
      )
      UPDATE payment_milestones pm
      SET amount_paise = CASE
            WHEN s.rn_from_end = 1 THEN s.scaled_paise + (s.target_paise - s.scaled_sum)
            ELSE s.scaled_paise
          END
      FROM scaled s
      WHERE pm.id = s.id
    `);

    await queryRunner.query(`
      DO $$
      DECLARE bad INTEGER;
      BEGIN
        SELECT COUNT(*) INTO bad
        FROM payment_milestones pm
        JOIN drift_targets d ON d.project_id = pm.project_id
        WHERE pm.source = 'quote_snapshot' AND pm.amount_paise <= 0;
        IF bad > 0 THEN
          RAISE EXCEPTION 'Realign: % milestones would be non-positive after scaling.', bad;
        END IF;
      END $$
    `);

    // ---- 2. Reallocate ---------------------------------------------------
    // ledger_allocations is append-only at runtime. A migration correcting a
    // historical mistake is the one legitimate exception, and the trigger is
    // re-enabled below before this transaction can commit.
    await queryRunner.query(
      `ALTER TABLE ledger_allocations DISABLE TRIGGER trg_ledger_allocations_append_only`,
    );

    await queryRunner.query(`
      DELETE FROM ledger_allocations a
      USING drift_targets d
      WHERE a.project_id = d.project_id
    `);

    // Same interval-intersection waterfall as sql/ledger/05-allocate-waterfall.sql.ts,
    // scoped to the repaired projects. Milestone j and receipt k each occupy an
    // interval on the project's number line; the allocation between them is the
    // length of their intersection. Σ per milestone can never exceed the
    // milestone, so over-allocation is impossible by construction. A receipt
    // beyond the contract intersects nothing and stays unallocated — which is
    // exactly how an overpayment becomes customer credit.
    await queryRunner.query(`
      WITH ms AS (
        SELECT
          m.id, m.project_id,
          COALESCE(SUM(m.amount_paise) OVER (
            PARTITION BY m.project_id ORDER BY m.display_order, m.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::BIGINT AS lo,
          SUM(m.amount_paise) OVER (
            PARTITION BY m.project_id ORDER BY m.display_order, m.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::BIGINT AS hi
        FROM payment_milestones m
        WHERE m.status = 'active'
          AND m.project_id IN (SELECT project_id FROM drift_targets)
      ),
      rc AS (
        SELECT
          e.id AS entry_id, e.project_id, e.created_by,
          COALESCE(SUM(e.amount_paise) OVER (
            PARTITION BY e.project_id ORDER BY e.value_date, e.created_at, e.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::BIGINT AS lo,
          SUM(e.amount_paise) OVER (
            PARTITION BY e.project_id ORDER BY e.value_date, e.created_at, e.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::BIGINT AS hi
        FROM ledger_entries e
        WHERE e.direction = 'in'
          AND e.reverses_id IS NULL
          AND e.project_id IN (SELECT project_id FROM drift_targets)
      )
      INSERT INTO ledger_allocations (entry_id, milestone_id, project_id, amount_paise, is_inferred, created_by)
      SELECT rc.entry_id, ms.id, rc.project_id,
             (LEAST(rc.hi, ms.hi) - GREATEST(rc.lo, ms.lo))::BIGINT,
             true, rc.created_by
      FROM rc
      JOIN ms ON ms.project_id = rc.project_id
      WHERE LEAST(rc.hi, ms.hi) > GREATEST(rc.lo, ms.lo)
    `);

    // The over-allocation constraint is DEFERRABLE INITIALLY DEFERRED, so the
    // INSERT above leaves one queued event per row. These MUST be fired before
    // the ALTER TABLE below: Postgres refuses to alter a table that has pending
    // trigger events, so re-enabling the append-only trigger first fails with
    // "cannot ALTER TABLE ... because it has pending trigger events". The same
    // ordering trap is documented in sql/ledger/05-allocate-waterfall.sql.ts.
    await queryRunner.query(`SET CONSTRAINTS trg_ledger_allocations_not_over_allocated IMMEDIATE`);

    await queryRunner.query(
      `ALTER TABLE ledger_allocations ENABLE TRIGGER trg_ledger_allocations_append_only`,
    );

    // ---- 3. Assert -------------------------------------------------------
    await queryRunner.query(`
      DO $$
      DECLARE n INTEGER;
      BEGIN
        SELECT COUNT(*) INTO n
        FROM payment_milestones pm
        JOIN projects pr        ON pr.id = pm.project_id
        JOIN quote_versions qv  ON qv.id = pr.contract_quote_version_id
        JOIN drift_targets d    ON d.project_id = pm.project_id
        WHERE pm.source = 'quote_snapshot'
        GROUP BY pm.project_id, qv.final_price
        HAVING SUM(pm.amount_paise) <> ROUND(qv.final_price * 100)::bigint;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN
          RAISE EXCEPTION 'Realign: % projects still disagree with their signed quote.', n;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      DECLARE n INTEGER;
      BEGIN
        SELECT COUNT(*) INTO n FROM v_milestone_balance WHERE over_allocated_paise > 0;
        IF n > 0 THEN
          RAISE EXCEPTION 'Realign: % milestones are over-allocated; the waterfall makes this impossible.', n;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      DECLARE n INTEGER;
      BEGIN
        SELECT COUNT(*) INTO n FROM (
          SELECT a.entry_id
          FROM ledger_allocations a
          GROUP BY a.entry_id
          HAVING SUM(a.amount_paise) > (
            SELECT ABS(e.amount_paise) FROM ledger_entries e WHERE e.id = a.entry_id)
        ) x;
        IF n > 0 THEN
          RAISE EXCEPTION 'Realign: % receipts have more allocated than they carry.', n;
        END IF;
      END $$
    `);

    // Money conservation: nothing was created or destroyed. Every rupee still
    // sits either against a milestone or as unallocated credit on its receipt.
    await queryRunner.query(`
      DO $$
      DECLARE n INTEGER;
      BEGIN
        SELECT COUNT(*) INTO n
        FROM drift_targets d
        WHERE COALESCE((SELECT SUM(a.amount_paise) FROM ledger_allocations a
                         WHERE a.project_id = d.project_id), 0)
              > COALESCE((SELECT SUM(e.amount_paise) FROM ledger_entries e
                           WHERE e.project_id = d.project_id AND e.direction = 'in'), 0);
        IF n > 0 THEN
          RAISE EXCEPTION 'Realign: % projects allocate more than they received.', n;
        END IF;
      END $$
    `);
  }

  /**
   * Deliberately not reversible.
   *
   * The previous amounts are the defect: restoring them would put nine
   * customers back on the hook for money they never agreed to, including two
   * who have already paid in full. The before/after record produced by
   * `scripts/realign-drifted-milestones-preview.sql` is the audit trail; if a
   * specific project needs revisiting, correct that project rather than
   * reinstating all twelve.
   */
  public async down(): Promise<void> {
    throw new Error(
      'RealignDriftedMilestoneSchedules is not reversible: the previous milestone ' +
        'amounts disagreed with the signed quotes and reinstating them would resume ' +
        'overbilling nine customers. See the before/after CSV from ' +
        'scripts/realign-drifted-milestones-preview.sql.',
    );
  }
}
