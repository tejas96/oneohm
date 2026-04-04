import { BadRequestException, Injectable } from '@nestjs/common';
import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared/types';

import { type ProjectTaskEntity } from '../entities/project-task.entity';
import { type ProjectEntity } from '../entities/project.entity';
import { ProjectTaskRepository } from '../repositories/project-task.repository';

export const FALLBACK_TRANSITIONS: Record<string, string[]> = TASK_STATUS_TRANSITIONS;

@Injectable()
export class WorkflowEngineService {
  constructor(private readonly taskRepository: ProjectTaskRepository) {}

  async validateTransition(
    _task: ProjectTaskEntity,
    _newStatus: TaskStatus,
    _project: ProjectEntity,
  ): Promise<void> {
    return;
  }

  async checkDependencies(task: ProjectTaskEntity, newStatus: TaskStatus): Promise<void> {
    if (newStatus !== TaskStatus.IN_PROGRESS) return;
    if (!task.dependsOnTaskIds?.length) return;

    const { resolved, blockers } = await this.taskRepository.areAllDependenciesResolved(
      task.dependsOnTaskIds,
    );

    if (!resolved) {
      const taskName = task.nameOverride ?? task.workflowStep?.name ?? task.code;
      const blockerNames = blockers.map((b) => `'${b.name}' (${b.status})`).join(', ');
      throw new BadRequestException(`Cannot start '${taskName}': complete ${blockerNames} first`);
    }
  }

  getTransitionsForTask(
    _task: ProjectTaskEntity,
    project: ProjectEntity,
  ): Record<string, string[]> {
    return project.defaultTransitions ?? FALLBACK_TRANSITIONS;
  }
}
