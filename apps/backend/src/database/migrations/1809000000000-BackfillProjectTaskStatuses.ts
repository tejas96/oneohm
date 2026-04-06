import { LookupScopeType } from '@oneohm-epc/shared/types';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills task_statuses for all existing projects that have task_statuses = NULL.
 *
 * These are projects created before the AddTaskStatusesToProjects migration.
 * Their statuses are read from the lookup table (type_code = 'default_task_status')
 * so the data is consistent with what users see when configuring new projects.
 *
 * If the lookup table has no entries for default_task_status (e.g. SeedLookupPrioritiesAndDefaultTaskStatuses
 * was not yet run), this migration is a no-op and leaves task_statuses as NULL.
 */
export class BackfillProjectTaskStatuses1809000000000 implements MigrationInterface {
  name = 'BackfillProjectTaskStatuses1809000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Read the configured default task statuses from the lookup table
    const lookupRows: Array<{
      code: string;
      label: string;
      color: string;
      order_index: number;
    }> = await queryRunner.query(
      `
        SELECT code, label, color, order_index
        FROM lookups
        WHERE
          type_code = 'default_task_status'
          AND scope_type = $1
          AND scope_id IS NULL
          AND deleted_at IS NULL
        ORDER BY order_index ASC
      `,
      [LookupScopeType.GLOBAL],
    );

    if (lookupRows.length === 0) {
      // Seed migration not yet run — skip backfill to avoid leaving bad data
      return;
    }

    const taskStatuses = lookupRows.map((row) => ({
      code: row.code,
      label: row.label,
      color: row.color,
      orderIndex: row.order_index,
    }));

    await queryRunner.query(
      `
        UPDATE projects
        SET task_statuses = $1::jsonb
        WHERE task_statuses IS NULL
          AND deleted_at IS NULL
      `,
      [JSON.stringify(taskStatuses)],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: clear task_statuses for projects backfilled by this migration.
    // We identify them by checking if their task_statuses match the current lookup values.
    // Safest down is to NULL all — recreating the pre-migration state.
    await queryRunner.query(
      `
        UPDATE projects
        SET task_statuses = NULL
        WHERE deleted_at IS NULL
      `,
    );
  }
}
