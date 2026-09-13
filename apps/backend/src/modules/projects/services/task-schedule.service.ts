import { Injectable } from '@nestjs/common';
import { isFinalTaskStatus, taskStatusBlocksDependents } from '@tejas96/shared/constants';
import { type EntityManager } from 'typeorm';

import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { addDays } from '../utils/task-from-step';

/**
 * When a task's effort starts counting.
 *
 * A step's `effortDays` is how long the work itself takes. For a task that waits
 * on another one, that time cannot begin at the project's start: the work cannot
 * begin until the dependency closes. So a task with an unfinished dependency
 * carries no due date, and on the day its last dependency closes it gets
 * `endDate = that day + effortDays`. A task that never had a dependency keeps
 * the plain `project start + effortDays` it was created with.
 *
 * Two different things change whether a task is held up, and they are not
 * treated the same:
 *
 *  - `onDependenciesEdited` — a person added or removed a dependency, or the
 *    project was just built. The date is recomputed from scratch, so a task that
 *    was free and is now held up loses its date.
 *  - `onDependencyResolved` — a dependency closed, or was deleted. This can only
 *    give a date to a task that has none. It never takes one back, so reopening
 *    a finished dependency leaves every task after it exactly as it was.
 *
 * Three kinds of task are never touched: a task a person gave a due date by hand
 * (`dueDateIsAuto` false), a task that is already done, and a task whose step
 * carries no effort at all.
 */
@Injectable()
export class TaskScheduleService {
  constructor(private readonly taskRepository: ProjectTaskRepository) {}

  /**
   * The dependency list of these tasks changed, or they were just created.
   * Recomputes their due dates, which may clear one.
   */
  async onDependenciesEdited(
    projectId: string,
    taskIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    await this.refresh(projectId, taskIds, true, manager);
  }

  /**
   * These tasks stopped holding others up — they closed, or they were deleted.
   * Gives a due date to anything they were holding that has none. Never clears.
   */
  async onDependencyResolved(
    projectId: string,
    dependencyTaskIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const dependents = await this.taskRepository.findDependentTaskIds(
      projectId,
      dependencyTaskIds,
      manager,
    );
    await this.refresh(projectId, dependents, false, manager);
  }

  private async refresh(
    projectId: string,
    taskIds: string[],
    allowClear: boolean,
    manager?: EntityManager,
  ): Promise<void> {
    if (taskIds.length === 0) return;

    const tasks = await this.taskRepository.findWithStepByIds(projectId, taskIds, manager);
    if (tasks.length === 0) return;

    const dependencyIds = [...new Set(tasks.flatMap((t) => t.dependsOnTaskIds ?? []))];
    const dependencyStatus = await this.taskRepository.findStatusesByIds(
      projectId,
      dependencyIds,
      manager,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of tasks) {
      if (!task.dueDateIsAuto) continue;
      if (isFinalTaskStatus(task.status)) continue;

      const effortDays = task.workflowStep?.effortDays;
      if (effortDays == null) continue;

      // A dependency that is gone from the project no longer holds anything up,
      // which is how the rest of the module reads a missing dependency too.
      const heldUp = (task.dependsOnTaskIds ?? []).some((depId) => {
        const status = dependencyStatus.get(depId);
        return status ? taskStatusBlocksDependents(status) : false;
      });

      if (heldUp) {
        if (allowClear && task.endDate != null) {
          await this.taskRepository.updateById(task.id, { endDate: null }, manager);
        }
        continue;
      }

      if (task.endDate == null) {
        await this.taskRepository.updateById(
          task.id,
          { endDate: addDays(today, effortDays) },
          manager,
        );
      }
    }
  }
}
