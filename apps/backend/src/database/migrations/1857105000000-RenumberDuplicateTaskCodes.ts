import { MigrationInterface, QueryRunner } from 'typeorm';

const SHARED_CODES = `
  SELECT code
    FROM project_tasks
   WHERE code IS NOT NULL
   GROUP BY code
  HAVING count(*) > 1
`;

/**
 * One-time repair: task codes that more than one task holds.
 *
 * generateEntityCode picked "the highest code" in text order. Once a sequence
 * passed 9999, every new code came out as …-10000 (fixed on this branch). On
 * the 2026-09-12 local restore, TSK-ONEOHM_EPC-2026-10000 was held by 264
 * tasks: all 44 tasks of each of six projects.
 *
 * A shared code breaks a soft delete of two such tasks of one project in one
 * statement. Both rows get the same deleted_at, and
 * uq_project_tasks_project_code (project_id, code, deleted_at) refuses it. The
 * loan task sync and the loan cleanup migration both delete that way.
 *
 * For every code that more than one task holds (deleted tasks included), the
 * earliest task keeps the code. Each other task gets the next free number for
 * the code's prefix, padded to at least 4 digits, as generateEntityCode pads.
 *
 * REVERTING: down() changes nothing. The shared codes came from the bug and
 * carried no information.
 */
export class RenumberDuplicateTaskCodes1857105000000 implements MigrationInterface {
  name = 'RenumberDuplicateTaskCodes1857105000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [renumbered] = (await queryRunner.query(`
      WITH to_renumber AS (
        SELECT t.id, t.created_at,
               regexp_replace(t.code, '[0-9]+$', '') AS prefix,
               row_number() OVER (PARTITION BY t.code ORDER BY t.created_at, t.id) AS rank_in_code
          FROM project_tasks t
         WHERE t.code IN (${SHARED_CODES})
      ),
      prefix_top AS (
        SELECT regexp_replace(code, '[0-9]+$', '') AS prefix,
               max(substring(code FROM '([0-9]+)$')::bigint) AS top
          FROM project_tasks
         WHERE code IS NOT NULL
         GROUP BY 1
      ),
      numbered AS (
        SELECT r.id, r.prefix,
               p.top + row_number() OVER (PARTITION BY r.prefix ORDER BY r.created_at, r.id) AS n
          FROM to_renumber r
          JOIN prefix_top p ON p.prefix = r.prefix
         WHERE r.rank_in_code > 1
      )
      UPDATE project_tasks t
         SET code = numbered.prefix || lpad(numbered.n::text, greatest(4, length(numbered.n::text)), '0'),
             updated_at = CURRENT_TIMESTAMP
        FROM numbered
       WHERE t.id = numbered.id
      RETURNING t.id
    `)) as [Array<{ id: string }>, number];

    console.warn(`[migration] Renumbered ${renumbered.length} task code(s) that another task also held.`);

    const [row] = (await queryRunner.query(
      `SELECT count(*)::int AS shared FROM (${SHARED_CODES}) s`,
    )) as Array<{ shared: number }>;
    const shared = row?.shared ?? 0;
    if (shared > 0) {
      throw new Error(`[migration] ${shared} task code(s) are still shared after renumbering.`);
    }
  }

  public async down(): Promise<void> {
    console.warn('[migration] RenumberDuplicateTaskCodes1857105000000: nothing to restore.');
  }
}
