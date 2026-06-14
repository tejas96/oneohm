import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  type PaymentMilestone,
  ProjectPriority,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  TaskStatus,
} from '@oneohm-epc/shared/types';
import { DataSource, type EntityManager } from 'typeorm';

import { BomService } from '../../bom/services/bom.service';
import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import {
  CONSUMER_EVENTS,
  ProjectCompletedEvent,
  ProjectOnboardedEvent,
} from '../../notifications/events/consumer-notification.events';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { PaymentTermService } from '../../payment-terms/services/payment-term.service';
import { QuoteService } from '../../quotes/services/quote.service';
import { ConvertFromQuoteDto, UpdateProjectDto } from '../dto';
import { ProjectEntity } from '../entities/project.entity';
import {
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  WorkflowStepRepository,
} from '../repositories';

const PROJECT_CONSTANTS = {
  ALL_TASKS_LIMIT: 10000,
  KANBAN_ORDER_MULTIPLIER: 100,
} as const;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Project Service
 * Business logic for project management
 *
 * Note: organizationId and customerId are derived from property relation.
 * All projects require a valid propertyId.
 *
 * Business Rule: One property can have only one project (OneToOne relationship)
 */
@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly quoteService: QuoteService,
    private readonly customerPropertyRepository: CustomerPropertyRepository,
    private readonly workflowStepRepository: WorkflowStepRepository,
    private readonly taskRepository: ProjectTaskRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly bomService: BomService,
    @Inject(forwardRef(() => PaymentTermService))
    private readonly paymentTermService: PaymentTermService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find all projects with filters, computed fields, and payment summaries
   */
  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: ProjectStatus;
      priority?: ProjectPriority;
      customerId?: string;
      projectType?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
      memberId?: string;
      currentUserId?: string;
      pendingWorkflowStepId?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{
    projects: (ProjectEntity & {
      currentPhase: string | null;
      healthStatus: string | null;
      paymentSummary: { totalExpected: number; totalPaid: number };
      completedTasks: number;
      totalTasks: number;
      nextTask?: { id: string; name: string; code: string; endDate?: Date } | null;
      userOverdueTasks?: number;
    })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { projects, total } = await this.projectRepository.findAll(
      organizationId,
      page,
      limit,
      filters,
    );

    const projectIds = projects.map((p) => p.id);
    const paymentMap = await this.projectRepository.getPaymentSummaries(projectIds);
    const taskCountMap = await this.projectRepository.getTaskCounts(projectIds);

    const nextTaskMap = new Map<
      string,
      { id: string; name: string; code: string; endDate?: Date } | null
    >();
    const overdueTaskCountMap = new Map<string, number>();

    const sortingUserId = filters?.memberId || filters?.currentUserId;
    if (sortingUserId && projectIds.length > 0) {
      const incompleteTasks = await this.taskRepository.repository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.workflowStep', 'workflowStep')
        .where('task.projectId IN (:...projectIds)', { projectIds })
        .andWhere('task.assignedToUserId = :sortingUserId', { sortingUserId })
        .andWhere('task.status NOT IN (:...terminalStatuses)', {
          terminalStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
        })
        .andWhere('task.deletedAt IS NULL')
        .orderBy('task.endDate', 'ASC')
        .addOrderBy('task.createdAt', 'ASC')
        .getMany();

      for (const task of incompleteTasks) {
        if (!nextTaskMap.has(task.projectId)) {
          nextTaskMap.set(task.projectId, {
            id: task.id,
            name: task.nameOverride ?? task.workflowStep?.name ?? task.code,
            code: task.code,
            endDate: task.endDate,
          });
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const overdueCountRows = await this.taskRepository.repository
        .createQueryBuilder('task')
        .select('task.projectId', 'projectId')
        .addSelect('COUNT(task.id)', 'count')
        .where('task.projectId IN (:...projectIds)', { projectIds })
        .andWhere('task.assignedToUserId = :sortingUserId', { sortingUserId })
        .andWhere('task.status NOT IN (:...terminalStatuses)', {
          terminalStatuses: [TaskStatus.DONE, TaskStatus.CANCELLED],
        })
        .andWhere('task.endDate < :todayStr', { todayStr })
        .andWhere('task.deletedAt IS NULL')
        .groupBy('task.projectId')
        .getRawMany<{ projectId: string; count: string }>();

      for (const row of overdueCountRows) {
        overdueTaskCountMap.set(row.projectId, parseInt(row.count, 10) || 0);
      }
    }

    const enriched = await Promise.all(
      projects.map(async (project) => {
        const currentPhase = await this.computeCurrentPhaseFromTasks(project.id);
        const healthStatus = this.computeHealthStatus(project);
        const paymentSummary = paymentMap.get(project.id) ?? { totalExpected: 0, totalPaid: 0 };
        const taskCounts = taskCountMap.get(project.id) ?? { completedTasks: 0, totalTasks: 0 };

        const nextTask = nextTaskMap.get(project.id) ?? null;
        const userOverdueTasks = overdueTaskCountMap.get(project.id) ?? 0;

        return Object.assign(project, {
          currentPhase,
          healthStatus,
          paymentSummary,
          nextTask,
          userOverdueTasks,
          ...taskCounts,
        });
      }),
    );

    return { projects: enriched, total, page, limit };
  }

  /**
   * Find project by ID
   */
  async findById(id: string, organizationId: string): Promise<ProjectEntity> {
    return this.projectRepository.findById(id, organizationId);
  }

  /**
   * Update a project
   * Note: propertyId and quoteId cannot be changed after creation.
   * actualCost is routed to metadata.actualCost.
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateProjectDto,
    updatedBy: string,
  ): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(id, organizationId);

    // Warehouse-lock guard: once any active (non-cancelled) stock allocation exists for
    // this project, the defaultWarehouseId cannot be changed. Changing it mid-allocation
    // would split allocations across two warehouses, breaking dispatch.
    if (
      updateDto.defaultWarehouseId !== undefined &&
      updateDto.defaultWarehouseId !== project.defaultWarehouseId
    ) {
      const { StockAllocationEntity } = await import(
        '../../inventory/entities/stock-allocation.entity'
      );
      const { StockAllocationStatus } = await import('@oneohm-epc/shared/types');
      const activeAllocCount = await this.dataSource.getRepository(StockAllocationEntity).count({
        where: {
          projectId: id,
          status: (await import('typeorm')).Not(StockAllocationStatus.CANCELLED),
        },
      });
      if (activeAllocCount > 0) {
        throw new ConflictException(
          'Cannot change default warehouse while active stock allocations exist. Cancel all allocations first.',
        );
      }
    }

    const { actualCost, metadata: incomingMetadata, ...safeDto } = updateDto;

    const updateData: Record<string, unknown> = {
      ...safeDto,
      updatedBy,
      startDate: safeDto.startDate ? new Date(safeDto.startDate) : undefined,
      endDate: safeDto.endDate ? new Date(safeDto.endDate) : undefined,
    };

    if (actualCost !== undefined || incomingMetadata !== undefined) {
      updateData.metadata = {
        ...project.metadata,
        ...(incomingMetadata ?? {}),
        ...(actualCost !== undefined ? { actualCost } : {}),
      };
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return this.projectRepository.update(id, organizationId, updateData);
  }

  /**
   * Delete a project
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const project = await this.projectRepository.findById(id, organizationId);

    if (project.status !== ProjectStatus.PLANNING && project.status !== ProjectStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot delete project with status ${project.status}. Only planning or cancelled projects can be deleted.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ProjectEntity).softDelete({ id });
      await this.customerPropertyRepository.updateStatusById(
        project.propertyId,
        PropertyStatus.ACTIVE,
        manager,
      );
    });
  }

  /**
   * Update project status with validation
   */
  async updateStatus(
    id: string,
    organizationId: string,
    newStatus: ProjectStatus,
  ): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(id, organizationId);

    // Validate status transition
    this.validateStatusTransition(project.status, newStatus);

    if (newStatus === ProjectStatus.COMPLETED) {
      const { done, total } = await this.taskRepository.computeProgress(id);
      if (done < total) {
        throw new BadRequestException(
          `Cannot mark project as completed. There are still active tasks that are not done (${done}/${total} completed).`,
        );
      }
    }

    // Update dates based on status
    const updateData: Record<string, unknown> = { status: newStatus };

    // Set startDate when project starts if not already set
    if (newStatus === ProjectStatus.ACTIVE && !project.startDate) {
      updateData.startDate = new Date();
    }

    // Set endDate and mark as 100% when completed
    if (newStatus === ProjectStatus.COMPLETED && !project.endDate) {
      updateData.endDate = new Date();
      updateData.progressPercentage = 100;
    }

    await this.projectRepository.update(id, organizationId, updateData);
    const updatedProject = await this.projectRepository.findById(id, organizationId);

    // Notify consumer when project is completed (manual status change)
    if (newStatus === ProjectStatus.COMPLETED) {
      this.logger.debug(
        `Project status changed to COMPLETED. Emitting CONSUMER_EVENTS.PROJECT_COMPLETED event. orgId=${organizationId}, projectId=${id}, propertyId=${updatedProject.propertyId}, projectName=${updatedProject.name}`,
      );
      this.eventEmitter.emit(
        CONSUMER_EVENTS.PROJECT_COMPLETED,
        new ProjectCompletedEvent(
          organizationId,
          id,
          updatedProject.propertyId,
          updatedProject.name,
        ),
      );
    }

    return updatedProject;
  }

  /**
   * Calculate and update project progress based on task completion ratio.
   * Cancelled tasks are excluded from both numerator and denominator.
   */
  async calculateProgress(id: string, organizationId: string): Promise<ProjectEntity> {
    const { done, total } = await this.taskRepository.computeProgress(id);
    const progress = total > 0 ? Math.round((100 * done) / total) : 0;

    await this.projectRepository.update(id, organizationId, {
      progressPercentage: progress,
    });

    return this.projectRepository.findById(id, organizationId);
  }

  /**
   * Find projects by customer
   */
  async findByCustomer(customerId: string, organizationId: string): Promise<ProjectEntity[]> {
    return this.projectRepository.findByCustomer(customerId, organizationId);
  }

  /**
   * Convert a quote to a project (full orchestrated flow, transactional)
   *
   * Steps:
   * 1. Validate quote (must be ACCEPTED with propertyId)
   * 2. Check OneToOne constraint (property -> project)
   * 3. Create project record
   * 4. Set property status to CONVERTED
   * 5. Create milestones from quote payment terms
   * 6. Apply workflow steps (filtering excluded)
   * 7. Link tasks to milestones via step.defaultMilestoneType
   * 8. Add PM + team members if provided
   * 9. Apply explicit task assignments from API payload
   */
  async convertFromQuote(
    quoteId: string,
    organizationId: string,
    createdBy: string,
    convertDto?: ConvertFromQuoteDto,
  ): Promise<ProjectEntity> {
    const quote = await this.quoteService.findById(quoteId, organizationId);

    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Only accepted quotes can be converted to projects');
    }

    if (!quote.propertyId) {
      throw new BadRequestException(
        'Cannot convert quote to project: Quote must have a property assigned',
      );
    }

    const property = await this.customerPropertyRepository.findByIdAndOrganization(
      quote.propertyId,
      organizationId,
    );
    if (!property) {
      throw new NotFoundException(
        `Property with ID ${quote.propertyId} not found in this organization`,
      );
    }
    if (property.status === PropertyStatus.CONVERTED) {
      throw new BadRequestException(
        'This property has already been converted to a project. Cannot create another.',
      );
    }

    const existingProject = await this.projectRepository.findOneByPropertyId(
      quote.propertyId,
      organizationId,
    );
    if (existingProject) {
      throw new BadRequestException(
        `Property already has a project (${existingProject.projectNumber}). One property can only have one project.`,
      );
    }

    const org = await this.organizationRepository.findOneById(organizationId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const latestVersion =
      [...(quote.versions ?? [])].sort((a, b) => {
        const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (createdDiff !== 0) return createdDiff;
        return b.versionNumber - a.versionNumber;
      })[0] ?? null;

    const customerName =
      property?.consumerName ||
      `${quote.customer.firstName} ${quote.customer.lastName || ''}`.trim() ||
      'Customer';
    const actualKw = latestVersion?.totalWattageWp
      ? Number(latestVersion.totalWattageWp) / 1000
      : latestVersion?.systemSizeKw;
    const actualKwFormatted = actualKw != null ? parseFloat(Number(actualKw).toFixed(2)) : '';
    const autoName =
      `${customerName} - ${actualKwFormatted ? `${actualKwFormatted}kW ` : ''}Solar Installation`.trim();
    const paymentMilestones: PaymentMilestone[] = latestVersion?.paymentMilestones || [];

    // Build milestone list: prefer explicit input, else derive names from payment milestone names
    const milestones: Array<{ name: string; order: number }> = convertDto?.milestones?.length
      ? convertDto.milestones.map((m) => ({ name: m.name, order: m.order }))
      : paymentMilestones.map((pm, i) => ({
          name: pm.name,
          order: pm.order || i + 1,
        }));

    const project = await this.orchestrateProjectCreation({
      projectData: {
        propertyId: quote.propertyId,
        quoteId,
        name: convertDto?.name || autoName,
        description:
          convertDto?.description ||
          `Solar installation project converted from quote ${quote.quoteNumber}`,
        status: ProjectStatus.ACTIVE,
        priority: convertDto?.priority || ProjectPriority.NORMAL,
        progressPercentage: 0,
        startDate: convertDto?.startDate ? new Date(convertDto.startDate) : undefined,
        endDate: convertDto?.endDate ? new Date(convertDto.endDate) : undefined,
        taskStatuses: convertDto?.taskStatuses?.length ? convertDto.taskStatuses : undefined,
      },
      propertyId: quote.propertyId,
      organizationId,
      orgCode: org.code,
      createdBy,
      milestones,
      teamConfig: convertDto
        ? { pmId: convertDto.projectManagerId, members: convertDto.teamMembers }
        : undefined,
      excludedStepIds: convertDto?.excludedStepIds,
      taskAssignments: convertDto?.taskAssignments,
      taskMilestoneOverrides: convertDto?.taskMilestoneOverrides,
      paymentTermSnapshot: {
        sourceVersionId: latestVersion?.id ?? null,
        milestones: paymentMilestones,
      },
    });

    // Copy BOM from quote version to project
    await this.copyQuoteBomToProject(organizationId, latestVersion?.id, project.id, createdBy);

    // Notify consumer about project onboarding (fire-and-forget)
    this.eventEmitter.emit(
      CONSUMER_EVENTS.PROJECT_ONBOARDED,
      new ProjectOnboardedEvent(
        organizationId,
        project.id,
        project.propertyId,
        project.name,
        project.projectNumber,
      ),
    );

    return project;
  }

  /**
   * Get project timeline data for Gantt visualization
   * Returns tasks with their dates, dependencies, and status
   */
  async getProjectTimeline(
    projectId: string,
    organizationId: string,
  ): Promise<{
    project: { id: string; name: string; startDate?: Date; endDate?: Date };
    tasks: Array<{
      id: string;
      name: string;
      code: string;
      status: TaskStatus;
      startDate?: Date;
      endDate?: Date;
      dependsOnTaskIds: string[];
      assignedToUserId?: string;
      completionPercentage: number;
    }>;
    milestones: Array<Record<string, never>>;
  }> {
    const project = await this.findById(projectId, organizationId);

    // Get all tasks for timeline (get all tasks without pagination)
    const { data: tasks } = await this.taskRepository.findAll(
      projectId,
      1,
      PROJECT_CONSTANTS.ALL_TASKS_LIMIT,
      {},
    );

    return {
      project: {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      tasks: tasks.map((task) => ({
        id: task.id,
        name: task.name ?? task.nameOverride ?? task.code,
        code: task.code,
        status: task.status,
        startDate: task.startDate,
        endDate: task.endDate,
        dependsOnTaskIds: task.dependsOnTaskIds || [],
        assignedToUserId: task.assignedToUserId,
        completionPercentage: task.completionPercentage || 0,
      })),
      milestones: [],
    };
  }

  /**
   * Get project progress statistics
   */
  async getProjectProgress(
    projectId: string,
    organizationId: string,
  ): Promise<{
    totalTasks: number;
    statusCounts: Record<TaskStatus, number>;
    completionPercentage: number;
    overdueTasksCount: number;
    blockedTasksCount: number;
    upcomingDeadlines: Array<{ id: string; name: string; endDate: Date }>;
  }> {
    const project = await this.findById(projectId, organizationId);

    // Get task statistics - returns Record<TaskStatus, number>
    const statusCounts = await this.taskRepository.countByStatus(projectId);

    // Calculate total tasks from status counts
    const totalTasks = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    // Get overdue tasks count
    const overdueTasks = await this.taskRepository.findOverdue(projectId);

    // Get upcoming deadlines (next 7 days)
    const upcomingTasks = await this.taskRepository.findUpcomingDeadlines(projectId, 7);

    return {
      totalTasks,
      statusCounts,
      completionPercentage: project.progressPercentage,
      overdueTasksCount: overdueTasks.length,
      blockedTasksCount: statusCounts[TaskStatus.BLOCKED] || 0,
      upcomingDeadlines: upcomingTasks.map((task) => ({
        id: task.id,
        name: task.name ?? task.nameOverride ?? task.code,
        endDate: task.endDate!,
      })),
    };
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: ProjectStatus, newStatus: ProjectStatus): void {
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.ACTIVE]: [
        ProjectStatus.ON_HOLD,
        ProjectStatus.COMPLETED,
        ProjectStatus.CANCELLED,
      ],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.COMPLETED]: [ProjectStatus.ACTIVE],
      [ProjectStatus.CANCELLED]: [ProjectStatus.ACTIVE],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`,
      );
    }
  }

  private computeCurrentPhase(project: ProjectEntity): string | null {
    // Current phase is now derived async from tasks; this synchronous helper is no longer used.
    // Callers should use computeCurrentPhaseFromTasks instead.
    void project;
    return null;
  }

  /**
   * Derive current phase from tasks: the milestone group with lowest order
   * that still has any non-done, non-cancelled task.
   */
  async computeCurrentPhaseFromTasks(projectId: string): Promise<string | null> {
    const allTasks = await this.taskRepository.findAllForBoard(projectId);
    const terminalStatuses = new Set([TaskStatus.DONE, TaskStatus.CANCELLED]);

    const activeTasks = allTasks.filter((t) => !terminalStatuses.has(t.status) && t.milestoneName);

    if (activeTasks.length === 0) return null;

    activeTasks.sort((a, b) => {
      const orderA = a.milestoneOrder ?? 9999;
      const orderB = b.milestoneOrder ?? 9999;
      return orderA - orderB;
    });

    return activeTasks[0]?.milestoneName ?? null;
  }

  private computeHealthStatus(project: ProjectEntity): 'on_track' | 'at_risk' | 'delayed' | null {
    const inactiveStatuses = [
      ProjectStatus.ON_HOLD,
      ProjectStatus.COMPLETED,
      ProjectStatus.CANCELLED,
      ProjectStatus.PLANNING,
    ];
    if (inactiveStatuses.includes(project.status)) return null;
    if (!project.endDate) return 'on_track';

    const now = new Date();
    const due = new Date(project.endDate);

    if (due < now) return 'delayed';

    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    if (due.getTime() - now.getTime() < fourteenDaysMs && project.progressPercentage < 80) {
      return 'at_risk';
    }

    return 'on_track';
  }

  /**
   * Generate unique project number using centralized code generator
   */
  private async generateProjectNumber(orgCode: string, manager?: EntityManager): Promise<string> {
    return this.projectRepository.generateProjectNumber(orgCode, manager);
  }

  /**
   * Detect dependency cycles among workflow steps via topological sort.
   * Logs a warning if cycles are found but does not block execution.
   */
  private detectDependencyCycles(
    steps: { code: string; dependsOnTaskCodes?: string[] | null }[],
  ): void {
    const codeSet = new Set(steps.map((s) => s.code));
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const s of steps) {
      adjList.set(s.code, []);
      inDegree.set(s.code, 0);
    }

    for (const s of steps) {
      if (s.dependsOnTaskCodes) {
        for (const dep of s.dependsOnTaskCodes) {
          if (!codeSet.has(dep)) {
            this.logger.warn(`Step "${s.code}" depends on missing code "${dep}" — skipping dep`);
            continue;
          }
          adjList.get(dep)!.push(s.code);
          inDegree.set(s.code, (inDegree.get(s.code) || 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [code, deg] of inDegree) {
      if (deg === 0) queue.push(code);
    }

    let visited = 0;
    while (queue.length > 0) {
      const node = queue.shift()!;
      visited++;
      for (const neighbor of adjList.get(node) || []) {
        const newDeg = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (visited < steps.length) {
      this.logger.warn(
        `Dependency cycle detected among workflow steps — proceeding without dependency links for cycled nodes`,
      );
    }
  }

  /**
   * Shared orchestration for project creation (quote conversion flow).
   * Wrapped in a database transaction for atomicity.
   */
  private async orchestrateProjectCreation(params: {
    projectData: Partial<ProjectEntity>;
    propertyId: string;
    organizationId: string;
    orgCode: string;
    createdBy: string;
    milestones: Array<{ name: string; order: number }>;
    teamConfig?: {
      pmId?: string;
      members?: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
    };
    excludedStepIds?: string[];
    taskAssignments?: Array<{ workflowStepId: string; assignedToUserId: string }>;
    taskMilestoneOverrides?: Array<{
      workflowStepId: string;
      milestoneName: string | null;
      milestoneOrder: number | null;
    }>;
    paymentTermSnapshot?: {
      sourceVersionId: string | null;
      milestones: PaymentMilestone[] | null | undefined;
    };
  }): Promise<ProjectEntity> {
    const {
      projectData,
      propertyId,
      organizationId,
      orgCode,
      createdBy,
      milestones,
      teamConfig,
      excludedStepIds,
      taskAssignments,
      taskMilestoneOverrides,
      paymentTermSnapshot,
    } = params;

    // Build a lookup from milestone name → order for fast override resolution
    const milestoneNameToOrder = new Map<string, number>(milestones.map((m) => [m.name, m.order]));

    return this.dataSource.transaction(async (manager) => {
      // 1. Generate project number inside transaction to avoid race conditions
      if (!projectData.projectNumber) {
        projectData.projectNumber = await this.generateProjectNumber(orgCode, manager);
      }

      // 2. Create project
      const project = await this.projectRepository.create({ ...projectData, createdBy }, manager);

      // 3. Update property to CONVERTED
      await this.customerPropertyRepository.updateStatusById(
        propertyId,
        PropertyStatus.CONVERTED,
        manager,
      );

      // 4. Set excluded steps on project
      await this.projectRepository.updateById(
        project.id,
        { excludedStepIds: excludedStepIds ?? [] },
        manager,
      );

      // 5. Apply workflow steps — milestone fields are set directly on each task
      await this.applyWorkflowStepsWithMilestones(
        project.id,
        organizationId,
        createdBy,
        milestoneNameToOrder,
        taskMilestoneOverrides ?? [],
        excludedStepIds,
        project.startDate,
        manager,
      );

      // 6. Add PM + team members
      await this.addTeamMembers(project.id, teamConfig, manager);

      // 7. Apply explicit task assignments from API payload (sole assignment path)
      await this.applyTaskAssignments(project.id, taskAssignments ?? [], manager);

      // 8. Compute initial progress
      const { done, total } = await this.taskRepository.computeProgress(project.id, manager);
      const progress = total > 0 ? Math.round((100 * done) / total) : 0;
      await this.projectRepository.updateById(
        project.id,
        { progressPercentage: progress },
        manager,
      );

      // 9. Snapshot payment terms from the source quote version (plan §11).
      // Idempotent — no-op if any term already exists for the project.
      // Failure here rolls back the entire project-creation transaction.
      if (paymentTermSnapshot) {
        await this.paymentTermService.snapshotFromQuoteVersion({
          projectId: project.id,
          sourceVersionId: paymentTermSnapshot.sourceVersionId,
          milestones: paymentTermSnapshot.milestones,
          organizationId,
          createdBy,
          manager,
        });
      }

      return this.projectRepository.findById(project.id, organizationId, manager);
    });
  }

  /**
   * Apply workflow steps to a new project, setting milestone_name and milestone_order
   * directly on each task. Overrides from the wizard take precedence over step defaults.
   */
  private async applyWorkflowStepsWithMilestones(
    projectId: string,
    organizationId: string,
    createdBy: string,
    milestoneNameToOrder: Map<string, number>,
    taskMilestoneOverrides: Array<{
      workflowStepId: string;
      milestoneName: string | null;
      milestoneOrder: number | null;
    }>,
    excludedStepIds?: string[],
    projectStartDate?: Date,
    manager?: EntityManager,
  ): Promise<void> {
    let steps = await this.workflowStepRepository.findAllActive(organizationId, manager);

    if (steps.length === 0) return;

    if (excludedStepIds && excludedStepIds.length > 0) {
      const excludeSet = new Set(excludedStepIds);
      steps = steps.filter((s) => !excludeSet.has(s.id));
    }

    if (steps.length === 0) return;

    this.detectDependencyCycles(steps);

    const org = await this.organizationRepository.findOneById(organizationId);
    const orgCode = org?.code || 'UNKNOWN';

    // Build override lookup keyed by workflowStepId
    const overrideMap = new Map(taskMilestoneOverrides.map((o) => [o.workflowStepId, o]));

    const codeToTaskId = new Map<string, string>();
    const baseDate = projectStartDate ? new Date(projectStartDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    for (const step of steps) {
      let taskCode: string;
      try {
        taskCode = await this.taskRepository.generateTaskCode(orgCode, manager);
      } catch {
        taskCode = step.code;
      }

      const override = overrideMap.get(step.id);

      // Resolve milestone name: explicit override wins, then step default
      let milestoneName: string | null = null;
      let milestoneOrder: number | null = null;

      if (override !== undefined) {
        milestoneName = override.milestoneName;
        milestoneOrder =
          override.milestoneOrder ??
          (milestoneName ? (milestoneNameToOrder.get(milestoneName) ?? null) : null);
      } else {
        milestoneName = step.defaultMilestoneName ?? null;
        milestoneOrder =
          step.defaultMilestoneOrder ??
          (milestoneName ? (milestoneNameToOrder.get(milestoneName) ?? null) : null);
      }

      const task = await this.taskRepository.create(
        {
          projectId,
          workflowStepId: step.id,
          code: taskCode,
          kanbanOrder: step.sequenceOrder * PROJECT_CONSTANTS.KANBAN_ORDER_MULTIPLIER,
          endDate: step.effortDays != null ? addDays(baseDate, step.effortDays) : undefined,
          status: TaskStatus.BACKLOG,
          milestoneName,
          milestoneOrder,
          createdBy,
          updatedBy: createdBy,
        },
        manager,
      );

      codeToTaskId.set(step.code, task.id);
    }

    // Wire up task dependencies
    for (const step of steps) {
      if (step.dependsOnTaskCodes && step.dependsOnTaskCodes.length > 0) {
        const taskId = codeToTaskId.get(step.code);
        if (!taskId) continue;

        const dependsOnTaskIds: string[] = [];
        for (const depCode of step.dependsOnTaskCodes) {
          const depTaskId = codeToTaskId.get(depCode);
          if (depTaskId) {
            dependsOnTaskIds.push(depTaskId);
          } else {
            this.logger.warn(
              `Task dependency resolution: code "${depCode}" not found for step "${step.code}"`,
            );
          }
        }

        if (dependsOnTaskIds.length > 0) {
          await this.taskRepository.updateById(taskId, { dependsOnTaskIds }, manager);
        }
      }
    }
  }

  private async addTeamMembers(
    projectId: string,
    teamConfig?: {
      pmId?: string;
      members?: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
    },
    manager?: EntityManager,
  ): Promise<void> {
    if (teamConfig?.pmId) {
      const existing = await this.teamRepository.findOneByUserAndProject(
        teamConfig.pmId,
        projectId,
        manager,
      );
      if (!existing) {
        await this.teamRepository.create(
          {
            projectId,
            userId: teamConfig.pmId,
            roleName: 'Project Manager',
            isProjectManager: true,
          },
          manager,
        );
      }
    }

    if (teamConfig?.members) {
      for (const member of teamConfig.members) {
        const existing = await this.teamRepository.findOneByUserAndProject(
          member.userId,
          projectId,
          manager,
        );
        if (existing) continue;
        await this.teamRepository.create(
          {
            projectId,
            userId: member.userId,
            roleName: member.roleName,
            isProjectManager: member.isProjectManager ?? false,
          },
          manager,
        );
      }
    }
  }

  private async applyTaskAssignments(
    projectId: string,
    assignments: Array<{ workflowStepId: string; assignedToUserId: string }>,
    manager: EntityManager,
  ): Promise<void> {
    if (assignments.length === 0) return;

    const seenStepIds = new Set<string>();
    for (const a of assignments) {
      if (seenStepIds.has(a.workflowStepId)) {
        throw new BadRequestException(
          `Duplicate task assignment for workflow step ${a.workflowStepId}`,
        );
      }
      seenStepIds.add(a.workflowStepId);
    }

    const tasks = await this.taskRepository.findByProjectRaw(projectId, undefined, manager);
    const teamMembers = await this.teamRepository.findByProject(projectId, manager);
    const teamUserIds = new Set(teamMembers.map((m) => m.userId));

    for (const assignment of assignments) {
      if (!teamUserIds.has(assignment.assignedToUserId)) {
        throw new BadRequestException(
          `Cannot assign task: user ${assignment.assignedToUserId} is not a team member of this project`,
        );
      }

      const task = tasks.find((t) => t.workflowStepId === assignment.workflowStepId);
      if (!task) {
        this.logger.warn(
          `Task assignment skipped: no task found for workflow step ${assignment.workflowStepId} in project ${projectId}`,
        );
        continue;
      }

      await this.taskRepository.updateById(
        task.id,
        { assignedToUserId: assignment.assignedToUserId },
        manager,
      );
    }
  }

  /**
   * Sync (rebuild) the project BOM from the quote snapshot.
   * Uses the calculation data persisted in quote_snapshot.calculation to regenerate
   * the project BOM via BomService.createFromCalculation.
   * Idempotent: deletes any existing project BOM before recreating.
   */
  async syncBomFromSnapshot(
    organizationId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findById(projectId, organizationId);

    const quote = await this.quoteService.findById(project.quoteId, organizationId);

    const latestVersion =
      [...(quote.versions ?? [])].sort((a, b) => {
        const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (createdDiff !== 0) return createdDiff;
        return b.versionNumber - a.versionNumber;
      })[0] ?? null;

    if (!latestVersion?.quoteSnapshot?.calculation) {
      throw new BadRequestException(
        'Cannot sync BOM: quote has no calculation snapshot. Please re-calculate the quote first.',
      );
    }

    const calculation = latestVersion.quoteSnapshot
      .calculation as import('../../quotes/dto/calculator/calculate-quote-response.dto').CalculateQuoteResponseDto;

    // Non-destructive reconcile: diffs existing BOM rather than delete+create.
    // If no project BOM exists yet, this creates it from the calculation.
    const reconcileResult = await this.bomService.reconcileFromCalculation(
      organizationId,
      projectId,
      calculation,
      userId,
    );

    this.logger.log(
      `Reconciled BOM for project ${projectId} from quote version ${latestVersion.id} ` +
        `(added: ${reconcileResult.added.length}, removed: ${reconcileResult.removed.length}, ` +
        `increased: ${reconcileResult.increased.length}, decreased: ${reconcileResult.decreased.length})`,
    );
  }

  /**
   * Copy BOM from quote version to project.
   * This ensures project has its own BOM for stock allocation.
   * If quote version has no BOM or copying fails, log warning but don't block project creation.
   */
  private async copyQuoteBomToProject(
    organizationId: string,
    quoteVersionId: string | undefined,
    projectId: string,
    createdBy: string,
  ): Promise<void> {
    if (!quoteVersionId) {
      this.logger.warn(`Project ${projectId}: No quote version ID available, skipping BOM copy`);
      return;
    }

    try {
      // Check if project already has a BOM (idempotency)
      const existingProjectBom = await this.bomService.findByEntity(
        organizationId,
        'project',
        projectId,
      );
      if (existingProjectBom) {
        this.logger.debug(`Project ${projectId} already has BOM ${existingProjectBom.bomNumber}`);
        return;
      }

      // Find quote version BOM
      const quoteBom = await this.bomService.findByEntity(
        organizationId,
        'quote_version',
        quoteVersionId,
      );

      if (!quoteBom) {
        this.logger.warn(
          `Project ${projectId}: No BOM found for quote version ${quoteVersionId}, skipping BOM copy`,
        );
        return;
      }

      const clonedItems = (quoteBom.items || []).map((item) => ({
        itemType: item.itemType,
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        specifications: item.specifications ?? {},
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: Number(item.unitPrice ?? 0),
        totalPrice: Number(item.totalPrice ?? 0),
        gstRate: Number(item.gstRate ?? 0),
        gstAmount: Number(item.gstAmount ?? 0),
        warrantyYears: item.warrantyYears,
        serialNumber: undefined,
        groupKey: item.groupKey,
        unitIndex: item.unitIndex,
        sortOrder: item.sortOrder,
      }));

      await this.bomService.createFromItems(
        organizationId,
        'project',
        projectId,
        clonedItems,
        createdBy,
      );

      this.logger.log(
        `Successfully copied BOM from quote version ${quoteVersionId} to project ${projectId}`,
      );
    } catch (error) {
      // Log error but don't fail project creation
      this.logger.error(
        `Failed to copy BOM from quote version ${quoteVersionId} to project ${projectId}: ${(error as Error).message}`,
      );
    }
  }
}
