/**
 * Money checksum around the organization-removal migration.
 *
 * Run with no arguments BEFORE the migration to write the baseline; run with
 * --compare AFTER it. Any difference means the migration moved money and the
 * deploy must be rolled back, not investigated afterwards.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ormconfig exports the DataSource as a default (required by the TypeORM CLI).
import AppDataSource from '../database/ormconfig';

const BASELINE_PATH = process.env.ORG_CLEANUP_BASELINE ?? 'tmp/org-cleanup-baseline.json';

interface Baseline {
  ledgerEntryCount: number;
  ledgerSumPaise: string;
  allocationSumPaise: string;
  milestoneSumPaise: string;
  projectBalances: Array<{ project_id: string; outstanding_paise: string }>;
}

async function capture(): Promise<Baseline> {
  const ds = await AppDataSource.initialize();
  try {
    const [entries] = await ds.query(
      `SELECT COUNT(*)::text AS c, COALESCE(SUM(amount_paise), 0)::text AS s FROM ledger_entries`,
    );
    const [allocations] = await ds.query(
      `SELECT COALESCE(SUM(amount_paise), 0)::text AS s FROM ledger_allocations`,
    );
    const [milestones] = await ds.query(
      `SELECT COALESCE(SUM(amount_paise), 0)::text AS s FROM payment_milestones`,
    );
    const projectBalances = await ds.query(
      `SELECT project_id::text, outstanding_paise::text
         FROM v_project_balance ORDER BY project_id`,
    );
    return {
      ledgerEntryCount: Number(entries.c),
      ledgerSumPaise: entries.s,
      allocationSumPaise: allocations.s,
      milestoneSumPaise: milestones.s,
      projectBalances,
    };
  } finally {
    await ds.destroy();
  }
}

async function main(): Promise<void> {
  const compare = process.argv.includes('--compare');
  const current = await capture();

  if (!compare) {
    mkdirSync(dirname(BASELINE_PATH), { recursive: true });
    writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2));
    console.log(`Baseline written to ${BASELINE_PATH}`);
    console.log(`  ledger entries : ${current.ledgerEntryCount}`);
    console.log(`  ledger sum     : ${current.ledgerSumPaise} paise`);
    console.log(`  projects       : ${current.projectBalances.length}`);
    return;
  }

  if (!existsSync(BASELINE_PATH)) {
    throw new Error(`No baseline at ${BASELINE_PATH}. Run without --compare first.`);
  }
  const before = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;

  const diffs: string[] = [];
  if (before.ledgerEntryCount !== current.ledgerEntryCount) {
    diffs.push(`ledger entry count: ${before.ledgerEntryCount} -> ${current.ledgerEntryCount}`);
  }
  for (const key of ['ledgerSumPaise', 'allocationSumPaise', 'milestoneSumPaise'] as const) {
    if (before[key] !== current[key]) diffs.push(`${key}: ${before[key]} -> ${current[key]}`);
  }

  const beforeByProject = new Map(
    before.projectBalances.map((r) => [r.project_id, r.outstanding_paise]),
  );
  for (const row of current.projectBalances) {
    const prev = beforeByProject.get(row.project_id);
    if (prev !== row.outstanding_paise) {
      diffs.push(
        `project ${row.project_id} outstanding: ${prev ?? 'absent'} -> ${row.outstanding_paise}`,
      );
    }
  }
  if (before.projectBalances.length !== current.projectBalances.length) {
    diffs.push(
      `project count: ${before.projectBalances.length} -> ${current.projectBalances.length}`,
    );
  }

  if (diffs.length > 0) {
    console.error('MONEY MOVED — do not proceed:');
    for (const d of diffs) console.error(`  ${d}`);
    process.exit(1);
  }
  console.log(`Money unchanged across ${current.projectBalances.length} projects.`);
}

void main();
