import { Injectable, Logger } from '@nestjs/common';
import { COMPANY } from '@tejas96/shared/constants';
import {
  ProjectStatus,
  type SiteTaskFacts,
  type TaskRuleSyncResult,
  TaskStatus,
} from '@tejas96/shared/types';
import { isProjectBaselineStep, stepAppliesToSite } from '@tejas96/shared/utils';
import { type EntityManager, In, IsNull } from 'typeorm';

import { ProjectTaskEntity } from '../entities/project-task.entity';
import { ProjectEntity } from '../entities/project.entity';
import { WorkflowStepEntity } from '../entities/workflow-step.entity';
import { type SiteLoanChangedEvent } from '../events/site-loan-changed.event';
import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { ProjectRepository } from '../repositories/project.repository';
import { buildTaskFromStep } from '../utils/task-from-step';

const LIVE_PROJECT_STATUSES = [ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD];

/** A task nobody has started: still in backlog, with no checklist item ticked. */
function isNotStarted(task: ProjectTaskEntity): boolean {
  if (task.status !== TaskStatus.BACKLOG) return false;
  const checklist = task.checklistOverride ?? task.checklist;
  return !(checklist?.items ?? []).some((item) => item.isCompleted);
}

/**
 * Keeps a live project's loan-only tasks in line with its site's loan flag.
 *
 * Only `loan_only` steps are considered. Each is checked with the old and the
 * new loan value, against the property type from before the save:
 * - it now applies → add its task, unless the project already has a live one,
 *   excludes the step, or a person deleted that task;
 * - it no longer applies → remove its task if nobody started it, else keep it.
 *
 * Runs inside the property save's transaction and throws on failure, so a half
 * sync can never be committed.
 */
@Injectable()
export class LoanTaskSyncService {
  private readonly logger = new Logger(LoanTaskSyncService.name);

  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  /** Null when the site has no live project or nothing changed. */
  async syncForLoanChange(event: SiteLoanChangedEvent): Promise<TaskRuleSyncResult | null> {
    const { manager } = event;

    const project = await manager.getRepository(ProjectEntity).findOne({
      where: {
        propertyId: event.propertyId,
        status: In(LIVE_PROJECT_STATUSES),
        deletedAt: IsNull(),
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!project) return null;

    const steps = (
      await manager.getRepository(WorkflowStepEntity).find({
        where: { loanOnly: true, deletedAt: IsNull() },
        order: { sequenceOrder: 'ASC' },
      })
    ).filter(isProjectBaselineStep);
    if (steps.length === 0) return null;

    const before: SiteTaskFacts = {
      wantsLoan: event.wantsLoanBefore,
      propertyType: event.propertyTypeBefore,
    };
    const after: SiteTaskFacts = {
      wantsLoan: event.wantsLoanAfter,
      propertyType: event.propertyTypeBefore,
    };

    // Locked, so a task someone starts during this save counts as started.
    await manager.query('SELECT id FROM project_tasks WHERE project_id = $1 FOR UPDATE', [
      project.id,
    ]);

    const allTasks = await manager.getRepository(ProjectTaskEntity).find({
      where: { projectId: project.id },
      relations: { workflowStep: true },
      withDeleted: true,
    });
    const liveTasks = allTasks.filter((task) => !task.deletedAt);
    const excluded = new Set(project.excludedStepIds ?? []);

    const toAdd: WorkflowStepEntity[] = [];
    const toRemove: ProjectTaskEntity[] = [];
    let kept = 0;

    for (const step of steps) {
      const appliedBefore = stepAppliesToSite(step, before);
      const appliesAfter = stepAppliesToSite(step, after);
      if (appliedBefore === appliesAfter) continue;

      const stepTasks = liveTasks.filter((task) => task.workflowStepId === step.id);

      if (appliesAfter) {
        const deletedByPerson = allTasks.some(
          (task) => task.workflowStepId === step.id && task.deletedAt && task.removalReason == null,
        );
        if (step.isActive && stepTasks.length === 0 && !excluded.has(step.id) && !deletedByPerson) {
          toAdd.push(step);
        }
      } else {
        for (const task of stepTasks) {
          if (isNotStarted(task)) toRemove.push(task);
          else kept += 1;
        }
      }
    }

    if (toAdd.length === 0 && toRemove.length === 0 && kept === 0) return null;

    if (toRemove.length > 0) {
      await this.removeTasks(
        project.id,
        toRemove.map((task) => task.id),
        manager,
      );
    }
    if (toAdd.length > 0) {
      const remaining = liveTasks.filter((task) => !toRemove.includes(task));
      await this.addTasks(project.id, toAdd, remaining, event.actorUserId, manager);
    }

    const { done, total } = await this.taskRepository.computeProgress(project.id, manager);
    const progress = total > 0 ? Math.round((100 * done) / total) : 0;
    // Completes the project at 100%, exactly as a status change does.
    await this.projectRepository.updateProgressById(project.id, progress, manager);

    this.logger.log(
      `Loan sync on ${project.projectNumber}: ${toAdd.length} added, ${toRemove.length} removed, ${kept} kept`,
    );

    return {
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.name,
      added: toAdd.length,
      removed: toRemove.length,
      kept,
      completed: progress === 100,
    };
  }

  private async removeTasks(
    projectId: string,
    taskIds: string[],
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(ProjectTaskEntity)
      .update({ id: In(taskIds) }, { deletedAt: new Date(), removalReason: 'rule_not_applicable' });

    await this.taskRepository.removeDependencyReferences(projectId, taskIds, manager);
  }

  private async addTasks(
    projectId: string,
    steps: WorkflowStepEntity[],
    existingTasks: ProjectTaskEntity[],
    actorUserId: string | null,
    manager: EntityManager,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step code → live task id, for dependency links.
    const taskIdByCode = new Map<string, string>();
    for (const task of existingTasks) {
      const code = task.workflowStep?.code;
      if (code && !taskIdByCode.has(code)) taskIdByCode.set(code, task.id);
    }

    const created: Array<{ step: WorkflowStepEntity; taskId: string }> = [];
    for (const step of steps) {
      const code = await this.taskRepository.generateTaskCode(COMPANY.code, manager);

      const task = await this.taskRepository.create(
        buildTaskFromStep({ step, projectId, code, baseDate: today, createdBy: actorUserId }),
        manager,
      );
      taskIdByCode.set(step.code, task.id);
      created.push({ step, taskId: task.id });
    }

    for (const { step, taskId } of created) {
      const dependsOnTaskIds = (step.dependsOnTaskCodes ?? [])
        .map((depCode) => taskIdByCode.get(depCode))
        .filter((id): id is string => Boolean(id));
      if (dependsOnTaskIds.length > 0) {
        await this.taskRepository.updateById(taskId, { dependsOnTaskIds }, manager);
      }
    }
  }
}
