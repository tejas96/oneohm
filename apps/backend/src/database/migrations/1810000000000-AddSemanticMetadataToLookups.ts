import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds semantic metadata to existing lookup rows so application logic can be
 * driven entirely from the database instead of hardcoded enum checks.
 *
 * Status metadata flags:
 *   - variant         : badge/chip color token used by the frontend
 *   - isFinal         : when true, auto-sets endDate on the task
 *   - autoCompletePct : sets completionPercentage to this value on transition
 *   - autoSetStartDate: when true, auto-sets startDate if not already set
 *   - urgencyPenalty  : subtracted from urgency score (e.g. BLOCKED lowers priority)
 *   - blocksDependents: when true, tasks that depend on tasks with this status are
 *                       considered "blocked" (dependency check gate)
 *
 * Priority metadata flags:
 *   - variant        : badge/chip color token used by the frontend
 *   - urgencyWeight  : added to urgency score for sorting "My Tasks"
 */
type MetadataSeed = {
  typeCode: 'priority' | 'default_task_status';
  code: string;
  metadata: Record<string, unknown>;
};

const METADATA_SEEDS: MetadataSeed[] = [
  // ─── Task statuses ────────────────────────────────────────────────────────
  {
    typeCode: 'default_task_status',
    code: 'backlog',
    metadata: { variant: 'secondary' },
  },
  {
    typeCode: 'default_task_status',
    code: 'todo',
    metadata: { variant: 'secondary' },
  },
  {
    typeCode: 'default_task_status',
    code: 'in_progress',
    metadata: {
      variant: 'info',
      autoSetStartDate: true,
      blocksDependents: true,
    },
  },
  {
    typeCode: 'default_task_status',
    code: 'in_review',
    metadata: { variant: 'warning', blocksDependents: true },
  },
  {
    typeCode: 'default_task_status',
    code: 'testing',
    metadata: { variant: 'info', blocksDependents: true },
  },
  {
    typeCode: 'default_task_status',
    code: 'blocked',
    metadata: { variant: 'error', urgencyPenalty: 20, blocksDependents: true },
  },
  {
    typeCode: 'default_task_status',
    code: 'done',
    metadata: {
      variant: 'success',
      isFinal: true,
      autoCompletePct: 100,
      autoSetEndDate: true,
      blocksDependents: false,
    },
  },
  {
    typeCode: 'default_task_status',
    code: 'cancelled',
    metadata: {
      variant: 'error',
      isFinal: true,
      autoSetEndDate: true,
      blocksDependents: false,
    },
  },

  // ─── Priorities ───────────────────────────────────────────────────────────
  {
    typeCode: 'priority',
    code: 'urgent',
    metadata: { variant: 'error', urgencyWeight: 40 },
  },
  {
    typeCode: 'priority',
    code: 'high',
    metadata: { variant: 'warning', urgencyWeight: 30 },
  },
  {
    typeCode: 'priority',
    code: 'normal',
    metadata: { variant: 'info', urgencyWeight: 20 },
  },
  {
    typeCode: 'priority',
    code: 'medium',
    metadata: { variant: 'info', urgencyWeight: 15 },
  },
  {
    typeCode: 'priority',
    code: 'low',
    metadata: { variant: 'secondary', urgencyWeight: 5 },
  },
];

export class AddSemanticMetadataToLookups1810000000000 implements MigrationInterface {
  name = 'AddSemanticMetadataToLookups1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const seed of METADATA_SEEDS) {
      await queryRunner.query(
        `
        UPDATE lookups
        SET
          metadata = $3::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE
          type_code = $1
          AND code = $2
          AND scope_type = $4
          AND scope_id IS NULL
          AND deleted_at IS NULL
        `,
        [seed.typeCode, seed.code, JSON.stringify(seed.metadata), 'global'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const seed of METADATA_SEEDS) {
      await queryRunner.query(
        `
        UPDATE lookups
        SET
          metadata = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE
          type_code = $1
          AND code = $2
          AND scope_type = $3
          AND scope_id IS NULL
          AND deleted_at IS NULL
        `,
        [seed.typeCode, seed.code, 'global'],
      );
    }
  }
}
