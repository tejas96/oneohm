import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Follow-up to 1857200000000-AddReportFactsToProjects: that migration copied
 * old hand-typed report text into `projects.report_facts` verbatim, without
 * applying the fact rules the live "Reports" tab enforces on new input. Some
 * of that carried-over text does not satisfy its fact's type — most visibly
 * `cmc_period_years` (a `number` fact) holding values like "5 Years", which
 * renders in the WCR as "5 Years years".
 *
 * This migration is deliberately narrow: it only fixes the one shape that is
 * both common and unambiguous — a `number`/`year` fact whose value is a bare
 * number immediately followed by a unit word (e.g. "5 Years", "5 yrs",
 * "2024 year"). It strips the unit word and keeps the number. Every other
 * value (including ones that still fail their fact's rule afterwards, such
 * as `application_date` free text like "11 April 2026") is left untouched —
 * those need a human to re-type them on the Reports tab, not a silent guess.
 *
 * Self-contained on purpose: TypeORM's migration CLI runs this file directly
 * and does not resolve the `@tejas96/shared` path alias, so the fact list
 * and the "number followed by a unit word" shape are inlined here rather
 * than imported from libs/shared/src/reports.
 */

// The only two manual, stored facts (source: 'manual' in report-facts.ts)
// whose type is 'number' or 'year' — i.e. the only report_facts keys this
// migration touches.
const NUMBER_OR_YEAR_KEYS = ['cmc_period_years', 'inverter_year_of_manufacturing'] as const;

// "5 Years", "5 yrs", "2024 year", "5   Years" — a number (integer or
// decimal) followed by whitespace and a single trailing word of letters.
const NUMBER_PLUS_UNIT_RE = /^(\d+(?:\.\d+)?)\s+[A-Za-z]+\.?$/;

export class NormalizeBackfilledReportFacts1857210000000 implements MigrationInterface {
  name = 'NormalizeBackfilledReportFacts1857210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: string; report_facts: Record<string, string> }> = await queryRunner.query(
      `SELECT id, report_facts
         FROM projects
        WHERE report_facts IS NOT NULL
          AND report_facts != '{}'::jsonb`,
    );

    for (const row of rows) {
      const facts = row.report_facts ?? {};
      let changed = false;
      const next = { ...facts };

      for (const key of NUMBER_OR_YEAR_KEYS) {
        const value = facts[key];
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        const match = NUMBER_PLUS_UNIT_RE.exec(trimmed);
        if (match) {
          next[key] = match[1]!;
          changed = true;
        }
      }

      if (changed) {
        await queryRunner.query(`UPDATE projects SET report_facts = $1::jsonb WHERE id = $2`, [
          JSON.stringify(next),
          row.id,
        ]);
      }
    }
  }

  public async down(): Promise<void> {
    // No-op: the original free text (e.g. "5 Years") is not recoverable from
    // the normalized number, and nothing else depends on the pre-migration
    // value, so there is nothing meaningful to restore.
  }
}
