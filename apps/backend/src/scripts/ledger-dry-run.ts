#!/usr/bin/env ts-node

/**
 * Ledger migration dry-run and reconciliation gate.
 *
 * Run this against a RESTORED PRODUCTION SNAPSHOT before the real cutover. It
 * verifies the already-applied ledger tables against their source tables and
 * emits the per-project before/after CSV that finance signs off on.
 *
 * The headline check is the **differential oracle**: the allocations produced by
 * the set-based SQL waterfall (M5) are compared row-for-row against the
 * unit-tested TypeScript `allocateWaterfall()`. Two independently written
 * implementations — one Postgres window function, one imperative loop — agreeing
 * on every real receipt and milestone is a far stronger correctness argument
 * than any synthetic fixture, and it pins the migration and the runtime write
 * path to identical semantics.
 *
 * Usage:
 *   npx ts-node src/scripts/ledger-dry-run.ts            # gates + CSV
 *   npx ts-node src/scripts/ledger-dry-run.ts --verify-only   # gates only
 *   npx ts-node src/scripts/ledger-dry-run.ts --csv out.csv
 *
 * Exits non-zero if any gate fails. That exit code is the cutover go/no-go.
 *
 * ⚠️ Every gate is scoped to the MIGRATED set — ledger entries carrying
 * `source_table = 'payments'` and milestones not created as change orders.
 * Without that scoping the gates go red the moment anyone records a payment
 * through the app, because the ledger legitimately diverges from the legacy
 * tables from that point on. A reconciliation that cries wolf after go-live is
 * worse than none, since nobody reads it.
 */

import { writeFileSync } from 'node:fs';

import { DataSource } from 'typeorm';

import { allocateWaterfall, type MilestoneCapacity } from '../modules/ledger/domain/allocation';

interface Gate {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
}

const gates: Gate[] = [];

function record(id: string, description: string, passed: boolean, detail: string): void {
  gates.push({ id, description, passed, detail });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${id.padEnd(4)} ${description}`);
  if (detail) {
    console.log(`        ${detail}`);
  }
}

const rupees = (paise: number | string): string =>
  (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

async function main(): Promise<void> {
  const verifyOnly = process.argv.includes('--verify-only');
  const csvIndex = process.argv.indexOf('--csv');
  const csvPath = csvIndex >= 0 ? process.argv[csvIndex + 1] : undefined;

  console.log('\n🔍 Ledger migration reconciliation\n');

  const { default: AppDataSource } = await import('../database/ormconfig');
  const ds: DataSource = AppDataSource;
  if (!ds.isInitialized) {
    await ds.initialize();
  }

  try {
    await runGates(ds);
    if (!verifyOnly) {
      await emitCsv(ds, csvPath);
    }
  } finally {
    if (ds.isInitialized) {
      await ds.destroy();
    }
  }

  const failed = gates.filter((g) => !g.passed);
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${gates.length - failed.length}/${gates.length} gates passed`);

  if (failed.length > 0) {
    console.log(`\n❌ NOT SAFE TO CUT OVER — failed: ${failed.map((g) => g.id).join(', ')}\n`);
    process.exit(1);
  }
  console.log('\n✅ All gates green.\n');
}

async function runGates(ds: DataSource): Promise<void> {
  // ── R1: cash conservation ────────────────────────────────────────────────
  const [r1] = await ds.query(`
    SELECT
      (SELECT COALESCE(ROUND(SUM(paid_amount) * 100), 0)::bigint
         FROM payments
        WHERE deleted_at IS NULL AND status IN ('received','verified','cleared')
          AND paid_amount > 0) AS old_paise,
      (SELECT COALESCE(SUM(amount_paise), 0)::bigint
         FROM ledger_entries
        WHERE direction = 'in' AND source_table = 'payments') AS new_paise
  `);
  record(
    'R1',
    'Cash conservation: SUM(payments) === SUM(ledger in)',
    r1.old_paise === r1.new_paise,
    `old ₹${rupees(r1.old_paise)}  →  new ₹${rupees(r1.new_paise)}`,
  );

  // ── R3: row conservation ─────────────────────────────────────────────────
  const [r3] = await ds.query(`
    SELECT
      (SELECT COUNT(*)::int FROM payments
        WHERE deleted_at IS NULL AND status IN ('received','verified','cleared')
          AND paid_amount > 0) AS old_rows,
      (SELECT COUNT(*)::int FROM ledger_entries WHERE source_table = 'payments') AS new_rows
  `);
  record(
    'R3',
    'Row conservation: every counted payment posted once',
    r3.old_rows === r3.new_rows,
    `${r3.old_rows} → ${r3.new_rows}`,
  );

  // ── R4: per-project cash unchanged ───────────────────────────────────────
  const r4 = await ds.query(`
    SELECT p.project_id, p.old_paise, COALESCE(l.new_paise, 0) AS new_paise
    FROM (
      SELECT project_id, ROUND(SUM(paid_amount) * 100)::bigint AS old_paise
        FROM payments
       WHERE deleted_at IS NULL AND status IN ('received','verified','cleared')
         AND paid_amount > 0
       GROUP BY project_id
    ) p
    LEFT JOIN (
      SELECT project_id, SUM(amount_paise)::bigint AS new_paise
        FROM ledger_entries
       WHERE direction = 'in' AND source_table = 'payments'
       GROUP BY project_id
    ) l ON l.project_id = p.project_id
    WHERE p.old_paise IS DISTINCT FROM COALESCE(l.new_paise, 0)
  `);
  record('R4', 'Per-project cash unchanged', r4.length === 0, `${r4.length} mismatched projects`);

  // ── R5: contract conservation ────────────────────────────────────────────
  const r5 = await ds.query(`
    SELECT t.project_id, t.old_paise, COALESCE(m.new_paise, 0) AS new_paise
    FROM (
      SELECT project_id, ROUND(SUM(expected_amount) * 100)::bigint AS old_paise
        FROM project_payment_terms
       WHERE deleted_at IS NULL AND status <> 'cancelled'
       GROUP BY project_id
    ) t
    LEFT JOIN (
      SELECT project_id, SUM(amount_paise)::bigint AS new_paise
        FROM payment_milestones
       WHERE source <> 'change_order'
       GROUP BY project_id
    ) m ON m.project_id = t.project_id
    WHERE t.old_paise IS DISTINCT FROM COALESCE(m.new_paise, 0)
  `);
  record(
    'R5',
    'Contract conservation per project',
    r5.length === 0,
    `${r5.length} mismatched projects`,
  );

  // ── R6: milestone parity ─────────────────────────────────────────────────
  const [r6] = await ds.query(`
    SELECT
      (SELECT COUNT(*)::int FROM project_payment_terms
        WHERE deleted_at IS NULL AND status <> 'cancelled') AS old_terms,
      (SELECT COUNT(*)::int FROM payment_milestones WHERE source <> 'change_order') AS new_milestones,
      (SELECT COUNT(*)::int FROM project_payment_terms WHERE deleted_at IS NOT NULL) AS excluded_deleted
  `);
  record(
    'R6',
    'Milestone parity (non-deleted terms → milestones)',
    r6.old_terms === r6.new_milestones,
    `${r6.old_terms} → ${r6.new_milestones}  (${r6.excluded_deleted} soft-deleted excluded by design)`,
  );

  // ── R7: THE FIX — no over-allocated milestones ───────────────────────────
  const r7 = await ds.query(`SELECT * FROM v_milestone_balance WHERE over_allocated_paise > 0`);
  record(
    'R7',
    'No over-allocated milestones (the 114 are fixed)',
    r7.length === 0,
    `${r7.length} over-allocated`,
  );

  // ── R8: no over-allocated entries ────────────────────────────────────────
  const r8 = await ds.query(`
    SELECT a.entry_id FROM ledger_allocations a
    JOIN ledger_entries e ON e.id = a.entry_id
    GROUP BY a.entry_id, e.amount_paise
    HAVING ABS(SUM(a.amount_paise)) > ABS(e.amount_paise)
  `);
  record(
    'R8',
    'No entry allocated beyond its own amount',
    r8.length === 0,
    `${r8.length} over-allocated entries`,
  );

  // ── R9: unallocated is exactly overflow ──────────────────────────────────
  const r9 = await ds.query(`
    SELECT project_id, received_paise, expected_paise, unallocated_paise
      FROM v_project_balance
     WHERE unallocated_paise <> GREATEST(received_paise - expected_paise, 0)
  `);
  record(
    'R9',
    'Unallocated cash === overflow beyond contract',
    r9.length === 0,
    `${r9.length} projects disagree`,
  );

  // ── R10: integrity ───────────────────────────────────────────────────────
  const [r10] = await ds.query(`
    SELECT
      (SELECT COUNT(*)::int FROM ledger_entries WHERE created_by IS NULL) AS null_created_by,
      (SELECT COUNT(*)::int FROM ledger_entries WHERE amount_paise = 0) AS zero_amount,
      (SELECT COUNT(*)::int FROM ledger_entries WHERE value_date > CURRENT_DATE) AS future_dated,
      (SELECT COUNT(*)::int FROM (
         -- entry_no is globally unique now that organization_id is gone.
         SELECT entry_no FROM ledger_entries
          GROUP BY entry_no HAVING COUNT(*) > 1) d) AS dup_entry_no
  `);
  const r10ok =
    r10.null_created_by === 0 &&
    r10.zero_amount === 0 &&
    r10.future_dated === 0 &&
    r10.dup_entry_no === 0;
  record(
    'R10',
    'Integrity: created_by, non-zero, not future-dated, unique entry_no',
    r10ok,
    `null_created_by=${r10.null_created_by} zero=${r10.zero_amount} future=${r10.future_dated} dup_no=${r10.dup_entry_no}`,
  );

  // ── Scope note ───────────────────────────────────────────────────────────
  const [scope] = await ds.query(`
    SELECT
      (SELECT COUNT(*)::int FROM ledger_entries WHERE source_table IS NULL) AS post_migration_entries,
      (SELECT COUNT(*)::int FROM payment_milestones WHERE source = 'change_order') AS change_orders
  `);
  if (scope.post_migration_entries > 0 || scope.change_orders > 0) {
    console.log(
      `\n   ℹ️  ${scope.post_migration_entries} entries and ${scope.change_orders} change orders were created after migration.\n` +
        `      Gates above are scoped to the migrated set and exclude them by design.`,
    );
  }

  // ── R11: THE DIFFERENTIAL ORACLE ─────────────────────────────────────────
  await differentialOracle(ds);
}

/**
 * Re-derive every allocation in TypeScript and compare against what the SQL
 * waterfall actually wrote. Any disagreement means the two implementations have
 * diverged, and the migration must not proceed.
 */
async function differentialOracle(ds: DataSource): Promise<void> {
  const milestones: Array<{ project_id: string; id: string; amount_paise: string }> =
    await ds.query(`
      SELECT project_id, id, amount_paise
        FROM payment_milestones
       WHERE status = 'active'
       ORDER BY project_id, display_order, id
    `);

  const entries: Array<{ project_id: string; id: string; amount_paise: string }> = await ds.query(`
    SELECT project_id, id, amount_paise
      FROM ledger_entries
     WHERE direction = 'in' AND reverses_id IS NULL AND source_table = 'payments'
     ORDER BY project_id, value_date, created_at, id
  `);

  // Only migration-derived allocations. Runtime allocations reflect the state of
  // the milestones at the moment each receipt was recorded, which a replay over
  // today's data cannot reconstruct — and should not try to.
  const actual: Array<{ entry_id: string; milestone_id: string; amount_paise: string }> =
    await ds.query(
      `SELECT entry_id, milestone_id, amount_paise FROM ledger_allocations WHERE is_inferred = true`,
    );

  // group by project, preserving the SQL ordering
  const msByProject = new Map<string, Array<{ id: string; amount: number }>>();
  for (const m of milestones) {
    const list = msByProject.get(m.project_id) ?? [];
    list.push({ id: m.id, amount: Number(m.amount_paise) });
    msByProject.set(m.project_id, list);
  }

  const entriesByProject = new Map<string, Array<{ id: string; amount: number }>>();
  for (const e of entries) {
    const list = entriesByProject.get(e.project_id) ?? [];
    list.push({ id: e.id, amount: Number(e.amount_paise) });
    entriesByProject.set(e.project_id, list);
  }

  // Replay the waterfall in TypeScript, carrying capacity forward per project.
  const expected = new Map<string, number>(); // `${entryId}|${milestoneId}` -> paise
  for (const [projectId, projectEntries] of entriesByProject) {
    const ms = msByProject.get(projectId) ?? [];
    const remaining = new Map(ms.map((m) => [m.id, m.amount]));

    for (const entry of projectEntries) {
      const capacities: MilestoneCapacity[] = ms.map((m) => ({
        milestoneId: m.id,
        capacityPaise: remaining.get(m.id) as number,
      }));
      const { allocations } = allocateWaterfall(capacities, entry.amount);
      for (const a of allocations) {
        expected.set(`${entry.id}|${a.milestoneId}`, a.amountPaise);
        remaining.set(a.milestoneId, (remaining.get(a.milestoneId) as number) - a.amountPaise);
      }
    }
  }

  const actualMap = new Map<string, number>();
  for (const a of actual) {
    actualMap.set(`${a.entry_id}|${a.milestone_id}`, Number(a.amount_paise));
  }

  const mismatches: string[] = [];
  for (const [key, want] of expected) {
    const got = actualMap.get(key);
    if (got !== want) {
      mismatches.push(`${key}: TS says ${want}, SQL wrote ${got ?? 'nothing'}`);
    }
  }
  for (const [key, got] of actualMap) {
    if (!expected.has(key)) {
      mismatches.push(`${key}: SQL wrote ${got}, TS says nothing`);
    }
  }

  record(
    'R11',
    'Differential oracle: SQL waterfall === TypeScript allocateWaterfall',
    mismatches.length === 0,
    mismatches.length === 0
      ? `${actualMap.size} allocations across ${entriesByProject.size} projects agree exactly`
      : mismatches.slice(0, 5).join('\n        '),
  );
}

/** The artefact finance reviews and signs before cutover. */
async function emitCsv(ds: DataSource, csvPath?: string): Promise<void> {
  const rows = await ds.query(`
    SELECT
      pr.project_number,
      m.display_order,
      m.name,
      (m.amount_paise / 100.0)::numeric(14,2)     AS expected_rs,
      t.paid_amount                                AS old_paid_rs,
      (v.allocated_paise / 100.0)::numeric(14,2)  AS new_allocated_rs,
      ((v.allocated_paise / 100.0) - t.paid_amount)::numeric(14,2) AS delta_rs,
      t.status                                     AS old_status,
      v.derived_status                             AS new_status,
      (b.unallocated_paise / 100.0)::numeric(14,2) AS project_unallocated_rs,
      CASE WHEN (v.allocated_paise / 100.0) <> t.paid_amount THEN 'YES' ELSE '' END AS changed
    FROM payment_milestones m
    JOIN v_milestone_balance v ON v.milestone_id = m.id
    JOIN project_payment_terms t ON t.id = m.id
    JOIN projects pr ON pr.id = m.project_id
    JOIN v_project_balance b ON b.project_id = m.project_id
    ORDER BY pr.project_number, m.display_order
  `);

  const header =
    'project_number,milestone_order,milestone_name,expected_rs,old_paid_rs,new_allocated_rs,delta_rs,old_status,new_status,project_unallocated_rs,changed';
  const body = rows
    .map((r: Record<string, unknown>) =>
      [
        r.project_number,
        r.display_order,
        `"${String(r.name).replace(/"/g, '""')}"`,
        r.expected_rs,
        r.old_paid_rs,
        r.new_allocated_rs,
        r.delta_rs,
        r.old_status,
        r.new_status,
        r.project_unallocated_rs,
        r.changed,
      ].join(','),
    )
    .join('\n');

  const csv = `${header}\n${body}\n`;
  const changed = rows.filter((r: Record<string, unknown>) => r.changed === 'YES');
  const projectsChanged = new Set(changed.map((r: Record<string, unknown>) => r.project_number));

  console.log(`\n${'─'.repeat(70)}`);
  console.log('📋 Finance review summary');
  console.log(`   milestones total     : ${rows.length}`);
  console.log(`   milestones changed   : ${changed.length}`);
  console.log(`   projects affected    : ${projectsChanged.size}`);
  console.log('   NOTE: total received per project must be UNCHANGED (gate R4).');
  console.log('         Only the milestone a receipt is attributed to moves.');

  if (csvPath) {
    writeFileSync(csvPath, csv);
    console.log(`\n   CSV written to ${csvPath}`);
  } else {
    console.log('\n   (pass --csv <path> to write the full review file)');
  }
}

main().catch((error: unknown) => {
  console.error('\n💥 Dry-run failed:', error);
  process.exit(1);
});
