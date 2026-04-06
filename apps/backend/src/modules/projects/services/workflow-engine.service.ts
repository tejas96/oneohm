import { BadRequestException, Injectable } from '@nestjs/common';
import { LookupTypeCode } from '@oneohm-epc/shared/types';

import { LookupRepository } from '../../lookups/repositories/lookup.repository';
import { type ProjectTaskEntity } from '../entities/project-task.entity';
import { type ProjectEntity } from '../entities/project.entity';
import { ProjectTaskRepository } from '../repositories/project-task.repository';

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly lookupRepository: LookupRepository,
  ) {}

  async validateTransition(
    _task: ProjectTaskEntity,
    _newStatus: string,
    _project: ProjectEntity,
  ): Promise<void> {
    return;
  }

  async checkDependencies(task: ProjectTaskEntity, newStatus: string): Promise<void> {
    if (!task.dependsOnTaskIds?.length) return;

    // Determine which statuses require all dependencies to be resolved first.
    // This comes entirely from DB metadata: statuses with blocksDependents=true
    // cannot be entered if any dependency is still in an active (non-final) state.
    const statusRows = await this.lookupRepository.findByTypeCodeRaw(
      LookupTypeCode.DEFAULT_TASK_STATUS,
    );

    const targetRow = statusRows.find((r) => r.code === newStatus);
    const targetMeta = targetRow?.metadata ?? {};

    // Only block transitions INTO statuses that themselves mark blocksDependents=true
    if (!targetMeta.blocksDependents) return;

    const { resolved, blockers } = await this.taskRepository.areAllDependenciesResolved(
      task.dependsOnTaskIds,
    );

    if (!resolved) {
      const taskName = task.nameOverride ?? task.workflowStep?.name ?? task.code;
      const blockerNames = blockers.map((b) => `'${b.name}' (${b.status})`).join(', ');
      const targetLabel = targetRow?.label ?? newStatus;
      throw new BadRequestException(
        `Cannot move '${taskName}' to '${targetLabel}': complete ${blockerNames} first`,
      );
    }
  }

  getTransitionsForTask(
    _task: ProjectTaskEntity,
    _project: ProjectEntity,
  ): Record<string, string[]> {
    return {};
  }
}
