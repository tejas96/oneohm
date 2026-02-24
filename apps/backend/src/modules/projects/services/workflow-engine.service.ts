import { BadRequestException, Injectable } from '@nestjs/common';
import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared-types';

import { type ProjectTaskEntity } from '../entities/project-task.entity';
import { type ProjectEntity } from '../entities/project.entity';
import { ProjectTaskRepository } from '../repositories/project-task.repository';

export const FALLBACK_TRANSITIONS: Record<string, string[]> = TASK_STATUS_TRANSITIONS;

@Injectable()
export class WorkflowEngineService {
  constructor(private readonly taskRepository: ProjectTaskRepository) {}

  async validateTransition(
    task: ProjectTaskEntity,
    newStatus: TaskStatus,
    project: ProjectEntity,
  ): Promise<void> {
    if (task.status === newStatus) return;

    const transitions = this.getTransitionsForTask(task, project);
    const allowed = transitions[task.status];

    if (!allowed?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot move task from '${task.status}' to '${newStatus}'. ` +
          `Allowed transitions: ${allowed?.join(', ') || 'none'}`,
      );
    }
  }

  async checkDependencies(
    task: ProjectTaskEntity,
    newStatus: TaskStatus,
  ): Promise<void> {
    if (newStatus !== TaskStatus.IN_PROGRESS) return;
    if (!task.dependsOnTaskIds?.length) return;

    const { resolved, blockers } =
      await this.taskRepository.areAllDependenciesResolved(task.dependsOnTaskIds);

    if (!resolved) {
      const taskName = task.nameOverride ?? task.workflowStep?.name ?? task.code;
      const blockerNames = blockers
        .map((b) => `'${b.name}' (${b.status})`)
        .join(', ');
      throw new BadRequestException(
        `Cannot start '${taskName}': complete ${blockerNames} first`,
      );
    }
  }

  getTransitionsForTask(
    task: ProjectTaskEntity,
    project: ProjectEntity,
  ): Record<string, string[]> {
    return (
      task.workflowStep?.allowedTransitions ??
      project.defaultTransitions ??
      FALLBACK_TRANSITIONS
    );
  }
}
