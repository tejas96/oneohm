import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ACTIVE_TICKET_STATUSES,
  ProjectPriority,
  ProjectStatus,
  TaskStatus,
} from '@tejas96/shared/types';
import { type EntityManager, IsNull, Repository } from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { systemSizeKwSql } from '../../../common/utils/transform.util';
import { ProjectEntity } from '../entities/project.entity';

/**
 * A project's money position, in rupees, read from `v_project_balance`.
 *
 * Every figure here comes from the ledger — the same view the project's Money
 * tab reads — so a list row and the project it links to can no longer disagree.
 */
export interface ProjectPaymentSummary {
  /** Active milestones only; waived amounts excluded. */
  totalExpected: number;
  totalPaid: number;
  /** Quote plus every agreed change order. This is "what the project is worth". */
  contractValue: number;
  outstanding: number;
}

/**
 * Project Repository
 * Handles database operations for projects
 *
 * Note: Organization and customer filtering is done via property relation
 * since project.organizationId and project.customerId columns were removed.
 *
 * Business Rule: One property can have only one project (OneToOne relationship)
 */
@Injectable()
export class ProjectRepository {
  private static readonly SORT_WHITELIST: Record<string, string> = {
    name: 'project.name',
    createdAt: 'project.createdAt',
    startDate: 'project.startDate',
    endDate: 'project.endDate',
    // Sorted by the same number the column displays, or the order disagrees
    // with the values in it.
    systemSizeKw: systemSizeKwSql('cv'),
    estimatedCost: 'cv.finalPrice',
    progressPercentage: 'project.progressPercentage',
    status: 'project.status',
  };

  constructor(
    @InjectRepository(ProjectEntity)
    public readonly repository: Repository<ProjectEntity>,
  ) {}

  private latestVersionJoinCondition(quoteAlias: string): string {
    return `cv.id = (
      SELECT qv.id
      FROM quote_versions qv
      WHERE qv.quote_id = ${quoteAlias}.id
      ORDER BY qv.created_at DESC, qv.version_number DESC, qv.id DESC
      LIMIT 1
    )`;
  }

  /**
   * Create a new project
   */
  async create(
    projectData: Partial<ProjectEntity>,
    manager?: EntityManager,
  ): Promise<ProjectEntity> {
    const repo = this.getRepo(manager);
    const project = repo.create(projectData);
    return repo.save(project);
  }

  /**
   * Update project by ID (no org ownership check — use inside transactions where ownership is pre-validated)
   */
  async updateById(
    id: string,
    data: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepo(manager);
    await repo.update({ id }, data);
  }

  /**
   * Find project by ID only (no org check — use when project ownership is already validated via context)
   */
  async findOneById(id: string): Promise<ProjectEntity | null> {
    return this.repository.findOneBy({ id, deletedAt: IsNull() });
  }

  /**
   * Find project by ID with relations
   * Filters by organization via property.organizationId
   */
  async findById(id: string, manager?: EntityManager): Promise<ProjectEntity> {
    const repo = this.getRepo(manager);
    const project = await repo
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', this.latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.updater', 'updater')
      .where('project.id = :id', { id })
      .getOne();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  /**
   * Find all projects with filters and pagination
   * Filters by organization via property.organizationId
   * Includes: team members (with user), milestones for current phase
   */
  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      status?: ProjectStatus;
      priority?: ProjectPriority;
      customerId?: string;
      projectType?: string;
      fromDate?: string;
      toDate?: string;
      startDateFrom?: string;
      startDateTo?: string;
      endDateFrom?: string;
      endDateTo?: string;
      search?: string;
      address?: string;
      memberId?: string;
      currentUserId?: string;
      pendingWorkflowStepId?: string;
      healthStatus?: string;
      createdBy?: string;
      hasActiveTickets?: boolean;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{ projects: ProjectEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('project')
      .loadRelationCountAndMap(
        'project.activeTicketCount',
        'project.serviceTickets',
        'activeTicketRel',
        (countQb) =>
          countQb
            .where('activeTicketRel.deletedAt IS NULL')
            .andWhere('activeTicketRel.status IN (:...activeTicketStatuses)', {
              activeTicketStatuses: [...ACTIVE_TICKET_STATUSES],
            }),
      )
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', this.latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('property.customer', 'customer')
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.teamMembers', 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'teamUser')
      .andWhere('project.deletedAt IS NULL');

    // Apply filters
    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('project.priority = :priority', { priority: filters.priority });
    }

    if (filters?.customerId) {
      query.andWhere('property.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.projectType) {
      query.andWhere('cv.projectType = :projectType', { projectType: filters.projectType });
    }

    if (filters?.fromDate) {
      query.andWhere('project.startDate >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      query.andWhere('project.endDate <= :toDate', { toDate: filters.toDate });
    }

    if (filters?.startDateFrom) {
      query.andWhere('project.startDate >= :startDateFrom', {
        startDateFrom: filters.startDateFrom,
      });
    }

    if (filters?.startDateTo) {
      query.andWhere('project.startDate <= :startDateTo', { startDateTo: filters.startDateTo });
    }

    if (filters?.endDateFrom) {
      query.andWhere('project.endDate >= :endDateFrom', { endDateFrom: filters.endDateFrom });
    }

    if (filters?.endDateTo) {
      query.andWhere('project.endDate <= :endDateTo', { endDateTo: filters.endDateTo });
    }

    // Health status filter — mirrors computeHealthStatus() logic in project.service.ts
    if (filters?.healthStatus === 'delayed') {
      query.andWhere("project.status NOT IN ('on_hold', 'completed', 'cancelled', 'planning')");
      query.andWhere('project.endDate IS NOT NULL');
      query.andWhere('project.endDate < CURRENT_DATE');
    } else if (filters?.healthStatus === 'at_risk') {
      query.andWhere("project.status NOT IN ('on_hold', 'completed', 'cancelled', 'planning')");
      query.andWhere('project.endDate IS NOT NULL');
      query.andWhere('project.endDate >= CURRENT_DATE');
      query.andWhere("project.endDate < CURRENT_DATE + INTERVAL '14 days'");
      query.andWhere('COALESCE(project.progressPercentage, 0) < 80');
    }

    if (filters?.memberId) {
      // Use a subquery to find projects that have the specified member.
      // We pass the parameter to the outer query so TypeORM can bind it correctly.
      query.andWhere(
        `project.id IN ${query
          .subQuery()
          .select('tm.project_id')
          .from('project_team_members', 'tm')
          .where('tm.user_id = :memberId')
          .getQuery()}`,
        { memberId: filters.memberId },
      );
    }

    if (filters?.createdBy) {
      query.andWhere('project.createdBy = :createdBy', { createdBy: filters.createdBy });
    }

    // Same predicate as the activeTicketCount mapping above, so the chip a row
    // shows and this filter can never disagree about what "active" means.
    if (filters?.hasActiveTickets !== undefined) {
      const activeTicketSubQuery = `
        SELECT 1 FROM service_tickets st
        WHERE st.project_id = project.id
          AND st.status IN (:...activeTicketFilterStatuses)
          AND st.deleted_at IS NULL
      `;
      query.andWhere(
        filters.hasActiveTickets
          ? `EXISTS (${activeTicketSubQuery})`
          : `NOT EXISTS (${activeTicketSubQuery})`,
        { activeTicketFilterStatuses: [...ACTIVE_TICKET_STATUSES] },
      );
    }

    const isSmartSort = filters?.sortBy === 'smartSort';
    const sortingUserId = filters?.memberId || filters?.currentUserId;
    const hasSortingUser = !!sortingUserId;

    if (isSmartSort && hasSortingUser) {
      query.leftJoin(
        (subQuery) =>
          subQuery
            .select('pt.project_id', 'project_id')
            .addSelect(
              "COUNT(pt.id) FILTER (WHERE pt.status != 'done' AND pt.end_date < CURRENT_DATE)",
              'overdue_count',
            )
            .addSelect("MIN(pt.end_date) FILTER (WHERE pt.status != 'done')", 'next_due_date')
            .addSelect(
              `MIN(CASE pt.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
                ELSE 5 
              END)`,
              'max_task_priority',
            )
            .from('project_tasks', 'pt')
            .where('pt.assigned_to_user_id = :sortingUserId')
            .andWhere('pt.deleted_at IS NULL')
            .groupBy('pt.project_id'),
        'member_tasks',
        'member_tasks.project_id = project.id',
        { sortingUserId },
      );

      query
        .addSelect('COALESCE(member_tasks.overdue_count, 0)', 'overdue_tasks')
        .addSelect('member_tasks.next_due_date', 'next_due')
        .addSelect(
          `CASE
            WHEN COALESCE(member_tasks.overdue_count, 0) > 0 THEN 1
            WHEN member_tasks.next_due_date = CURRENT_DATE THEN 2
            WHEN member_tasks.next_due_date > CURRENT_DATE AND member_tasks.next_due_date <= CURRENT_DATE + 7 THEN 3
            WHEN member_tasks.next_due_date > CURRENT_DATE + 7 THEN 4
            ELSE 5
          END`,
          'urgency_tier',
        )
        .addSelect('COALESCE(member_tasks.max_task_priority, 5)', 'max_task_priority')
        .addSelect(
          `CASE project.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            WHEN 'low' THEN 4 
            ELSE 5 
          END`,
          'priority_order',
        )
        .addSelect(
          `CASE 
            WHEN project.status IN ('on_hold', 'completed', 'cancelled', 'planning') THEN 3
            WHEN project.end_date IS NULL THEN 3
            WHEN project.end_date < CURRENT_DATE THEN 1
            WHEN project.end_date < CURRENT_DATE + 14 AND project.progress_percentage < 80 THEN 2
            ELSE 3
          END`,
          'health_order',
        );
    }

    if (filters?.pendingWorkflowStepId) {
      query.andWhere(
        `project.id IN ${query
          .subQuery()
          .select('pt.project_id')
          .from('project_tasks', 'pt')
          .where('pt.workflow_step_id = :pendingWorkflowStepId')
          .andWhere('pt.status != :completedStatus')
          .andWhere('pt.deleted_at IS NULL')
          .getQuery()}`,
        {
          pendingWorkflowStepId: filters.pendingWorkflowStepId,
          completedStatus: TaskStatus.DONE,
        },
      );
    }

    if (filters?.search) {
      query.andWhere(
        '(project.projectNumber ILIKE :search OR project.name ILIKE :search OR customer.firstName ILIKE :search OR customer.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const addressQuery = filters?.address?.trim();
    if (addressQuery) {
      query.andWhere(
        '(property.address ILIKE :address OR property.city ILIKE :address OR property.pincode ILIKE :address OR property.state ILIKE :address)',
        { address: `%${addressQuery}%` },
      );
    }

    const total = await query.getCount();

    if (isSmartSort && hasSortingUser) {
      query
        .orderBy('urgency_tier', 'ASC')
        .addOrderBy('max_task_priority', 'ASC')
        .addOrderBy('priority_order', 'ASC')
        .addOrderBy('health_order', 'ASC')
        .addOrderBy('next_due', 'ASC', 'NULLS LAST')
        .addOrderBy('project.endDate', 'ASC', 'NULLS LAST')
        .addOrderBy('project.createdAt', 'DESC');
    } else {
      // Sort with whitelist validation
      const sortColumn =
        ProjectRepository.SORT_WHITELIST[filters?.sortBy ?? ''] ?? 'project.createdAt';
      const sortOrder = filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC';
      query.orderBy(sortColumn, sortOrder);
    }

    const projects = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { projects, total };
  }

  /**
   * Contract and received totals (in rupees) for a list of projects.
   *
   * Reads `v_project_balance` rather than aggregating `payments` directly.
   * The previous implementation summed `payments.expected_amount`, which was a
   * plan figure DUPLICATED onto every receipt of a milestone — so two ₹25,000
   * receipts against one ₹50,000 milestone reported ₹100,000 expected and
   * ₹50,000 still pending on a fully-paid milestone.
   *
   * `expected_paise` also correctly excludes waived milestones, which the old
   * query had no concept of.
   */
  async getPaymentSummaries(projectIds: string[]): Promise<Map<string, ProjectPaymentSummary>> {
    if (projectIds.length === 0) return new Map();

    const results = await this.repository.manager.query<
      Array<{
        projectId: string;
        contractPaise: string;
        expectedPaise: string;
        receivedPaise: string;
        outstandingPaise: string;
      }>
    >(
      `SELECT project_id        AS "projectId",
              contract_paise    AS "contractPaise",
              expected_paise    AS "expectedPaise",
              received_paise    AS "receivedPaise",
              outstanding_paise AS "outstandingPaise"
         FROM v_project_balance
        WHERE project_id = ANY($1::uuid[])`,
      [projectIds],
    );

    const map = new Map<string, ProjectPaymentSummary>();
    for (const row of results) {
      map.set(row.projectId, {
        // callers expect rupees; paise is the authoritative unit in the ledger
        totalExpected: Number(row.expectedPaise) / 100,
        totalPaid: Number(row.receivedPaise) / 100,
        // The contract as it stands — quote plus every agreed change order.
        // The list used to show `cv.finalPrice` here, which is the ORIGINAL
        // quote, so a project with change orders reported one value in the list
        // and a different one on its own Money tab with nothing explaining the
        // gap. Both were right; they answered different questions under nearly
        // the same label.
        contractValue: Number(row.contractPaise) / 100,
        outstanding: Number(row.outstandingPaise) / 100,
      });
    }
    return map;
  }

  /**
   * Get task counts (completedTasks, totalTasks) for a list of project IDs.
   * Excludes soft-deleted tasks. totalTasks is all tasks; completedTasks is done only.
   */
  async getTaskCounts(
    projectIds: string[],
  ): Promise<Map<string, { completedTasks: number; totalTasks: number }>> {
    if (projectIds.length === 0) return new Map();

    const results = await this.repository.manager
      .createQueryBuilder()
      .select('task.project_id', 'projectId')
      .addSelect("COUNT(*) FILTER (WHERE task.status = 'done')", 'completedTasks')
      .addSelect('COUNT(*)', 'totalTasks')
      .from('project_tasks', 'task')
      .where('task.project_id IN (:...projectIds)', { projectIds })
      .andWhere('task.deleted_at IS NULL')
      .groupBy('task.project_id')
      .getRawMany<{ projectId: string; completedTasks: string; totalTasks: string }>();

    const map = new Map<string, { completedTasks: number; totalTasks: number }>();
    for (const row of results) {
      map.set(row.projectId, {
        completedTasks: parseInt(row.completedTasks, 10) || 0,
        totalTasks: parseInt(row.totalTasks, 10) || 0,
      });
    }
    return map;
  }

  /**
   * Update a project
   * Validates ownership via findById before updating
   */
  async update(id: string, updateData: Record<string, unknown>): Promise<ProjectEntity> {
    // First validate the project belongs to org via property
    await this.findById(id);

    await this.repository.update({ id }, updateData);
    return this.findById(id);
  }

  /**
   * Soft delete a project
   * Validates ownership via findById before deleting
   */
  async delete(id: string): Promise<void> {
    // Validate ownership first via property
    await this.findById(id);

    const result = await this.repository.softDelete({ id });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  /**
   * Update project status
   * Validates ownership via findById before updating
   */
  async updateStatus(id: string, status: ProjectStatus): Promise<ProjectEntity> {
    // Validate ownership first
    await this.findById(id);

    await this.repository.update({ id }, { status });
    return this.findById(id);
  }

  /**
   * Update project progress
   * Validates ownership via findById before updating
   */
  async updateProgress(id: string, progressPercentage: number): Promise<ProjectEntity> {
    // Validate ownership first
    const project = await this.findById(id);

    const updateData: Record<string, any> = { progressPercentage };
    if (
      progressPercentage === 100 &&
      project.status !== ProjectStatus.COMPLETED &&
      project.status !== ProjectStatus.CANCELLED
    ) {
      updateData.status = ProjectStatus.COMPLETED;
      if (!project.endDate) {
        updateData.endDate = new Date();
      }
    }

    await this.repository.update({ id }, updateData);
    return this.findById(id);
  }

  /**
   * Update progress by project ID only (no org ownership check).
   * Used internally by ProjectTaskService after task status changes.
   */
  async updateProgressById(
    projectId: string,
    progressPercentage: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepo(manager);
    const project = await repo.findOne({ where: { id: projectId } });

    if (project) {
      const updateData: Record<string, any> = { progressPercentage };
      if (
        progressPercentage === 100 &&
        project.status !== ProjectStatus.COMPLETED &&
        project.status !== ProjectStatus.CANCELLED
      ) {
        updateData.status = ProjectStatus.COMPLETED;
        if (!project.endDate) {
          updateData.endDate = new Date();
        }
      }
      await repo.update({ id: projectId }, updateData);
    }
  }

  /**
   * Find projects by customer
   * Filters via property.customerId
   */
  async findByCustomer(customerId: string): Promise<ProjectEntity[]> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', this.latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('property.customer', 'customer')
      .where('property.customerId = :customerId', { customerId })
      .andWhere('project.deletedAt IS NULL')
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find single project by property ID (for OneToOne check)
   * Returns null if no project exists for the property
   */
  async findOneByPropertyId(propertyId: string): Promise<ProjectEntity | null> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoin('project.property', 'property')
      .where('project.propertyId = :propertyId', { propertyId })
      .andWhere('project.deletedAt IS NULL')
      .getOne();
  }

  /**
   * Find all projects by property ID (for backward compatibility)
   * Note: With OneToOne constraint, this should return at most 1 project
   */
  async findAllByPropertyId(propertyId: string): Promise<ProjectEntity[]> {
    return this.repository
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.property', 'property')
      .innerJoinAndSelect('project.quote', 'quote')
      .leftJoinAndSelect('quote.versions', 'cv', this.latestVersionJoinCondition('quote'))
      .leftJoinAndSelect('property.customer', 'customer')
      .where('project.propertyId = :propertyId', { propertyId })
      .andWhere('project.deletedAt IS NULL')
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find the last project number for an organization (including soft-deleted)
   * Used for generating unique project numbers
   */
  async findLastProjectNumber(prefix: string): Promise<string | null> {
    const result = await this.repository
      .createQueryBuilder('project')
      .withDeleted() // Include soft-deleted projects for unique number generation
      .innerJoin('project.property', 'property')
      .select('project.projectNumber', 'projectNumber')
      .andWhere('project.projectNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('project.projectNumber', 'DESC')
      .limit(1)
      .getRawOne();

    return result?.projectNumber || null;
  }

  /**
   * Generate a unique project number (e.g. PRJ-ONEOHM-2026-0001)
   */
  async generateProjectNumber(orgCode: string, manager?: EntityManager): Promise<string> {
    return generateEntityCode(
      this.repository,
      'projectNumber',
      'PRJ',
      orgCode,
      'project_number',
      manager,
    );
  }

  private getRepo(manager?: EntityManager): Repository<ProjectEntity> {
    return manager ? manager.getRepository(ProjectEntity) : this.repository;
  }
}
