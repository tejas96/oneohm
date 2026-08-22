import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Collapses three one-off spellings of `workflow_steps.default_department`.
 *
 * The client's dashboard request groups work into four departments. The column
 * holds eight distinct strings, three of which are a single step filed under a
 * near-miss of a real department name:
 *
 *   EXE-0011  Net Meter Installation          'Execution'             -> 'Execution Department'
 *   DES-001   DSS Work                        'Execution Engineering' -> 'Execution Department'
 *   LOAN -02  Jan Samarth Portal Registration 'Loan'                  -> 'Loan Department'
 *
 * The first two are not a judgement call: the client's own CSV lists both DSS
 * and Net Meter Installation under EXECUTION. The third is a pure spelling fix
 * and does NOT settle which team owns Jan Samarth — the data says Loan, the
 * client's CSV says Liaisoning, and that disagreement is still open.
 *
 * Fixed here rather than normalised in the reporting query on purpose. A
 * `CASE ... ILIKE` in one endpoint hides the inconsistency and leaves the next
 * feature to rediscover it; grouped as-is the screen shows eight columns where
 * four were asked for, and splits DSS Work away from the execution team.
 *
 * `Design Engineering` is deliberately NOT merged. It is a real team with two
 * steps and 462 tasks that the client's CSV simply omits, and folding it into
 * Execution to match a spreadsheet would hide work rather than report it.
 *
 * The six steps with no department at all are change-request types
 * (Consumer Name Change, New Connection, …), not pipeline stages, and are left
 * null so they stay out of the grid.
 */
export class NormaliseWorkflowStepDepartments1855700000000 implements MigrationInterface {
  name = 'NormaliseWorkflowStepDepartments1855700000000';

  /** Keyed by `code`, which is stable; `name` is user-editable. */
  private readonly moves: ReadonlyArray<{ code: string; from: string; to: string }> = [
    { code: 'EXE-0011', from: 'Execution', to: 'Execution Department' },
    { code: 'DES-001', from: 'Execution Engineering', to: 'Execution Department' },
    { code: 'LOAN -02', from: 'Loan', to: 'Loan Department' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const move of this.moves) {
      await queryRunner.query(
        `UPDATE workflow_steps SET default_department = $1, updated_at = NOW()
         WHERE code = $2 AND default_department = $3`,
        [move.to, move.code, move.from],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const move of this.moves) {
      await queryRunner.query(
        `UPDATE workflow_steps SET default_department = $1, updated_at = NOW()
         WHERE code = $2 AND default_department = $3`,
        [move.from, move.code, move.to],
      );
    }
  }
}
