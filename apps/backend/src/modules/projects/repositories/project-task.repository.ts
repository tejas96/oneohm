import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type TaskActivityEntry,
  TaskStatus,
  ProjectStatus,
  LookupTypeCode,
} from '@oneohm-epc/shared/types';
import {
  DataSource,
  type EntityManager,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Not,
  type Repository,
} from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { ProjectTaskEntity } from '../entities/project-task.entity';

const REPOSITORY_CONSTANTS = {
  MAX_ACTIVITY_LOG_ENTRIES: 100,
  DEFAULT_KANBAN_ORDER: 1000,
  UNASSIGNED_TASK_FILTER: '__unassigned__',
} as const;

@Injectable()
export class ProjectTaskRepository {
  constructor(
    @InjectRepository(ProjectTaskEntity)
    public readonly repository: Repository<ProjectTaskEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    data: Partial<ProjectTaskEntity>,
    manager?: EntityManager,
  ): Promise<ProjectTaskEntity> {
    const repo = this.getRepo(manager);
    const task = repo.create(data);
    return repo.save(task);
  }

  /**
   * Update task by ID (no project ownership check — use inside transactions where ownership is pre-validated)
   */
  async updateById(
    id: string,
    data: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update(id, data);
  }

  /**
   * Find all tasks for a project with optional relations (transaction-aware)
   */
  async findByProjectRaw(
    projectId: string,
    options?: { relations?: string[] },
    manager?: EntityManager,
  ): Promise<ProjectTaskEntity[]> {
    const repo = this.getRepo(manager);
    return repo.find({
      where: { projectId },
      ...(options?.relations ? { relations: options.relations } : {}),
    });
  }

  /**
   * Lightweight projection for DFS cycle detection.
   * Loads ONLY id and dependsOnTaskIds to avoid heavy JSONB columns.
   */
  async findDependencyGraph(
    projectId: string,
    manager?: EntityManager,
  ): Promise<Array<{ id: string; dependsOnTaskIds: string[] }>> {
    const repo = this.getRepo(manager);
    const rows = await repo
      .createQueryBuilder('task')
      .select(['task.id', 'task.dependsOnTaskIds'])
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .getMany();
    return rows.map((r) => ({
      id: r.id,
      dependsOnTaskIds: r.dependsOnTaskIds ?? [],
    }));
  }

  async findById(id: string, projectId: string): Promise<ProjectTaskEntity | null> {
    const task = await this.repository.findOne({
      where: {
        id,
        projectId,
        deletedAt: IsNull(),
      },
      relations: ['assignee', 'workflowStep'],
    });
    return task ? this.resolveTaskFields(task) : null;
  }

  async findAll(
    projectId: string,
    page: number,
    limit: number,
    filters: {
      milestoneName?: string;
      assignedToUserId?: string;
      status?: TaskStatus;
      priority?: string;
      search?: string;
    } = {},
  ): Promise<{ data: ProjectTaskEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.workflowStep', 'workflowStep')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL');

    if (filters.milestoneName) {
      qb.andWhere('task.milestone_name = :milestoneName', { milestoneName: filters.milestoneName });
    }
    if (filters.assignedToUserId) {
      if (filters.assignedToUserId === REPOSITORY_CONSTANTS.UNASSIGNED_TASK_FILTER) {
        qb.andWhere('task.assigned_to_user_id IS NULL');
      } else {
        qb.andWhere('task.assigned_to_user_id = :assignedToUserId', {
          assignedToUserId: filters.assignedToUserId,
        });
      }
    }
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters.search) {
      qb.andWhere(
        `(
          LOWER(task.name_override) LIKE LOWER(:search)
          OR LOWER(task.code) LIKE LOWER(:search)
          OR LOWER(workflowStep.name) LIKE LOWER(:search)
          OR LOWER(task.description_override) LIKE LOWER(:search)
          OR LOWER(workflowStep.description) LIKE LOWER(:search)
        )`,
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('task.kanbanOrder', 'ASC').addOrderBy('task.createdAt', 'DESC');

    // Split getCount + getMany to avoid TypeORM getManyAndCount crash
    // when leftJoinAndSelect is combined with addOrderBy on joined aliases.
    const total = await qb.getCount();
    const data = await qb.skip(skip).take(limit).getMany();
    return { data: this.resolveMany(data), total };
  }

  async findByAssignee(projectId: string, assignedToUserId: string): Promise<ProjectTaskEntity[]> {
    const tasks = await this.repository.find({
      where: {
        projectId,
        assignedToUserId,
        deletedAt: IsNull(),
      },
      relations: ['workflowStep'],
      order: {
        priority: 'DESC',
        startDate: 'ASC',
      },
    });
    return this.resolveMany(tasks);
  }

  async update(
    id: string,
    projectId: string,
    data: Record<string, unknown>,
  ): Promise<ProjectTaskEntity | null> {
    await this.repository.update(
      {
        id,
        projectId,
        deletedAt: IsNull(),
      },
      data,
    );
    return this.findById(id, projectId);
  }

  async updateWithActivityLogs(
    id: string,
    projectId: string,
    data: Record<string, unknown>,
    activityEntries: TaskActivityEntry[],
  ): Promise<ProjectTaskEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(ProjectTaskEntity);

      await taskRepo.update(
        {
          id,
          projectId,
          deletedAt: IsNull(),
        },
        data,
      );

      if (activityEntries.length > 0) {
        for (const entry of activityEntries) {
          await manager.query(
            `
            UPDATE project_tasks
            SET activity_log = (
              SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
              FROM (
                SELECT elem
                FROM jsonb_array_elements(
                  jsonb_insert(COALESCE(activity_log, '[]'::jsonb), '{0}', $1::jsonb)
                ) WITH ORDINALITY AS t(elem, ord)
                ORDER BY ord
                LIMIT $2
              ) AS limited
            )
            WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL
          `,
            [JSON.stringify(entry), REPOSITORY_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES, id, projectId],
          );
        }
      }

      const task = await taskRepo.findOne({
        where: { id, projectId, deletedAt: IsNull() },
        relations: ['assignee', 'workflowStep'],
      });
      return task ? this.resolveTaskFields(task) : null;
    });
  }

  async softDelete(id: string, projectId: string): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
      projectId,
    });
    return (result.affected ?? 0) > 0;
  }

  async prependActivityLogEntry(
    id: string,
    projectId: string,
    entry: TaskActivityEntry,
    maxEntries: number = REPOSITORY_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(ProjectTaskEntity)
      .set({
        activityLog: () => `(
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM (
            SELECT elem
            FROM jsonb_array_elements(
              jsonb_insert(COALESCE(activity_log, '[]'::jsonb), '{0}', :entry::jsonb)
            ) WITH ORDINALITY AS t(elem, ord)
            ORDER BY ord
            LIMIT :maxEntries
          ) AS limited
        )`,
      })
      .where('id = :id', { id })
      .andWhere('project_id = :projectId', { projectId })
      .andWhere('deleted_at IS NULL')
      .setParameter('entry', JSON.stringify(entry))
      .setParameter('maxEntries', maxEntries)
      .execute();
  }

  async countByStatus(projectId: string): Promise<Record<TaskStatus, number>> {
    const results = await this.repository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .groupBy('task.status')
      .getRawMany<{ status: TaskStatus; count: string }>();

    const statusCounts: Record<TaskStatus, number> = {
      [TaskStatus.BACKLOG]: 0,
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.TESTING]: 0,
      [TaskStatus.BLOCKED]: 0,
      [TaskStatus.DONE]: 0,
      [TaskStatus.CANCELLED]: 0,
    };

    for (const result of results) {
      statusCounts[result.status] = parseInt(result.count, 10);
    }

    return statusCounts;
  }

  async findAllForBoard(projectId: string): Promise<ProjectTaskEntity[]> {
    const tasks = await this.repository.find({
      where: { projectId, deletedAt: IsNull() },
      relations: ['assignee', 'workflowStep'],
      order: { kanbanOrder: 'ASC', createdAt: 'DESC' },
    });
    return this.resolveMany(tasks);
  }

  async findOverdue(projectId: string): Promise<ProjectTaskEntity[]> {
    const tasks = await this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.workflowStep', 'workflowStep')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .andWhere('task.end_date < CURRENT_DATE')
      .orderBy('task.end_date', 'ASC')
      .getMany();
    return this.resolveMany(tasks);
  }

  async existsByCode(code: string, projectId: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.code = :code', { code })
      .andWhere('task.deleted_at IS NULL');

    if (excludeId) {
      queryBuilder.andWhere('task.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async getNextTaskCode(projectId: string): Promise<string> {
    const lastTask = await this.repository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.code LIKE :pattern', { pattern: 'TASK-%' })
      .orderBy('task.created_at', 'DESC')
      .getOne();

    if (!lastTask) {
      return 'TASK-001';
    }

    const lastNumber = parseInt(lastTask.code.split('-')[1] ?? '0', 10);
    const nextNumber = lastNumber + 1;
    return `TASK-${nextNumber.toString().padStart(3, '0')}`;
  }

  async findForKanban(
    projectId: string,
    status: TaskStatus,
    page: number,
    limit: number,
  ): Promise<{ data: ProjectTaskEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: {
        projectId,
        status,
        deletedAt: IsNull(),
      },
      relations: ['assignee', 'workflowStep'],
      order: {
        kanbanOrder: 'ASC',
      },
      skip,
      take: limit,
    });

    return { data: this.resolveMany(data), total };
  }

  async moveTask(
    id: string,
    projectId: string,
    newStatus: TaskStatus,
    newKanbanOrder: number,
    expectedVersion: number,
  ): Promise<ProjectTaskEntity | null> {
    const result = await this.repository
      .createQueryBuilder()
      .update(ProjectTaskEntity)
      .set({
        status: newStatus,
        kanbanOrder: newKanbanOrder,
        version: () => 'version + 1',
      })
      .where('id = :id', { id })
      .andWhere('project_id = :projectId', { projectId })
      .andWhere('version = :expectedVersion', { expectedVersion })
      .andWhere('deleted_at IS NULL')
      .execute();

    if (result.affected === 0) {
      return null;
    }

    return this.findById(id, projectId);
  }

  async moveTaskWithActivityLog(
    id: string,
    projectId: string,
    newStatus: TaskStatus,
    newKanbanOrder: number,
    expectedVersion: number,
    activityEntry?: TaskActivityEntry,
    extraFields?: Partial<
      Pick<ProjectTaskEntity, 'startDate' | 'endDate' | 'completionPercentage'>
    >,
  ): Promise<ProjectTaskEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const setClause: Record<string, unknown> = {
        status: newStatus,
        kanbanOrder: newKanbanOrder,
        version: () => 'version + 1',
      };
      if (extraFields?.startDate !== undefined) setClause.startDate = extraFields.startDate;
      if (extraFields?.endDate !== undefined) setClause.endDate = extraFields.endDate;
      if (extraFields?.completionPercentage !== undefined)
        setClause.completionPercentage = extraFields.completionPercentage;

      const result = await manager
        .createQueryBuilder()
        .update(ProjectTaskEntity)
        .set(setClause)
        .where('id = :id', { id })
        .andWhere('project_id = :projectId', { projectId })
        .andWhere('version = :expectedVersion', { expectedVersion })
        .andWhere('deleted_at IS NULL')
        .execute();

      if (result.affected === 0) {
        return null;
      }

      if (activityEntry) {
        await manager.query(
          `
          UPDATE project_tasks
          SET activity_log = (
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
            FROM (
              SELECT elem
              FROM jsonb_array_elements(
                jsonb_insert(COALESCE(activity_log, '[]'::jsonb), '{0}', $1::jsonb)
              ) WITH ORDINALITY AS t(elem, ord)
              ORDER BY ord
              LIMIT $2
            ) AS limited
          )
          WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL
        `,
          [
            JSON.stringify(activityEntry),
            REPOSITORY_CONSTANTS.MAX_ACTIVITY_LOG_ENTRIES,
            id,
            projectId,
          ],
        );
      }

      const task = await manager.findOne(ProjectTaskEntity, {
        where: { id, projectId, deletedAt: IsNull() },
        relations: ['assignee', 'workflowStep'],
      });
      return task ? this.resolveTaskFields(task) : null;
    });
  }

  async findByUserId(
    userId: string,
    organizationId: string,
    page: number,
    limit: number,
    filters: {
      status?: TaskStatus;
      priority?: string;
    } = {},
  ): Promise<{ data: ProjectTaskEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const base: Record<string, unknown> = {
      deletedAt: IsNull(),
      status: Not(In([TaskStatus.DONE, TaskStatus.CANCELLED])),
      project: {
        property: { organizationId },
        status: Not(ProjectStatus.CANCELLED),
      },
    };

    if (
      filters.status &&
      filters.status !== TaskStatus.DONE &&
      filters.status !== TaskStatus.CANCELLED
    ) {
      base.status = filters.status;
    }
    if (filters.priority) {
      base.priority = filters.priority;
    }

    const whereConditions: Record<string, unknown>[] = [{ ...base, assignedToUserId: userId }];

    const [data, total] = await this.repository.findAndCount({
      where: whereConditions,
      relations: ['project', 'workflowStep'],
      order: {
        priority: 'DESC',
        endDate: 'ASC',
      },
      skip,
      take: limit,
    });

    return { data: this.resolveMany(data), total };
  }

  async areAllDependenciesResolved(dependsOnTaskIds: string[]): Promise<{
    resolved: boolean;
    blockers: Array<{ name: string; status: string }>;
  }> {
    if (!dependsOnTaskIds?.length) return { resolved: true, blockers: [] };

    const [tasks, statusRows] = await Promise.all([
      this.repository.find({
        where: { id: In(dependsOnTaskIds) },
        relations: ['workflowStep'],
        withDeleted: true,
      }),
      this.repository.manager.query(
        `SELECT code, metadata FROM lookups WHERE type_code = $1 AND deleted_at IS NULL`,
        [LookupTypeCode.DEFAULT_TASK_STATUS],
      ),
    ]);

    const statusMap = new Map<string, any>(
      statusRows.map((r: { code: string; metadata: any }) => [
        r.code,
        typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      ]),
    );

    const blockers: Array<{ name: string; status: string }> = [];
    for (const dep of tasks) {
      if (dep.deletedAt) continue;
      const blocks = statusMap.get(dep.status)?.blocksDependents !== false;
      if (!blocks) continue;

      const name = dep.nameOverride ?? dep.workflowStep?.name ?? dep.code;
      blockers.push({ name, status: dep.status });
    }

    return { resolved: blockers.length === 0, blockers };
  }

  async findAllByUserId(
    userId: string,
    organizationId: string,
    filters: {
      status?: TaskStatus;
      priority?: string;
      projectId?: string;
      search?: string;
      dueDateFilter?: string;
    } = {},
  ): Promise<ProjectTaskEntity[]> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('project.property', 'property')
      .leftJoinAndSelect('task.workflowStep', 'workflowStep')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.deleted_at IS NULL')
      .andWhere('property.organization_id = :organizationId', { organizationId })
      .andWhere('project.status != :cancelledStatus', { cancelledStatus: ProjectStatus.CANCELLED });

    // Status filter
    if (
      filters.status &&
      filters.status !== TaskStatus.DONE &&
      filters.status !== TaskStatus.CANCELLED
    ) {
      qb.andWhere('task.status = :status', { status: filters.status });
    } else {
      qb.andWhere('task.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      });
    }

    if (filters.priority) {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }
    if (filters.projectId) {
      qb.andWhere('task.project_id = :projectId', { projectId: filters.projectId });
    }

    // Text search on name/code
    if (filters.search) {
      qb.andWhere(
        `(
          LOWER(task.name_override) LIKE LOWER(:search)
          OR LOWER(task.code) LIKE LOWER(:search)
          OR LOWER(workflowStep.name) LIKE LOWER(:search)
        )`,
        { search: `%${filters.search}%` },
      );
    }

    // Due date proximity filter
    if (filters.dueDateFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      if (filters.dueDateFilter === 'overdue') {
        qb.andWhere('task.end_date IS NOT NULL').andWhere('task.end_date < :todayStr', {
          todayStr,
        });
      } else if (filters.dueDateFilter === 'dueToday') {
        qb.andWhere('task.end_date = :todayStr', { todayStr });
      } else if (filters.dueDateFilter === 'thisWeek') {
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;
        qb.andWhere('task.end_date IS NOT NULL')
          .andWhere('task.end_date > :todayStr', { todayStr })
          .andWhere('task.end_date <= :endOfWeekStr', { endOfWeekStr });
      }
    }

    // Ownership: only tasks assigned to this user
    qb.andWhere('task.assigned_to_user_id = :userId', { userId });

    qb.orderBy('task.end_date', 'ASC', 'NULLS LAST').addOrderBy('task.priority', 'DESC');

    const results = await qb.getMany();
    return this.resolveMany(results);
  }

  async findByIdForAssignee(
    taskId: string,
    userId: string,
    organizationId: string,
    teamProjectIds: string[] = [],
    isAdmin = false,
  ): Promise<ProjectTaskEntity | null> {
    const orgFilter = { project: { property: { organizationId } } };

    let whereConditions: Record<string, unknown>[];

    if (isAdmin) {
      whereConditions = [{ id: taskId, deletedAt: IsNull(), ...orgFilter }];
    } else if (teamProjectIds.length > 0) {
      whereConditions = [
        { id: taskId, assignedToUserId: userId, deletedAt: IsNull(), ...orgFilter },
        { id: taskId, projectId: In(teamProjectIds), deletedAt: IsNull(), ...orgFilter },
      ];
    } else {
      whereConditions = [
        { id: taskId, assignedToUserId: userId, deletedAt: IsNull(), ...orgFilter },
      ];
    }

    const task = await this.repository.findOne({
      where: whereConditions,
      relations: ['project', 'assignee', 'workflowStep'],
    });
    return task ? this.resolveTaskFields(task) : null;
  }

  /**
   * Fetch a single task with full relations for the cross-project detail drawer.
   * Access: admin sees any org task, team members see any task in their projects,
   * otherwise user sees only their own assigned tasks.
   */
  async findByIdCrossProject(
    taskId: string,
    userId: string,
    organizationId: string,
    teamProjectIds: string[] = [],
    isAdmin = false,
  ): Promise<ProjectTaskEntity | null> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('project.property', 'property')
      .leftJoinAndSelect('task.workflowStep', 'workflowStep')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.id = :taskId', { taskId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('property.organization_id = :organizationId', { organizationId });

    if (isAdmin) {
      // Admin bypass — org filter is sufficient
    } else if (teamProjectIds.length > 0) {
      qb.andWhere(
        `(task.assigned_to_user_id = :userId OR task.project_id IN (:...teamProjectIds))`,
        { userId, teamProjectIds },
      );
    } else {
      qb.andWhere('task.assigned_to_user_id = :userId', { userId });
    }

    const task = await qb.getOne();
    return task ? this.resolveTaskFields(task) : null;
  }

  async countCompletedThisWeek(
    userId: string,
    organizationId: string,
    projectId?: string,
  ): Promise<number> {
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const base: Record<string, unknown> = {
      status: TaskStatus.DONE,
      deletedAt: IsNull(),
      updatedAt: MoreThanOrEqual(startOfWeek),
      project: { property: { organizationId } },
    };

    if (projectId) {
      base.projectId = projectId;
    }

    const whereConditions: Record<string, unknown>[] = [{ ...base, assignedToUserId: userId }];

    return this.repository.count({ where: whereConditions });
  }

  async findUserTaskProjects(
    userId: string,
    organizationId: string,
  ): Promise<Array<{ id: string; name: string; projectNumber: string }>> {
    const qb = this.repository
      .createQueryBuilder('task')
      .innerJoin('task.project', 'project')
      .innerJoin('project.property', 'property')
      .select('project.id', 'id')
      .addSelect('project.name', 'name')
      .addSelect('project.project_number', 'projectNumber')
      .distinct(true)
      .where('task.deleted_at IS NULL')
      .andWhere('task.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .andWhere('property.organization_id = :organizationId', { organizationId })
      .andWhere('task.assigned_to_user_id = :userId', { userId });

    return qb.getRawMany<{ id: string; name: string; projectNumber: string }>();
  }

  /**
   * Compute unfiltered summary counts for the My Tasks dashboard cards.
   * Uses COUNT queries (no full entity load) for efficiency.
   */
  async countSummaryForUser(
    userId: string,
    organizationId: string,
  ): Promise<{ total: number; overdue: number; dueToday: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseWhere = {
      deletedAt: IsNull(),
      status: Not(In([TaskStatus.DONE, TaskStatus.CANCELLED])),
      project: {
        property: { organizationId },
        status: Not(ProjectStatus.CANCELLED),
      },
    };

    const buildWhere = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
      ...baseWhere,
      ...extra,
      assignedToUserId: userId,
    });

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [total, overdue, dueToday] = await Promise.all([
      this.repository.count({ where: buildWhere() }),
      this.repository.count({ where: buildWhere({ endDate: LessThan(todayStr) }) }),
      this.repository.count({ where: buildWhere({ endDate: todayStr }) }),
    ]);

    return { total, overdue, dueToday };
  }

  async findUpcomingDeadlines(projectId: string, daysAhead: number): Promise<ProjectTaskEntity[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const tasks = await this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.workflowStep', 'workflowStep')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .andWhere('task.end_date IS NOT NULL')
      .andWhere('task.end_date <= :futureDate', { futureDate })
      .andWhere('task.end_date >= CURRENT_DATE')
      .orderBy('task.end_date', 'ASC')
      .getMany();
    return this.resolveMany(tasks);
  }

  async computeProgress(
    projectId: string,
    manager?: EntityManager,
  ): Promise<{ done: number; total: number }> {
    const repo = this.getRepo(manager);
    const result = await repo
      .createQueryBuilder('t')
      .select(`COUNT(*) FILTER (WHERE t.status = :done)`, 'done')
      .addSelect(`COUNT(*) FILTER (WHERE t.status != :cancelled)`, 'total')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.deleted_at IS NULL')
      .setParameters({ done: TaskStatus.DONE, cancelled: TaskStatus.CANCELLED })
      .getRawOne();
    return {
      done: parseInt(result?.done ?? '0', 10),
      total: parseInt(result?.total ?? '0', 10),
    };
  }

  async countByWorkflowStepId(workflowStepId: string): Promise<number> {
    return this.repository.count({
      where: {
        workflowStepId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Generate a unique task code (e.g. TSK-ONEOHM-2026-0001)
   */
  async generateTaskCode(orgCode: string, manager?: EntityManager): Promise<string> {
    return generateEntityCode(this.repository, 'code', 'TSK', orgCode, undefined, manager);
  }

  private resolveTaskFields(task: ProjectTaskEntity): ProjectTaskEntity {
    if (task.workflowStep) {
      task.name = task.nameOverride ?? task.workflowStep.name;
      task.description = task.descriptionOverride ?? task.workflowStep.description;
      task.checklist = task.checklistOverride ?? task.workflowStep.checklistTemplate;
      task.labels =
        task.labelsOverride ?? (task.workflowStep.type ? [task.workflowStep.type] : undefined);
    } else {
      task.name = task.nameOverride ?? '';
      task.description = task.descriptionOverride;
      task.checklist = task.checklistOverride;
      task.labels = task.labelsOverride;
    }
    return task;
  }

  /**
   * Rename all tasks in a milestone group from one name to another.
   * Optionally updates the order for all tasks in the group.
   * This is a single atomic UPDATE filtered by (project_id, milestone_name).
   */
  async renameMilestone(
    projectId: string,
    from: string,
    to: string,
    order?: number,
  ): Promise<{ affected: number }> {
    // TypeORM UpdateQueryBuilder.set() requires camelCase entity property names.
    // Use Pick to only include the two scalar columns we're updating — avoids the deep-partial
    // incompatibility that arises when using full Partial<ProjectTaskEntity> (relation fields).
    const updateValues: Pick<ProjectTaskEntity, 'milestoneName'> &
      Partial<Pick<ProjectTaskEntity, 'milestoneOrder'>> = { milestoneName: to };
    if (order !== undefined) {
      updateValues.milestoneOrder = order;
    }

    const result = await this.repository
      .createQueryBuilder()
      .update(ProjectTaskEntity)

      .set(updateValues as any)
      .where('project_id = :projectId', { projectId })
      .andWhere('milestone_name = :from', { from })
      .andWhere('deleted_at IS NULL')
      .execute();

    return { affected: result.affected ?? 0 };
  }

  private resolveMany(tasks: ProjectTaskEntity[]): ProjectTaskEntity[] {
    return tasks.map((t) => this.resolveTaskFields(t));
  }

  private getRepo(manager?: EntityManager): Repository<ProjectTaskEntity> {
    return manager ? manager.getRepository(ProjectTaskEntity) : this.repository;
  }
}
