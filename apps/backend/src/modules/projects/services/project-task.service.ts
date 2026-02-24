import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type PaginatedResponse,
  type StatisticsResponse,
  type TaskActivityEntry,
  type TaskActivityType,
  TaskPriority,
  TaskStatus,
} from '@oneohm-epc/shared-types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { type CreateProjectTaskDto, type UpdateProjectTaskDto } from '../dto';
import { type ProjectTaskEntity } from '../entities';
import { WorkflowEngineService } from './workflow-engine.service';
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

    if (createDto.dependsOnTaskIds && createDto.dependsOnTaskIds.length > 0) {
      for (const depId of createDto.dependsOnTaskIds) {
        const dependencyTask = await this.taskRepository.findById(depId, projectId);
        if (!dependencyTask) {
          throw new BadRequestException(`Dependency task with ID ${depId} not found`);
        }
      }
    }

    // Route name/description to override columns (resolveTaskFields reads from overrides)
    const taskData: Record<string, unknown> = {
      ...createDto,
      projectId,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    };

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

    const saved = await this.taskRepository.create(taskData as Partial<ProjectTaskEntity>);
    await this.updateAllProgress(projectId);

    // Reload with relations so resolveTaskFields can resolve name from workflowStep
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

    if (updateDto.dependsOnTaskIds && updateDto.dependsOnTaskIds.length > 0) {
      for (const depId of updateDto.dependsOnTaskIds) {
        const dependencyTask = await this.taskRepository.findById(depId, projectId);
        if (!dependencyTask) {
          throw new BadRequestException(`Dependency task with ID ${depId} not found`);
        }
      }
    }

    // Route fields to override columns (resolveTaskFields reads from overrides)
    const updateData: Record<string, unknown> = { ...updateDto };
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

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedBy: currentUserId,
    };
    updateData.version = () => 'version + 1';

    if (newStatus === TaskStatus.IN_PROGRESS && !existingTask.startDate) {
      updateData.startDate = new Date();
    }
    if (newStatus === TaskStatus.DONE || newStatus === TaskStatus.CANCELLED) {
      if (!existingTask.endDate) {
        updateData.endDate = new Date();
      }
      if (newStatus === TaskStatus.DONE) {
        updateData.completionPercentage = 100;
      }
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

    // If setting to 100%, auto-transition status to DONE via the dedicated status handler
    if (completionPercentage === 100) {
      const task = await this.findById(id, projectId);
      if (task.status !== TaskStatus.DONE) {
        await this.updateStatus(id, projectId, TaskStatus.DONE, currentUserId);
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

    const deleted = await this.taskRepository.softDelete(id, projectId);
    if (!deleted) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.updateAllProgress(projectId);
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
    const existingTask = await this.findById(id, projectId);

    // FSM validation + dependency check
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

    // Auto-set lifecycle dates on status transitions (same logic as update())
    const extraFields: Partial<
      Pick<ProjectTaskEntity, 'startDate' | 'endDate' | 'completionPercentage'>
    > = {};
    if (newStatus === TaskStatus.IN_PROGRESS && !existingTask.startDate) {
      extraFields.startDate = new Date();
    }
    if (newStatus === TaskStatus.DONE || newStatus === TaskStatus.CANCELLED) {
      if (!existingTask.endDate) {
        extraFields.endDate = new Date();
      }
      if (newStatus === TaskStatus.DONE) {
        extraFields.completionPercentage = 100;
      }
    }

    const updated = await this.taskRepository.moveTaskWithActivityLog(
      id,
      projectId,
      newStatus,
      newKanbanOrder,
      expectedVersion,
      activityEntry,
      Object.keys(extraFields).length > 0 ? extraFields : undefined,
    );

    if (!updated) {
      throw new BadRequestException(
        'Task was modified by another user. Please refresh and try again.',
      );
    }

    if (newStatus !== existingTask.status) {
      await this.updateAllProgress(projectId);
    }

    return updated;
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

  async getMyTasksGrouped(
    userId: string,
    organizationId: string,
    groupBy: 'dueDate' | 'priority' | 'project' | 'status',
    filters: { status?: TaskStatus; priority?: string; projectId?: string } = {},
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

    const [tasks, summaryCounts, completedThisWeek, projects] = await Promise.all([
      this.taskRepository.findAllByUserId(userId, organizationId, filters, teamProjectIds),
      this.taskRepository.countSummaryForUser(userId, organizationId, teamProjectIds),
      this.taskRepository.countCompletedThisWeek(userId, organizationId, undefined, teamProjectIds),
      this.taskRepository.findUserTaskProjects(userId, organizationId, teamProjectIds),
    ]);

    const flatTasks = tasks.map((task) => ({
      ...task,
      projectNumber: task.project?.projectNumber ?? '',
      projectName: task.project?.name ?? '',
      milestoneName: task.milestone?.name,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      ...summaryCounts,
      completedThisWeek,
      projects,
    };

    const groups = this.buildGroups(flatTasks, groupBy, today);

    return { groups, summary };
  }

  async updateTaskStatusCrossProject(
    taskId: string,
    status: TaskStatus,
    currentUserId: string,
    organizationId: string,
  ): Promise<ProjectTaskEntity> {
    const teamProjectIds = await this.getUserTeamProjectIds(currentUserId);
    const task = await this.taskRepository.findByIdForAssignee(
      taskId,
      currentUserId,
      organizationId,
      teamProjectIds,
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
    );
    return updated!;
  }

  private async getUserTeamProjectIds(userId: string): Promise<string[]> {
    const memberships = await this.teamRepository.findByUser(userId);
    return memberships.map((m) => m.projectId);
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

  private groupByProject(
    tasks: Array<ProjectTaskEntity & { projectNumber: string; projectName: string }>,
  ): TaskGroup[] {
    const projectMap = new Map<string, { tasks: typeof tasks; name: string; number: string }>();

    for (const task of tasks) {
      const pid = task.projectId;
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
    tasks: Array<ProjectTaskEntity & { projectNumber: string; projectName: string }>,
  ): TaskGroup[] {
    const order: Array<{ key: TaskStatus; label: string; variant: string }> = [
      { key: TaskStatus.BLOCKED, label: 'BLOCKED', variant: 'error' },
      { key: TaskStatus.IN_REVIEW, label: 'IN REVIEW', variant: 'warning' },
      { key: TaskStatus.IN_PROGRESS, label: 'IN PROGRESS', variant: 'info' },
      { key: TaskStatus.TODO, label: 'TO DO', variant: 'secondary' },
      { key: TaskStatus.TESTING, label: 'TESTING', variant: 'info' },
      { key: TaskStatus.BACKLOG, label: 'BACKLOG', variant: 'secondary' },
    ];

    return order
      .map((o) => {
        const filtered = tasks.filter((t) => t.status === o.key);
        return {
          key: o.key,
          label: o.label,
          count: filtered.length,
          variant: o.variant,
          tasks: filtered,
        };
      })
      .filter((g) => g.count > 0);
  }

  private buildGroups(
    tasks: Array<
      ProjectTaskEntity & { projectNumber: string; projectName: string; milestoneName?: string }
    >,
    groupBy: 'dueDate' | 'priority' | 'project' | 'status',
    today: Date,
  ): TaskGroup[] {
    if (groupBy === 'dueDate') {
      return this.groupByDueDate(tasks, today);
    }
    if (groupBy === 'priority') {
      return this.groupByPriority(tasks);
    }
    if (groupBy === 'project') {
      return this.groupByProject(tasks);
    }
    return this.groupByStatus(tasks);
  }

  private groupByDueDate(
    tasks: Array<ProjectTaskEntity & { projectNumber: string; projectName: string }>,
    today: Date,
  ): TaskGroup[] {
    const endOfWeek = new Date(today);
    const dayOfWeek = endOfWeek.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    const buckets: Record<string, typeof tasks> = {
      overdue: [],
      due_today: [],
      this_week: [],
      later: [],
      no_date: [],
    };

    for (const task of tasks) {
      if (!task.endDate) {
        buckets.no_date!.push(task);
      } else {
        const d = new Date(task.endDate);
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
    tasks: Array<ProjectTaskEntity & { projectNumber: string; projectName: string }>,
  ): TaskGroup[] {
    const order: Array<{ key: TaskPriority; label: string; variant: string }> = [
      { key: TaskPriority.URGENT, label: 'URGENT', variant: 'error' },
      { key: TaskPriority.HIGH, label: 'HIGH', variant: 'warning' },
      { key: TaskPriority.MEDIUM, label: 'MEDIUM', variant: 'info' },
      { key: TaskPriority.LOW, label: 'LOW', variant: 'secondary' },
    ];

    return order
      .map((o) => {
        const filtered = tasks.filter((t) => t.priority === o.key);
        return {
          key: o.key,
          label: o.label,
          count: filtered.length,
          variant: o.variant,
          tasks: filtered,
        };
      })
      .filter((g) => g.count > 0);
  }
}
