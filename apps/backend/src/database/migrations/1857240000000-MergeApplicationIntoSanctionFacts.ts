import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The WCR printed "Sanction number and date" and the DCR printed "application
 * number … dated …" from two separate pairs of hand-typed facts, but every
 * real project holds the same DISCOM reference in both — written two ways,
 * e.g. sanction "1295 / K.MAHANKAL / 76717990" and application "76717990".
 * The dates were split the same way: the sanction date was almost always
 * empty and the application date free text ("11 April 2026").
 *
 * They are now one pair, `sanction_number` + `sanction_date`, printed by both
 * reports. This copies each project's application values into that pair:
 *   - number: taken when the sanction number is empty; when both are set and
 *     one contains the other, the longer (full) form wins; when they are
 *     unrelated, the sanction number is kept.
 *   - date: taken when the sanction date is empty, turned into an ISO date
 *     when it reads as one ("11 April 2026", "27-May-2026", "21 /5/26"), else
 *     copied as typed.
 *
 * `application_number` and `application_date` are left in report_facts
 * untouched: no report reads them any more, and keeping them means nothing
 * typed is lost.
 *
 * Self-contained on purpose: the migration CLI does not resolve the
 * `@tejas96/shared` path alias.
 */

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date.toISOString().slice(0, 10);
}

const fullYear = (year: string): number => (year.length === 2 ? 2000 + Number(year) : Number(year));

/**
 * "11 April 2026", "27-May-2026", "08-Mar-2026", "11/04/2026", "21 /5/26",
 * "2026-04-11" → an ISO date. Null when it does not read as a real date.
 */
function toIsoDate(raw: string): string | null {
  const value = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (m) return isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2}) ?[/.-] ?(\d{1,2}) ?[/.-] ?(\d{4}|\d{2})$/.exec(value);
  if (m) return isoDate(fullYear(m[3]!), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})(?:st|nd|rd|th)?[ /.-]([A-Za-z]{3,9})\.?,?[ /.-](\d{4}|\d{2})$/.exec(value);
  if (m) {
    const name = m[2]!.toLowerCase();
    const month = MONTHS.findIndex((full) => full === name || full.slice(0, 3) === name);
    if (month >= 0) return isoDate(fullYear(m[3]!), month + 1, Number(m[1]));
  }
  return null;
}

const digits = (value: string): string => value.replace(/\D/g, '');

/** The number both reports print, from what the two fields held. */
function mergedNumber(sanction: string, application: string): string {
  const s = sanction.trim();
  const a = application.trim();
  if (!s) return a;
  if (!a) return s;
  const sd = digits(s);
  const ad = digits(a);
  const related = sd && ad && (sd.includes(ad) || ad.includes(sd));
  return related && a.length > s.length ? a : s;
}

export class MergeApplicationIntoSanctionFacts1857240000000 implements MigrationInterface {
  name = 'MergeApplicationIntoSanctionFacts1857240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: string; report_facts: Record<string, string> }> =
      await queryRunner.query(
        `SELECT id, report_facts
           FROM projects
          WHERE report_facts ?| array['application_number', 'application_date']`,
      );

    for (const row of rows) {
      const facts = row.report_facts ?? {};
      const next = { ...facts };

      const number = mergedNumber(facts.sanction_number ?? '', facts.application_number ?? '');
      if (number) next.sanction_number = number;

      const sanctionDate = (facts.sanction_date ?? '').trim();
      const applicationDate = (facts.application_date ?? '').trim();
      if (!sanctionDate && applicationDate) {
        next.sanction_date = toIsoDate(applicationDate) ?? applicationDate;
      }

      if (JSON.stringify(next) !== JSON.stringify(facts)) {
        await queryRunner.query(`UPDATE projects SET report_facts = $1::jsonb WHERE id = $2`, [
          JSON.stringify(next),
          row.id,
        ]);
      }
    }
  }

  public async down(): Promise<void> {
    // No-op: application_number and application_date are still in
    // report_facts, unchanged, so nothing was lost; the sanction values this
    // filled in cannot be told apart from ones typed before.
  }
}
