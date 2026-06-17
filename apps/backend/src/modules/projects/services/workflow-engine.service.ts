import { BadRequestException, Injectable } from '@nestjs/common';
import { LookupTypeCode } from '@tejas96/shared/types';

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

    const statusRows = await this.lookupRepository.findByTypeCodeRaw(
      LookupTypeCode.DEFAULT_TASK_STATUS,
    );

    const targetRow = statusRows.find((r) => r.code === newStatus);
    const targetMeta = targetRow?.metadata ?? {};

    // Determine which statuses require all dependencies to be resolved first.
    // Transition requires resolved dependencies if:
    //   - it is an active status that blocks other tasks (blocksDependents === true) AND is not 'blocked' itself
    //   - it is a completed final status (isFinal === true AND autoCompletePct === 100)
    const requiresResolved =
      (targetMeta.blocksDependents === true && newStatus !== 'blocked') ||
      (targetMeta.isFinal === true && targetMeta.autoCompletePct === 100);

    if (!requiresResolved) return;

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
