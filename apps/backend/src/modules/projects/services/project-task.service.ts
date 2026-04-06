import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type ChecklistProgress,
  LookupTypeCode,
  type PaginatedResponse,
  type StatisticsResponse,
  type TaskActivityEntry,
  type TaskActivityType,
  TaskStatus,
  type TaskStatusConfig,
} from '@oneohm-epc/shared/types';
import { DataSource, type EntityManager, IsNull } from 'typeorm';

import { LookupRepository } from '../../lookups/repositories/lookup.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import {
  type CreateProjectTaskDto,
  type UpdateProjectTaskDto,
  type UpdateTaskCrossProjectDto,
} from '../dto';
import { ProjectTaskEntity } from '../entities';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowStepEntity } from '../entities/workflow-step.entity';
import { MilestoneRepository } from '../repositories/milestone.repository';
import { ProjectTaskRepository } from '../repositories/project-task.repository';
import { ProjectTeamRepository } from '../repositories/project-team.repository';
import { ProjectRepository } from '../repositories/project.repository';

const SERVICE_CONSTANTS = {
  DEFAULT_ACTIVITY_LOG_LIMIT: 100,
} as const;

interface TaskGroup {
  key: string;
  label: string;
  count: number;
  variant: string;
  tasks: unknown[];
}

type EnrichedMyTask = Record<string, unknown> & {
  urgencyScore?: number;
  isOverdue?: boolean;
  daysSinceLastUpdate?: number;
  checklistProgress?: ChecklistProgress;
  dependencyNames?: string[];
  dependencyCodes?: string[];
  hasDependencyBlockers?: boolean;
  assigneeName?: string;
  projectNumber: string;
  projectName: string;
  milestoneName?: string;
};

@Injectable()
export class ProjectTaskService {
  private readonly logger = new Logger(ProjectTaskService.name);

  constructor(
    private readonly taskRepository: ProjectTaskRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly lookupRepository: LookupRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateProjectTaskDto, currentUserId: string): Promise<ProjectTaskEntity> {
    if (!createDto.projectId) {
      throw new BadRequestException('Project ID is required');
    }
    const projectId = createDto.projectId;

    // For ad-hoc tasks (no workflowStepId), name is required
    const workflowStepId = (createDto as Record<string, unknown>).workflowStepId as
      | string
      | undefined;
    if (!workflowStepId && !createDto.name) {
      throw new BadRequestException(
        'Name is required for ad-hoc tasks (tasks without a workflow step)',
      );
    }

    if (createDto.code) {
      const codeExists = await this.taskRepository.existsByCode(createDto.code, projectId);
      if (codeExists) {
        throw new BadRequestException(
          `Task with code ${createDto.code} already exists in this project`,
        );
      }
    }

    // Pre-validate dependency existence before transaction
    if (createDto.dependsOnTaskIds && createDto.dependsOnTaskIds.length > 0) {
      await this.validateDependencies(createDto.dependsOnTaskIds, projectId);
    }

    // Route name/description to override columns (resolveTaskFields reads from overrides)
    const taskData: Record<string, unknown> = {
      ...createDto,
      projectId,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    };
    // Strip deps from initial create data; we set them after circular check
    const pendingDeps = createDto.dependsOnTaskIds;
    delete taskData.dependsOnTaskIds;

    if (createDto.name) {
      taskData.nameOverride = createDto.name;
      delete taskData.name;
    }
    if (createDto.description) {
      taskData.descriptionOverride = createDto.description;
      delete taskData.description;
    }

    if (workflowStepId) {
      taskData.workflowStepId = workflowStepId;
    }

    const saved = await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const created = await this.taskRepository.create(
        taskData as Partial<ProjectTaskEntity>,
        manager,
      );
      if (pendingDeps && pendingDeps.length > 0) {
        await this.detectCircularDependencies(created.id, pendingDeps, projectId, manager);
        await this.taskRepository.updateById(
          created.id,
          { dependsOnTaskIds: pendingDeps },
          manager,
        );
      }
      return created;
    });

    await this.updateAllProgress(projectId);

    return this.taskRepository.findById(saved.id, projectId) as Promise<ProjectTaskEntity>;
  }

  async findAll(
    projectId: string,
    page: number,
    limit: number,
    filters: {
      milestoneId?: string;
      assignedToUserId?: string;
      status?: TaskStatus;
      priority?: string;
      search?: string;
    } = {},
  ): Promise<PaginatedResponse<ProjectTaskEntity>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const { data, total } = await this.taskRepository.findAll(
      projectId,
      safePage,
      safeLimit,
      filters,
    );

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findById(id: string, projectId: string): Promise<ProjectTaskEntity> {
    const task = await this.taskRepository.findById(id, projectId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async findByMilestone(projectId: string, milestoneId: string): Promise<ProjectTaskEntity[]> {
    return this.taskRepository.findByMilestone(projectId, milestoneId);
  }

  async findByAssignee(projectId: string, assignedToUserId: string): Promise<ProjectTaskEntity[]> {
    return this.taskRepository.findByAssignee(projectId, assignedToUserId);
  }

  async update(
    id: string,
    projectId: string,
    updateDto: UpdateProjectTaskDto,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    const existingTask = await this.findById(id, projectId);

    // Optimistic locking: if version provided, check it
    const expectedVersion = (updateDto as Record<string, unknown>).version as number | undefined;
    if (expectedVersion !== undefined && expectedVersion !== existingTask.version) {
      throw new ConflictException(
        'Task was modified by another user. Please refresh and try again.',
      );
    }

    if (updateDto.code) {
      const codeExists = await this.taskRepository.existsByCode(updateDto.code, projectId, id);
      if (codeExists) {
        throw new BadRequestException(
          `Task with code ${updateDto.code} already exists in this project`,
        );
      }
    }

    if (updateDto.dependsOnTaskIds !== undefined) {
      await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        await manager.findOne(ProjectTaskEntity, {
          where: { id, projectId, deletedAt: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (updateDto.dependsOnTaskIds!.length > 0) {
          for (const depId of updateDto.dependsOnTaskIds!) {
            const dep = await manager.findOne(ProjectTaskEntity, {
              where: { id: depId, projectId, deletedAt: IsNull() },
            });
            if (!dep) {
              throw new BadRequestException(
                `Dependency task ${depId} not found in this project. Cross-project dependencies are not supported.`,
              );
            }
          }
          await this.detectCircularDependencies(
            id,
            updateDto.dependsOnTaskIds!,
            projectId,
            manager,
          );
        }
        await this.taskRepository.updateById(
          id,
          { dependsOnTaskIds: updateDto.dependsOnTaskIds },
          manager,
        );
      });
    }

    // Route fields to override columns (resolveTaskFields reads from overrides)
    const updateData: Record<string, unknown> = { ...updateDto };
    delete updateData.dependsOnTaskIds;
    if (updateDto.name !== undefined) {
      updateData.nameOverride = updateDto.name;
      delete updateData.name;
    }
    if (updateDto.description !== undefined) {
      updateData.descriptionOverride = updateDto.description;
      delete updateData.description;
    }
    if ((updateDto as Record<string, unknown>).checklist !== undefined) {
      updateData.checklistOverride = (updateDto as Record<string, unknown>).checklist;
      delete updateData.checklist;
    }
    if ((updateDto as Record<string, unknown>).labels !== undefined) {
      updateData.labelsOverride = (updateDto as Record<string, unknown>).labels;
      delete updateData.labels;
    }

    // Always increment version on update for conflict detection
    updateData.version = () => 'version + 1';

    const activityEntries: TaskActivityEntry[] = this.buildActivityEntries(
      existingTask,
      updateDto,
      currentUserId,
    );

    const updated = await this.taskRepository.updateWithActivityLogs(
      id,
      projectId,
      {
        ...updateData,
        updatedBy: currentUserId,
      },
      activityEntries,
    );

    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Trigger progress update if milestone changed
    const oldMilestoneId = existingTask.milestoneId;
    const newMilestoneId = updateDto.milestoneId;
    if (newMilestoneId !== undefined && newMilestoneId !== oldMilestoneId) {
      await this.updateAllProgress(projectId);
    }

    return updated;
  }

  async updateStatus(
    id: string,
    projectId: string,
    newStatus: TaskStatus,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    const existingTask = await this.findById(id, projectId);

    await this.validateAndApplyStatusChange(existingTask, newStatus, projectId);

    const statusMap = await this.getLookupMap(LookupTypeCode.DEFAULT_TASK_STATUS);
    const meta = statusMap.get(newStatus)?.metadata ?? {};

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedBy: currentUserId,
    };
    updateData.version = () => 'version + 1';

    if (meta.autoSetStartDate && !existingTask.startDate) {
      updateData.startDate = new Date();
    }
    if (meta.isFinal) {
      if (!existingTask.endDate) updateData.endDate = new Date();
      if (meta.autoCompletePct !== undefined)
        updateData.completionPercentage = meta.autoCompletePct;
    }

    const activityEntries: TaskActivityEntry[] = [];
    if (newStatus !== existingTask.status) {
      activityEntries.push({
        id: randomUUID(),
        activityType: 'status_changed',
        userId: currentUserId,
        fieldName: 'status',
        oldValue: existingTask.status,
        newValue: newStatus,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await this.taskRepository.updateWithActivityLogs(
      id,
      projectId,
      updateData,
      activityEntries,
    );

    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.updateAllProgress(projectId);
    return updated;
  }

  async assignTask(
    id: string,
    projectId: string,
    assignedToUserId: string | null,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    if (assignedToUserId !== null) {
      const isMember = await this.teamRepository.isTeamMember(assignedToUserId, projectId);
      if (!isMember) {
        throw new BadRequestException(
          'Cannot assign task: user is not a team member of this project',
        );
      }

      // Ensure assigned user is active
      const assignee = await this.dataSource
        .createQueryBuilder()
        .select('u.status', 'status')
        .from('users', 'u')
        .where('u.id = :userId AND u.deleted_at IS NULL', { userId: assignedToUserId })
        .getRawOne<{ status: string }>();

      if (assignee?.status !== 'active') {
        throw new BadRequestException('Cannot assign task: user is inactive or has been deleted');
      }
    }

    const existingTask = await this.findById(id, projectId);
    const updateData: Record<string, unknown> = {
      assignedToUserId: assignedToUserId === null ? null : assignedToUserId,
    };
    updateData.version = () => 'version + 1';

    const activityEntries: TaskActivityEntry[] = [];
    if (assignedToUserId !== existingTask.assignedToUserId) {
      activityEntries.push({
        id: randomUUID(),
        activityType: 'assigned',
        userId: currentUserId,
        fieldName: 'assignedToUserId',
        oldValue: existingTask.assignedToUserId ?? undefined,
        newValue: assignedToUserId ?? undefined,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await this.taskRepository.updateWithActivityLogs(
      id,
      projectId,
      { ...updateData, updatedBy: currentUserId },
      activityEntries,
    );

    if (!updated) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return updated;
  }

  async updateProgress(
    id: string,
    projectId: string,
    completionPercentage: number,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    if (completionPercentage < 0 || completionPercentage > 100) {
      throw new BadRequestException('Completion percentage must be between 0 and 100');
    }

    // If setting to 100%, auto-transition to whichever status has autoCompletePct === 100
    if (completionPercentage === 100) {
      const task = await this.findById(id, projectId);
      const statusMap = await this.getLookupMap(LookupTypeCode.DEFAULT_TASK_STATUS);
      const finalStatus = [...statusMap.entries()].find(
        ([, e]) => e.metadata.autoCompletePct === 100,
      )?.[0];
      if (finalStatus && (task.status as string) !== finalStatus) {
        await this.updateStatus(id, projectId, finalStatus as TaskStatus, currentUserId);
        return this.findById(id, projectId);
      }
    }

    return this.update(id, projectId, { completionPercentage }, currentUserId);
  }

  async getTaskActivityLog(
    taskId: string,
    projectId: string,
    limit: number = SERVICE_CONSTANTS.DEFAULT_ACTIVITY_LOG_LIMIT,
  ): Promise<TaskActivityEntry[]> {
    const task = await this.findById(taskId, projectId);
    return (task.activityLog || []).slice(0, limit);
  }

  async remove(id: string, projectId: string): Promise<void> {
    await this.findById(id, projectId);

    await this.dataSource.transaction(async (manager) => {
      await manager.softDelete(ProjectTaskEntity, { id, projectId });
      await manager.query(
        `UPDATE project_tasks
         SET depends_on_task_ids = array_remove(depends_on_task_ids, $1::uuid)
         WHERE project_id = $2
           AND deleted_at IS NULL
           AND $1::uuid = ANY(depends_on_task_ids)`,
        [id, projectId],
      );
      const { done, total } = await this.taskRepository.computeProgress(projectId, manager);
      const progress = total > 0 ? Math.round((100 * done) / total) : 0;
      await this.projectRepository.updateProgressById(projectId, progress, manager);
      await this.milestoneRepository.updateProgressForProject(projectId, manager);
    });
  }

  async getStatistics(projectId: string): Promise<StatisticsResponse<TaskStatus>> {
    const byStatus = await this.taskRepository.countByStatus(projectId);
    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byStatus,
    };
  }

  async getOverdueTasks(projectId: string): Promise<ProjectTaskEntity[]> {
    return this.taskRepository.findOverdue(projectId);
  }

  async generateTaskCode(_projectId: string, organizationId?: string): Promise<string> {
    if (organizationId) {
      try {
        const org = await this.organizationRepository.findOneById(organizationId);
        if (org) {
          return this.taskRepository.generateTaskCode(org.code);
        }
      } catch (err) {
        this.logger.warn(`Failed to generate global task code, falling back: ${String(err)}`);
      }
    }
    return this.taskRepository.getNextTaskCode(_projectId);
  }

  async getKanbanColumn(
    projectId: string,
    status: TaskStatus,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ProjectTaskEntity>> {
    const { data, total } = await this.taskRepository.findForKanban(projectId, status, page, limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moveTask(
    id: string,
    projectId: string,
    newStatus: TaskStatus,
    newKanbanOrder: number,
    expectedVersion: number,
    currentUserId: string,
  ): Promise<ProjectTaskEntity> {
    // Load outside the transaction — lookup data is immutable during the request lifecycle
    const statusMap = await this.getLookupMap(LookupTypeCode.DEFAULT_TASK_STATUS);

    const result = await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const existingTask = await manager.findOne(ProjectTaskEntity, {
        where: { id, projectId, deletedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existingTask) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
      if (existingTask.workflowStepId) {
        existingTask.workflowStep =
          (await manager.findOne(WorkflowStepEntity, {
            where: { id: existingTask.workflowStepId },
          })) ?? undefined;
      }
      if (existingTask.version !== expectedVersion) {
        throw new ConflictException(
          'Task was modified by another user. Please refresh and try again.',
        );
      }

      await this.validateAndApplyStatusChange(existingTask, newStatus, projectId);

      const activityEntry: TaskActivityEntry | undefined =
        newStatus !== existingTask.status
          ? {
              id: randomUUID(),
              activityType: 'status_changed',
              userId: currentUserId,
              fieldName: 'status',
              oldValue: existingTask.status,
              newValue: newStatus,
              createdAt: new Date().toISOString(),
            }
          : undefined;

      const statusMeta = statusMap.get(newStatus)?.metadata ?? {};

      const setClause: Record<string, unknown> = {
        status: newStatus,
        kanbanOrder: newKanbanOrder,
        version: () => 'version + 1',
      };
      if (statusMeta.autoSetStartDate && !existingTask.startDate) {
        setClause.startDate = new Date();
      }
      if (statusMeta.isFinal) {
        if (!existingTask.endDate) setClause.endDate = new Date();
        if (statusMeta.autoCompletePct !== undefined)
          setClause.completionPercentage = statusMeta.autoCompletePct;
      }

      const updateResult = await manager
        .createQueryBuilder()
        .update(ProjectTaskEntity)
        .set(setClause)
        .where('id = :id AND project_id = :projectId AND deleted_at IS NULL', { id, projectId })
        .execute();

      if (updateResult.affected === 0) {
        throw new ConflictException('Task update failed');
      }

      if (activityEntry) {
        await manager.query(
          `UPDATE project_tasks
           SET activity_log = (
             SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
             FROM (
               SELECT elem FROM jsonb_array_elements(
                 jsonb_insert(COALESCE(activity_log, '[]'::jsonb), '{0}', $1::jsonb)
               ) WITH ORDINALITY AS t(elem, ord)
               ORDER BY ord LIMIT $2
             ) AS limited
           )
           WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL`,
          [JSON.stringify(activityEntry), 100, id, projectId],
        );
      }

      const updated = await manager.findOne(ProjectTaskEntity, {
        where: { id, projectId, deletedAt: IsNull() },
        relations: ['assignee', 'milestone', 'workflowStep'],
      });

      return { updated, statusChanged: newStatus !== existingTask.status };
    });

    if (!result.updated) {
      throw new NotFoundException(`Task with ID ${id} not found after move`);
    }

    if (result.statusChanged) {
      await this.updateAllProgress(projectId);
    }

    return result.updated;
  }

  async getBoardData(projectId: string): Promise<{
    columns: Array<{
      status: TaskStatus;
      label: string;
      color: string;
      tasks: Record<string, unknown>[];
      total: number;
    }>;
    filters: {
      team: Array<{ userId: string; name: string }>;
      milestones: Array<{ id: string; name: string }>;
      labels: string[];
    };
  }> {
    const [allTasks, teamMembers, project, statusMap] = await Promise.all([
      this.taskRepository.findAllForBoard(projectId),
      this.teamRepository.findByProject(projectId),
      this.projectRepository.findOneById(projectId),
      this.getLookupMap(LookupTypeCode.DEFAULT_TASK_STATUS),
    ]);

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!project.taskStatuses?.length) {
      throw new NotFoundException(
        `Project ${projectId} has no task statuses configured. Please configure statuses via the project settings.`,
      );
    }

    const configuredStatuses: TaskStatusConfig[] = project.taskStatuses
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const depNameMap = new Map<string, string>();
    const depCodeMap = new Map<string, string>();
    const depStatusMap = new Map<string, TaskStatus>();
    for (const task of allTasks) {
      depNameMap.set(task.id, task.nameOverride ?? task.workflowStep?.name ?? task.code);
      depCodeMap.set(task.id, task.code);
      depStatusMap.set(task.id, task.status);
    }

    const configuredCodes = new Set(configuredStatuses.map((s) => s.code));

    const mapTask = (t: (typeof allTasks)[number]): Record<string, unknown> => {
      const assignee = t.assignee;
      const checklistProgress = (() => {
        const cl = t.checklistOverride ?? t.workflowStep?.checklistTemplate;
        if (!cl?.items?.length) return undefined;
        return { done: cl.items.filter((i) => i.isCompleted).length, total: cl.items.length };
      })();

      return {
        id: t.id,
        code: t.code,
        name: t.name ?? t.nameOverride ?? '',
        status: t.status,
        priority: t.priority,
        assigneeName: assignee
          ? [assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || undefined
          : undefined,
        assigneeId: t.assignedToUserId,
        endDate: t.endDate,
        labels: t.labels,
        kanbanOrder: t.kanbanOrder,
        checklistProgress,
        hasDependencyBlockers: (t.dependsOnTaskIds ?? []).some((depId: string) => {
          const s = depStatusMap.get(depId);
          if (!s) return false;
          // A dependency blocks progress if its status is NOT explicitly marked as non-blocking (blocksDependents !== false)
          return statusMap.get(s)?.metadata.blocksDependents !== false;
        }),
        dependencyNames: (t.dependsOnTaskIds ?? [])
          .map((depId: string) => depNameMap.get(depId))
          .filter(Boolean) as string[],
        dependencyCodes: (t.dependsOnTaskIds ?? [])
          .map((depId: string) => depCodeMap.get(depId))
          .filter(Boolean) as string[],
        version: t.version,
        milestoneName: t.milestone?.name,
        completionPercentage: t.completionPercentage,
        blockedReason: t.blockedReason,
      };
    };

    const columns = configuredStatuses.map(({ code, label, color }) => ({
      status: code,
      label,
      color,
      total: 0,
      tasks: [] as Record<string, unknown>[],
    }));

    for (const task of allTasks) {
      if (configuredCodes.has(task.status)) {
        const col = columns.find((c) => c.status === task.status);
        if (col) {
          col.tasks.push(mapTask(task));
          col.total++;
        }
      } else {
        // Unmapped tasks (e.g. todo, in_review, testing, cancelled) fold into first column
        const firstCol = columns[0];
        if (firstCol) {
          firstCol.tasks.push(mapTask(task));
          firstCol.total++;
        }
      }
    }

    const milestonesSet = new Map<string, string>();
    const labelsSet = new Set<string>();
    for (const t of allTasks) {
      if (t.milestoneId && t.milestone?.name) {
        milestonesSet.set(t.milestoneId, t.milestone.name);
      }
      for (const l of t.labels ?? []) {
        labelsSet.add(l);
      }
    }

    return {
      columns,
      filters: {
        team: teamMembers.map((m) => ({
          userId: m.userId,
          name: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') || m.userId,
        })),
        milestones: Array.from(milestonesSet.entries()).map(([id, name]) => ({ id, name })),
        labels: Array.from(labelsSet),
      },
    };
  }

  async getMyTasks(
    userId: string,
    organizationId: string,
    page: number,
    limit: number,
    filters: {
      status?: TaskStatus;
      priority?: string;
    } = {},
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const teamProjectIds = await this.getUserTeamProjectIds(userId);
    const { data, total } = await this.taskRepository.findByUserId(
      userId,
      organizationId,
      page,
      limit,
      filters,
      teamProjectIds,
    );

    const flatData = data.map((task) => ({
      ...task,
      projectNumber: task.project?.projectNumber ?? '',
      projectName: task.project?.name ?? '',
      milestoneName: task.milestone?.name,
    }));

    return {
      data: flatData as unknown as Record<string, unknown>[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyTasksSummary(
    userId: string,
    organizationId: string,
  ): Promise<{ total: number; overdue: number; dueToday: number; completedThisWeek: number }> {
    const teamProjectIds = await this.getUserTeamProjectIds(userId);
    const [summaryCounts, completedThisWeek] = await Promise.all([
      this.taskRepository.countSummaryForUser(userId, organizationId, teamProjectIds),
      this.taskRepository.countCompletedThisWeek(userId, organizationId, undefined, teamProjectIds),
    ]);
    return { ...summaryCounts, completedThisWeek };
  }

  async getMyTasksGrouped(
    userId: string,
    organizationId: string,
    groupBy: 'dueDate' | 'priority' | 'project' | 'status',
    filters: {
      status?: TaskStatus;
      priority?: string;
      projectId?: string;
      search?: string;
      dueDateFilter?: string;
    } = {},
  ): Promise<{
    groups: TaskGroup[];
    summary: {
      total: number;
      overdue: number;
      dueToday: number;
      completedThisWeek: number;
      projects: Array<{ id: string; name: string; projectNumber: string }>;
    };
  }> {
    const teamProjectIds = await this.getUserTeamProjectIds(userId);

    const [tasks, summaryCounts, completedThisWeek, projects, statusMap, priorityMap] =
      await Promise.all([
        this.taskRepository.findAllByUserId(userId, organizationId, filters, teamProjectIds),
        this.taskRepository.countSummaryForUser(userId, organizationId, teamProjectIds),
        this.taskRepository.countCompletedThisWeek(
          userId,
          organizationId,
          undefined,
          teamProjectIds,
        ),
        this.taskRepository.findUserTaskProjects(userId, organizationId, teamProjectIds),
        this.getLookupMap(LookupTypeCode.DEFAULT_TASK_STATUS),
        this.getLookupMap(LookupTypeCode.PRIORITY),
      ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const depNameMap = new Map<string, string>();
    const depCodeMap = new Map<string, string>();
    const depStatusMap = new Map<string, TaskStatus>();

    const projectIdsWithDeps = new Set<string>();
    for (const task of tasks) {
      depNameMap.set(task.id, task.nameOverride ?? task.workflowStep?.name ?? task.code);
      depCodeMap.set(task.id, task.code);
      depStatusMap.set(task.id, task.status);
      if (task.dependsOnTaskIds?.length) {
        projectIdsWithDeps.add(task.projectId);
      }
    }

    if (projectIdsWithDeps.size > 0) {
      const projectTaskLoads = Array.from(projectIdsWithDeps).map((pid) =>
        this.taskRepository.findByProjectRaw(pid, { relations: ['workflowStep'] }),
      );
      const allProjectTasks = (await Promise.all(projectTaskLoads)).flat();
      for (const pt of allProjectTasks) {
        if (!depNameMap.has(pt.id)) {
          depNameMap.set(pt.id, pt.nameOverride ?? pt.workflowStep?.name ?? pt.code);
        }
        if (!depCodeMap.has(pt.id)) {
          depCodeMap.set(pt.id, pt.code);
        }
        if (!depStatusMap.has(pt.id)) {
          depStatusMap.set(pt.id, pt.status);
        }
      }
    }

    const enrichedTasks = tasks.map((task) =>
      this.enrichMyTask(task, today, depNameMap, depStatusMap, depCodeMap, statusMap, priorityMap),
    );

    const summary = {
      ...summaryCounts,
      completedThisWeek,
      projects,
    };

    const groups = await this.buildGroups(enrichedTasks, groupBy, today, statusMap, priorityMap);

    // Sort tasks within each group by urgencyScore DESC
    for (const group of groups) {
      (group.tasks as EnrichedMyTask[]).sort(
        (a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0),
      );
    }

    return { groups, summary };
  }

  async updateTaskStatusCrossProject(
    taskId: string,
    status: TaskStatus,
    currentUserId: string,
    organizationId: string,
    userRoles: string[] = [],
  ): Promise<ProjectTaskEntity> {
    const isAdmin = this.isAdminRole(userRoles);
    const teamProjectIds = await this.getUserTeamProjectIds(currentUserId);
    const task = await this.taskRepository.findByIdForAssignee(
      taskId,
      currentUserId,
      organizationId,
      teamProjectIds,
      isAdmin,
    );
    if (!task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    await this.updateStatus(taskId, task.projectId, status, currentUserId);

    const updated = await this.taskRepository.findByIdForAssignee(
      taskId,
      currentUserId,
      organizationId,
      teamProjectIds,
      isAdmin,
    );
    return updated!;
  }

  async getTaskDetailCrossProject(
    taskId: string,
    currentUserId: string,
    organizationId: string,
    userRoles: string[] = [],
  ): Promise<Record<string, unknown>> {
    const isAdmin = this.isAdminRole(userRoles);
    const teamProjectIds = await this.getUserTeamProjectIds(currentUserId);
    const task = await this.taskRepository.findByIdCrossProject(
      taskId,
      currentUserId,
      organizationId,
      teamProjectIds,
      isAdmin,
    );
    if (!task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    const depNameMap = new Map<string, string>();
    const depCodeMap = new Map<string, string>();
    const depStatusMap = new Map<string, TaskStatus>();
    if (task.dependsOnTaskIds?.length) {
      const depTasks = await this.taskRepository.findByProjectRaw(task.projectId, {
        relations: ['workflowStep'],
      });
      for (const dt of depTasks) {
        const name = dt.nameOverride ?? dt.workflowStep?.name ?? dt.code;
        depNameMap.set(dt.id, name);
        depCodeMap.set(dt.id, dt.code);
        depStatusMap.set(dt.id, dt.status);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [statusMap, priorityMap] = await Promise.all([
      this.getLookupMap(LookupTypeCode.DEFAULT_TASK_STATUS),
      this.getLookupMap(LookupTypeCode.PRIORITY),
    ]);

    return this.enrichMyTask(
      task,
      today,
      depNameMap,
      depStatusMap,
      depCodeMap,
      statusMap,
      priorityMap,
    );
  }

  async updateTaskCrossProject(
    taskId: string,
    dto: UpdateTaskCrossProjectDto,
    currentUserId: string,
    organizationId: string,
    userRoles: string[] = [],
  ): Promise<Record<string, unknown>> {
    const isAdmin = this.isAdminRole(userRoles);
    const teamProjectIds = await this.getUserTeamProjectIds(currentUserId);
    const task = await this.taskRepository.findByIdCrossProject(
      taskId,
      currentUserId,
      organizationId,
      teamProjectIds,
      isAdmin,
    );
    if (!task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    // Load lookup maps once — used for status side-effects and enrichment below
    const [statusMap, priorityMap] = await Promise.all([
      this.getLookupMap(LookupTypeCode.DEFAULT_TASK_STATUS),
      this.getLookupMap(LookupTypeCode.PRIORITY),
    ]);

    // Handle status change through FSM validation
    if (dto.status && dto.status !== task.status) {
      await this.validateAndApplyStatusChange(task, dto.status, task.projectId);
    }

    // Handle assignment change with team membership validation
    if (dto.assignedToUserId !== undefined && dto.assignedToUserId !== task.assignedToUserId) {
      if (dto.assignedToUserId !== null) {
        const isMember = await this.teamRepository.isTeamMember(
          dto.assignedToUserId,
          task.projectId,
        );
        if (!isMember) {
          throw new BadRequestException(
            'Cannot assign task: user is not a team member of this project',
          );
        }
      }
    }

    // Optimistic locking
    if (dto.version !== undefined && dto.version !== task.version) {
      throw new ConflictException(
        'Task was modified by another user. Please refresh and try again.',
      );
    }

    const updateData: Record<string, unknown> = {};
    const activityEntries: TaskActivityEntry[] = [];
    const now = new Date().toISOString();

    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status !== task.status) {
        activityEntries.push({
          id: randomUUID(),
          activityType: 'status_changed',
          userId: currentUserId,
          fieldName: 'status',
          oldValue: task.status,
          newValue: dto.status,
          createdAt: now,
        });
        const sMeta = statusMap.get(dto.status)?.metadata ?? {};
        if (sMeta.autoSetStartDate && !task.startDate) {
          updateData.startDate = new Date();
        }
        if (sMeta.isFinal) {
          if (!task.endDate) updateData.endDate = new Date();
          if (sMeta.autoCompletePct !== undefined)
            updateData.completionPercentage = sMeta.autoCompletePct;
        }
      }
    }

    if (dto.priority !== undefined && dto.priority !== task.priority) {
      updateData.priority = dto.priority;
      activityEntries.push({
        id: randomUUID(),
        activityType: 'priority_changed',
        userId: currentUserId,
        fieldName: 'priority',
        oldValue: task.priority,
        newValue: dto.priority,
        createdAt: now,
      });
    }

    if (dto.assignedToUserId !== undefined) {
      updateData.assignedToUserId = dto.assignedToUserId;
      if (dto.assignedToUserId !== task.assignedToUserId) {
        activityEntries.push({
          id: randomUUID(),
          activityType: 'assigned',
          userId: currentUserId,
          fieldName: 'assignedToUserId',
          oldValue: task.assignedToUserId ?? undefined,
          newValue: dto.assignedToUserId ?? undefined,
          createdAt: now,
        });
      }
    }

    if (dto.endDate !== undefined) updateData.endDate = dto.endDate;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate;
    if (dto.description !== undefined) updateData.descriptionOverride = dto.description;
    if (dto.completionPercentage !== undefined)
      updateData.completionPercentage = dto.completionPercentage;
    if (dto.checklist !== undefined) updateData.checklistOverride = dto.checklist;

    if (dto.dependsOnTaskIds !== undefined) {
      await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        const locked = await manager.findOne(ProjectTaskEntity, {
          where: { id: taskId, projectId: task.projectId, deletedAt: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw new NotFoundException('Task not found');
        if (dto.dependsOnTaskIds!.length > 0) {
          for (const depId of dto.dependsOnTaskIds!) {
            const dep = await manager.findOne(ProjectTaskEntity, {
              where: { id: depId, projectId: task.projectId, deletedAt: IsNull() },
            });
            if (!dep) {
              throw new BadRequestException(
                `Dependency task ${depId} not found in this project. Cross-project dependencies are not supported.`,
              );
            }
          }
          await this.detectCircularDependencies(
            taskId,
            dto.dependsOnTaskIds!,
            task.projectId,
            manager,
          );
        }
        await this.taskRepository.updateById(
          taskId,
          {
            dependsOnTaskIds: dto.dependsOnTaskIds,
            version: (() => 'version + 1') as unknown as number,
          },
          manager,
        );
      });
      activityEntries.push({
        id: randomUUID(),
        activityType: 'updated',
        userId: currentUserId,
        fieldName: 'dependsOnTaskIds',
        oldValue: JSON.stringify(task.dependsOnTaskIds ?? []),
        newValue: JSON.stringify(dto.dependsOnTaskIds),
        createdAt: now,
      });
    }

    if (activityEntries.length === 0 && Object.keys(updateData).length > 0) {
      activityEntries.push({
        id: randomUUID(),
        activityType: 'updated',
        userId: currentUserId,
        createdAt: now,
      });
    }

    if (Object.keys(updateData).length > 0) {
      updateData.version = () => 'version + 1';
      updateData.updatedBy = currentUserId;

      await this.taskRepository.updateWithActivityLogs(
        taskId,
        task.projectId,
        updateData,
        activityEntries,
      );

      if (dto.status && dto.status !== task.status) {
        await this.updateAllProgress(task.projectId);
      }
    }

    // Re-fetch enriched task
    const updated = await this.taskRepository.findByIdCrossProject(
      taskId,
      currentUserId,
      organizationId,
      teamProjectIds,
      isAdmin,
    );
    if (!updated) {
      throw new NotFoundException('Task not found after update');
    }

    const depNameMap = new Map<string, string>();
    const depCodeMap = new Map<string, string>();
    const depStatusMap = new Map<string, TaskStatus>();
    if (updated.dependsOnTaskIds?.length) {
      const depTasks = await this.taskRepository.findByProjectRaw(updated.projectId, {
        relations: ['workflowStep'],
      });
      for (const dt of depTasks) {
        depNameMap.set(dt.id, dt.nameOverride ?? dt.workflowStep?.name ?? dt.code);
        depCodeMap.set(dt.id, dt.code);
        depStatusMap.set(dt.id, dt.status);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reuse the maps already loaded at the start of this method
    return this.enrichMyTask(
      updated,
      today,
      depNameMap,
      depStatusMap,
      depCodeMap,
      statusMap,
      priorityMap,
    );
  }

  async addComment(
    taskId: string,
    comment: string,
    currentUserId: string,
    organizationId: string,
    userRoles: string[] = [],
  ): Promise<void> {
    const isAdmin = this.isAdminRole(userRoles);
    const teamProjectIds = await this.getUserTeamProjectIds(currentUserId);
    const task = await this.taskRepository.findByIdCrossProject(
      taskId,
      currentUserId,
      organizationId,
      teamProjectIds,
      isAdmin,
    );
    if (!task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    const entry: TaskActivityEntry = {
      id: randomUUID(),
      activityType: 'commented',
      userId: currentUserId,
      newValue: comment,
      createdAt: new Date().toISOString(),
    };

    await this.taskRepository.prependActivityLogEntry(taskId, task.projectId, entry);
  }

  private async getUserTeamProjectIds(userId: string): Promise<string[]> {
    const memberships = await this.teamRepository.findByUser(userId);
    return memberships.map((m) => m.projectId);
  }

  private isAdminRole(roles: string[]): boolean {
    const safeRoles = roles ?? [];
    return (
      safeRoles.includes('admin') ||
      safeRoles.includes('super_admin') ||
      safeRoles.includes('platform_admin')
    );
  }

  private async detectCircularDependencies(
    taskId: string,
    proposedDeps: string[],
    projectId: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (proposedDeps.includes(taskId)) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const graphData = await this.taskRepository.findDependencyGraph(projectId, manager);

    const graph = new Map<string, string[]>();
    for (const t of graphData) {
      const deps = t.id === taskId ? proposedDeps : t.dependsOnTaskIds;
      graph.set(t.id, deps);
    }
    if (!graph.has(taskId)) {
      graph.set(taskId, proposedDeps);
    }

    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      stack.add(node);
      for (const dep of graph.get(node) ?? []) {
        if (hasCycle(dep)) return true;
      }
      stack.delete(node);
      return false;
    };

    if (hasCycle(taskId)) {
      throw new BadRequestException(
        'Circular dependency detected. This change would create a dependency loop.',
      );
    }
  }

  private async validateDependencies(depIds: string[], projectId: string): Promise<void> {
    for (const depId of depIds) {
      const dep = await this.taskRepository.findById(depId, projectId);
      if (!dep) {
        throw new BadRequestException(
          `Dependency task ${depId} not found in this project. Cross-project dependencies are not supported.`,
        );
      }
    }
  }

  private async validateAndApplyStatusChange(
    task: ProjectTaskEntity,
    newStatus: TaskStatus,
    projectId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOneById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!project.taskStatuses?.length) {
      throw new BadRequestException(`Project ${projectId} has no task statuses configured.`);
    }

    const allowedCodes = project.taskStatuses.map((s) => s.code);

    if (!allowedCodes.includes(newStatus)) {
      throw new BadRequestException(
        `Status '${newStatus}' is not a configured status for this project`,
      );
    }

    await this.workflowEngine.validateTransition(task, newStatus, project);
    await this.workflowEngine.checkDependencies(task, newStatus);
  }

  private async updateAllProgress(projectId: string): Promise<void> {
    const { done, total } = await this.taskRepository.computeProgress(projectId);
    const progress = total > 0 ? Math.round((100 * done) / total) : 0;
    await this.projectRepository.updateProgressById(projectId, progress);
    await this.milestoneRepository.updateProgressForProject(projectId);
  }

  private async createActivityLog(
    taskId: string,
    projectId: string,
    activityType: TaskActivityType,
    userId: string,
    fieldName?: string,
    oldValue?: string,
    newValue?: string,
  ): Promise<void> {
    const newEntry: TaskActivityEntry = {
      id: randomUUID(),
      activityType,
      userId,
      fieldName,
      oldValue,
      newValue,
      createdAt: new Date().toISOString(),
    };

    await this.taskRepository.prependActivityLogEntry(taskId, projectId, newEntry);
  }

  private buildActivityEntries(
    existingTask: ProjectTaskEntity,
    updateDto: UpdateProjectTaskDto,
    currentUserId: string,
  ): TaskActivityEntry[] {
    const entries: TaskActivityEntry[] = [];
    const now = new Date().toISOString();

    if (
      updateDto.assignedToUserId &&
      updateDto.assignedToUserId !== existingTask.assignedToUserId
    ) {
      entries.push({
        id: randomUUID(),
        activityType: 'assigned',
        userId: currentUserId,
        fieldName: 'assignedToUserId',
        oldValue: existingTask.assignedToUserId,
        newValue: updateDto.assignedToUserId,
        createdAt: now,
      });
    }

    if (updateDto.priority && updateDto.priority !== existingTask.priority) {
      entries.push({
        id: randomUUID(),
        activityType: 'priority_changed',
        userId: currentUserId,
        fieldName: 'priority',
        oldValue: existingTask.priority,
        newValue: updateDto.priority,
        createdAt: now,
      });
    }

    if (entries.length === 0) {
      entries.push({
        id: randomUUID(),
        activityType: 'updated',
        userId: currentUserId,
        createdAt: now,
      });
    }

    return entries;
  }

  private enrichMyTask(
    task: ProjectTaskEntity,
    today: Date,
    depNameMap: Map<string, string>,
    depStatusMap: Map<string, TaskStatus>,
    depCodeMap: Map<string, string>,
    statusMap: Map<string, { label: string; metadata: Record<string, unknown> }>,
    priorityMap: Map<string, { label: string; metadata: Record<string, unknown> }>,
  ): EnrichedMyTask {
    const assignee = task.assignee;
    const assigneeName = assignee
      ? [assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || undefined
      : undefined;

    let checklistProgress: ChecklistProgress | undefined;
    const cl = task.checklistOverride ?? task.workflowStep?.checklistTemplate;
    if (cl?.items?.length) {
      checklistProgress = {
        done: cl.items.filter((i) => i.isCompleted).length,
        total: cl.items.length,
      };
    }

    const endDate = task.endDate ? new Date(task.endDate) : null;
    const isOverdue = endDate
      ? (() => {
          const d = new Date(endDate);
          d.setHours(0, 0, 0, 0);
          return d < today;
        })()
      : false;

    const msPerDay = 86_400_000;
    const daysSinceLastUpdate = Math.floor(
      (Date.now() - new Date(task.updatedAt).getTime()) / msPerDay,
    );

    const urgencyScore = this.computeUrgencyScore(task, today, statusMap, priorityMap);

    return {
      ...task,
      projectNumber: task.project?.projectNumber ?? '',
      projectName: task.project?.name ?? '',
      milestoneName: task.milestone?.name,
      assigneeName,
      urgencyScore,
      isOverdue,
      daysSinceLastUpdate,
      checklistProgress,
      dependencyNames: (task.dependsOnTaskIds ?? [])
        .map((depId: string) => depNameMap.get(depId))
        .filter(Boolean) as string[],
      dependencyCodes: (task.dependsOnTaskIds ?? [])
        .map((depId: string) => depCodeMap.get(depId))
        .filter(Boolean) as string[],
      hasDependencyBlockers: (task.dependsOnTaskIds ?? []).some((depId: string) => {
        const s = depStatusMap.get(depId);
        if (!s) return false;
        // Unknown statuses (not in lookup) are treated as blocking — safe default
        return statusMap.get(s)?.metadata.blocksDependents !== false;
      }),
      projectTaskStatuses: task.project?.taskStatuses ?? [],
    };
  }

  private computeUrgencyScore(
    task: ProjectTaskEntity,
    today: Date,
    statusMap: Map<string, { label: string; metadata: Record<string, unknown> }>,
    priorityMap: Map<string, { label: string; metadata: Record<string, unknown> }>,
  ): number {
    let score = 0;
    const msPerDay = 86_400_000;

    const endDate = task.endDate ? new Date(task.endDate) : null;
    if (endDate) {
      const ed = new Date(endDate);
      ed.setHours(0, 0, 0, 0);

      if (ed < today) {
        score += 100;
      } else if (ed.getTime() === today.getTime()) {
        score += 50;
      } else {
        const daysUntilDue = Math.ceil((ed.getTime() - today.getTime()) / msPerDay);
        score += Math.max(0, 30 - daysUntilDue);
      }
    }

    // Priority weight: entirely from DB metadata, default 0 if not configured
    score += (priorityMap.get(task.priority)?.metadata.urgencyWeight as number | undefined) ?? 0;

    // Status urgency penalty: entirely from DB metadata (e.g. blocked lowers score)
    score -= (statusMap.get(task.status)?.metadata.urgencyPenalty as number | undefined) ?? 0;

    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(task.createdAt).getTime()) / msPerDay,
    );
    score += Math.min(10, Math.floor(daysSinceCreated / 3));

    return score;
  }

  private groupByProject(tasks: EnrichedMyTask[]): TaskGroup[] {
    const projectMap = new Map<string, { tasks: EnrichedMyTask[]; name: string; number: string }>();

    for (const task of tasks) {
      const pid = task.projectId as string;
      if (!projectMap.has(pid)) {
        projectMap.set(pid, { tasks: [], name: task.projectName, number: task.projectNumber });
      }
      projectMap.get(pid)!.tasks.push(task);
    }

    return Array.from(projectMap.entries()).map(([pid, data]) => ({
      key: pid,
      label: `${data.number} - ${data.name}`,
      count: data.tasks.length,
      variant: 'info',
      tasks: data.tasks,
    }));
  }

  private groupByStatus(
    tasks: EnrichedMyTask[],
    statusLookups: Array<{ code: string; label: string; metadata: Record<string, unknown> }>,
  ): TaskGroup[] {
    // Order, label, variant all come from DB — no hardcoded list
    const groups = statusLookups.map((lookup) => {
      const filtered = tasks.filter((t) => (t.status as string) === lookup.code);
      return {
        key: lookup.code,
        label: lookup.label,
        count: filtered.length,
        variant: (lookup.metadata.variant as string) ?? 'secondary',
        tasks: filtered,
      };
    });

    // Surface tasks whose status isn't in the lookup under a generic group
    const knownCodes = new Set(statusLookups.map((l) => l.code));
    const unknown = tasks.filter((t) => !knownCodes.has(t.status as string));
    if (unknown.length > 0) {
      groups.push({
        key: 'other',
        label: 'OTHER',
        count: unknown.length,
        variant: 'secondary',
        tasks: unknown,
      });
    }

    return groups.filter((g) => g.count > 0);
  }

  private async buildGroups(
    tasks: EnrichedMyTask[],
    groupBy: 'dueDate' | 'priority' | 'project' | 'status',
    today: Date,
    statusMap: Map<string, { label: string; metadata: Record<string, unknown> }>,
    priorityMap: Map<string, { label: string; metadata: Record<string, unknown> }>,
  ): Promise<TaskGroup[]> {
    if (groupBy === 'dueDate') {
      return this.groupByDueDate(tasks, today);
    }
    if (groupBy === 'priority') {
      return this.groupByPriority(tasks, priorityMap);
    }
    if (groupBy === 'project') {
      return this.groupByProject(tasks);
    }
    // status grouping: use the already-loaded statusMap for order, label, and variant
    return this.groupByStatus(
      tasks,
      [...statusMap.entries()].map(([code, e]) => ({
        code,
        label: e.label,
        metadata: e.metadata,
      })),
    );
  }

  private groupByDueDate(tasks: EnrichedMyTask[], today: Date): TaskGroup[] {
    const endOfWeek = new Date(today);
    const dayOfWeek = endOfWeek.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    const buckets: Record<string, EnrichedMyTask[]> = {
      overdue: [],
      due_today: [],
      this_week: [],
      later: [],
      no_date: [],
    };

    for (const task of tasks) {
      const endDate = task.endDate as Date | string | null | undefined;
      if (!endDate) {
        buckets.no_date!.push(task);
      } else {
        const d = new Date(endDate);
        d.setHours(0, 0, 0, 0);
        if (d < today) {
          buckets.overdue!.push(task);
        } else if (d.getTime() === today.getTime()) {
          buckets.due_today!.push(task);
        } else if (d <= endOfWeek) {
          buckets.this_week!.push(task);
        } else {
          buckets.later!.push(task);
        }
      }
    }

    const config = [
      { key: 'overdue', label: 'OVERDUE', variant: 'error' },
      { key: 'due_today', label: 'DUE TODAY', variant: 'warning' },
      { key: 'this_week', label: 'THIS WEEK', variant: 'info' },
      { key: 'later', label: 'LATER', variant: 'success' },
      { key: 'no_date', label: 'NO DATE', variant: 'secondary' },
    ];

    return config
      .filter((c) => (buckets[c.key] ?? []).length > 0)
      .map((c) => ({
        key: c.key,
        label: c.label,
        count: buckets[c.key]!.length,
        variant: c.variant,
        tasks: buckets[c.key]!,
      }));
  }

  private groupByPriority(
    tasks: EnrichedMyTask[],
    priorityMap: Map<string, { label: string; metadata: Record<string, unknown> }>,
  ): TaskGroup[] {
    // Order comes from Map insertion order which matches DB orderIndex (set by getLookupMap)
    const groups: TaskGroup[] = [];

    for (const [code, entry] of priorityMap.entries()) {
      const filtered = tasks.filter((t) => (t.priority as string) === code);
      groups.push({
        key: code,
        label: entry.label,
        count: filtered.length,
        variant: (entry.metadata.variant as string) ?? 'secondary',
        tasks: filtered,
      });
    }

    // Surface tasks whose priority isn't in the lookup
    const knownCodes = new Set(priorityMap.keys());
    const unknown = tasks.filter((t) => !knownCodes.has(t.priority as string));
    if (unknown.length > 0) {
      groups.push({
        key: 'other',
        label: 'Other',
        count: unknown.length,
        variant: 'secondary',
        tasks: unknown,
      });
    }

    return groups.filter((g) => g.count > 0);
  }

  /**
   * Returns a Map<code, { label, metadata }> for the given lookup typeCode.
   * Carries both label and metadata so callers never need a second DB fetch for labels.
   * Map insertion order matches DB orderIndex ASC (guaranteed by findByTypeCodeRaw).
   */
  private async getLookupMap(
    typeCode: LookupTypeCode,
  ): Promise<Map<string, { label: string; metadata: Record<string, unknown> }>> {
    const rows = await this.lookupRepository.findByTypeCodeRaw(typeCode);
    return new Map(rows.map((r) => [r.code, { label: r.label, metadata: r.metadata ?? {} }]));
  }
}
