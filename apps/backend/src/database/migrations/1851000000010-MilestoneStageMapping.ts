import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { CREATE_V_MILESTONE_COMPLETION } from './sql/ledger/08-task-completion.sql';
import {
  ADD_MILESTONE_STAGE_MAPPING,
  DROP_MILESTONE_STAGE_MAPPING,
} from './sql/ledger/11-milestone-stage-mapping.sql';

/**
 * MilestoneStageMapping — make task completion actually reach payment milestones.
 *
 * The previous view joined tasks to milestones on free-text name equality
 * between two vocabularies that barely overlap: it matched 80 tasks for
 * Commissioning, 10 for Installation Complete and ZERO for Advance across the
 * entire database. Every event-driven due date and the stalled-payment alert
 * were therefore dead for the milestones holding most of the contract value.
 *
 * Replaces the join with a canonical work-stage key on both sides, reusing the
 * previously unused `due_basis_stage` column as a per-milestone override.
 */
export class MilestoneStageMapping1851000000010 implements MigrationInterface {
  name = 'MilestoneStageMapping1851000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ADD_MILESTONE_STAGE_MAPPING) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of DROP_MILESTONE_STAGE_MAPPING) {
      await queryRunner.query(statement);
    }
    // Restore the name-equality view so the schema stays self-consistent.
    await queryRunner.query(CREATE_V_MILESTONE_COMPLETION);
  }
}
