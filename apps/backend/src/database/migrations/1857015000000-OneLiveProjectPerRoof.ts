import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * OneLiveProjectPerRoof — relaxes the database's one-project-per-roof rule to
 * one-*live*-project-per-roof, matching ProjectRepository.findLiveByPropertyId
 * (this same task) and the application guard in ProjectService.convertFromQuote.
 *
 * `UQ_projects_property_id` (added by SimplifyProjectsTable1769862462000) was
 * `UNIQUE (property_id) WHERE deleted_at IS NULL` — at most one non-deleted
 * project per roof, full stop. Cancelling a project does not soft-delete it
 * (cancelled projects stay visible by design — cancel_reason, loss_reason and
 * cancelled_at all live on the same row precisely so the history isn't lost),
 * so a cancelled project keeps `deleted_at IS NULL` and keeps occupying its
 * roof's one slot under that index forever. The application guard
 * (findLiveByPropertyId) already stopped counting a cancelled project as
 * blocking a re-sale, so a re-sold roof's INSERT sailed past that guard and
 * then hit this index instead — verified directly against the live database,
 * where all three existing cancelled projects still carry `deleted_at IS
 * NULL` and would collide with a second, live project on the same roof.
 *
 * The rule is not being removed — it is being stated correctly. A roof may
 * carry any number of cancelled projects (each a dead deal, kept for its
 * history) plus AT MOST ONE live one. Cancelled rows are excluded from the
 * uniqueness predicate itself, `status <> 'cancelled'`, rather than from
 * `deleted_at` — nothing about a cancelled project's visibility changes.
 *
 * down() restores the original, stricter predicate with a bare
 * `CREATE UNIQUE INDEX` and no duplicate check beforehand — mirroring
 * MilestoneCancelledStatus1857010000000's own down(), which restores its
 * CHECK constraint the same way. Postgres validates a unique index against
 * every existing row at creation time, so that statement fails outright,
 * loudly, the moment any roof already carries a cancelled project alongside
 * a live one — which is exactly the state this migration exists to make
 * reachable. That failure is intentional, not a regression: reverting past
 * this migration once a roof has been re-sold after a cancellation requires
 * deciding what the stale cancelled project becomes first (deleted, or
 * something else) — a data decision this migration cannot make on a
 * caller's behalf.
 */
export class OneLiveProjectPerRoof1857015000000 implements MigrationInterface {
  name = 'OneLiveProjectPerRoof1857015000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_projects_property_id"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_projects_property_id" ON "projects" ("property_id")
      WHERE deleted_at IS NULL AND status <> 'cancelled'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_projects_property_id"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_projects_property_id" ON "projects" ("property_id")
      WHERE deleted_at IS NULL
    `);
  }
}
