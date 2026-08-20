import { BadRequestException, Injectable } from '@nestjs/common';
import {
  TASK_STATUS_LABELS,
  taskStatusRequiresResolvedDependencies,
} from '@tejas96/shared/constants';

import { type ProjectTaskEntity } from '../entities/project-task.entity';
import { type ProjectEntity } from '../entities/project.entity';
import { ProjectTaskRepository } from '../repositories/project-task.repository';

@Injectable()
export class WorkflowEngineService {
  constructor(private readonly taskRepository: ProjectTaskRepository) {}

  async validateTransition(
    _task: ProjectTaskEntity,
    _newStatus: string,
    _project: ProjectEntity,
  ): Promise<void> {
    return;
  }

  async checkDependencies(task: ProjectTaskEntity, newStatus: string): Promise<void> {
    if (!task.dependsOnTaskIds?.length) return;

    if (!taskStatusRequiresResolvedDependencies(newStatus)) return;

    const { resolved, blockers } = await this.taskRepository.areAllDependenciesResolved(
      task.dependsOnTaskIds,
    );

    if (!resolved) {
      const taskName = task.nameOverride ?? task.workflowStep?.name ?? task.code;
      const blockerNames = blockers.map((b) => `'${b.name}' (${b.status})`).join(', ');
      const targetLabel =
        TASK_STATUS_LABELS[newStatus as keyof typeof TASK_STATUS_LABELS] ?? newStatus;
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
