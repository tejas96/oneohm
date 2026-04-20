import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  type MilestoneType,
  MilestoneStatus,
  type PaymentMilestone,
  ProjectPriority,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  TaskStatus,
} from '@oneohm-epc/shared/types';
import { DataSource, type EntityManager } from 'typeorm';

import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { QuoteService } from '../../quotes/services/quote.service';
import { ConvertFromQuoteDto, UpdateProjectDto } from '../dto';
import { ProjectEntity } from '../entities/project.entity';
import {
  MilestoneRepository,
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  WorkflowStepRepository,
} from '../repositories';
const STAGE_TO_MILESTONE_TYPE: Record<string, MilestoneType> = {
  material_procurement: 'material_procurement' as MilestoneType,
  installation_start: 'installation' as MilestoneType,
  installation_complete: 'installation' as MilestoneType,
  commissioning: 'commissioning' as MilestoneType,
  net_metering: 'handover' as MilestoneType,
};

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
    private readonly milestoneRepository: MilestoneRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly quoteService: QuoteService,
    private readonly customerPropertyRepository: CustomerPropertyRepository,
    private readonly workflowStepRepository: WorkflowStepRepository,
    private readonly taskRepository: ProjectTaskRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly dataSource: DataSource,
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
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<{
    projects: (ProjectEntity & {
      currentPhase: string | null;
      healthStatus: string | null;
      paymentSummary: { totalExpected: number; totalPaid: number };
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

    const enriched = projects.map((project) => {
      const currentPhase = this.computeCurrentPhase(project);
      const healthStatus = this.computeHealthStatus(project);
      const paymentSummary = paymentMap.get(project.id) ?? { totalExpected: 0, totalPaid: 0 };

      return Object.assign(project, { currentPhase, healthStatus, paymentSummary });
    });

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

    if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot delete project with status ${project.status}. Only draft or cancelled projects can be deleted.`,
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

    // Update dates based on status
    const updateData: Record<string, unknown> = { status: newStatus };

    // Set startDate when project starts if not already set
    if (newStatus === ProjectStatus.IN_PROGRESS && !project.startDate) {
      updateData.startDate = new Date();
    }

    // Set endDate and mark as 100% when completed
    if (newStatus === ProjectStatus.COMPLETED && !project.endDate) {
      updateData.endDate = new Date();
      updateData.progressPercentage = 100;
    }

    await this.projectRepository.update(id, organizationId, updateData);
    return this.projectRepository.findById(id, organizationId);
  }

  /**
   * Calculate and update project progress based on milestones
   */
  async calculateProgress(id: string, organizationId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(id, organizationId);
    const milestones = await this.milestoneRepository.findByProject(project.id);

    if (milestones.length === 0) {
      return project;
    }

    // Calculate average progress from all milestones
    const totalProgress = milestones.reduce(
      (sum, milestone) => sum + milestone.progressPercentage,
      0,
    );
    const averageProgress = Math.round(totalProgress / milestones.length);

    await this.projectRepository.update(id, organizationId, {
      progressPercentage: averageProgress,
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
    const autoName =
      `${customerName} - ${latestVersion?.systemSizeKw ?? ''}kW Solar Installation`.trim();
    const paymentMilestones: PaymentMilestone[] = latestVersion?.paymentMilestones || [];

    const milestones = convertDto?.milestones?.length
      ? convertDto.milestones.map((m) => ({
          name: m.name,
          type: m.type as MilestoneType,
          order: m.order,
        }))
      : paymentMilestones.map((pm, i) => ({
          name: pm.name,
          type: STAGE_TO_MILESTONE_TYPE[pm.stage] || ('custom' as MilestoneType),
          order: pm.order || i + 1,
        }));

    return this.orchestrateProjectCreation({
      projectData: {
        propertyId: quote.propertyId,
        quoteId,
        name: convertDto?.name || autoName,
        description:
          convertDto?.description ||
          `Solar installation project converted from quote ${quote.quoteNumber}`,
        status: ProjectStatus.DRAFT,
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
    });
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
    milestones: Array<{
      id: string;
      name: string;
      dueDate?: Date;
      status: string;
    }>;
  }> {
    const project = await this.findById(projectId, organizationId);

    // Get all tasks for timeline (get all tasks without pagination)
    const { data: tasks } = await this.taskRepository.findAll(
      projectId,
      1,
      PROJECT_CONSTANTS.ALL_TASKS_LIMIT,
      {},
    );

    // Get milestones
    const milestones = await this.milestoneRepository.findByProject(projectId);

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
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        dueDate: m.endDate,
        status: m.status,
      })),
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
      [ProjectStatus.DRAFT]: [ProjectStatus.PLANNING, ProjectStatus.CANCELLED],
      [ProjectStatus.PLANNING]: [
        ProjectStatus.APPROVED,
        ProjectStatus.DRAFT,
        ProjectStatus.CANCELLED,
      ],
      [ProjectStatus.APPROVED]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
      [ProjectStatus.IN_PROGRESS]: [
        ProjectStatus.TESTING,
        ProjectStatus.COMPLETED,
        ProjectStatus.ON_HOLD,
        ProjectStatus.CANCELLED,
      ],
      [ProjectStatus.TESTING]: [ProjectStatus.COMPLETED, ProjectStatus.IN_PROGRESS],
      [ProjectStatus.COMPLETED]: [],
      [ProjectStatus.CANCELLED]: [],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
    };

    const allowed = validTransitions[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`,
      );
    }
  }

  private computeCurrentPhase(project: ProjectEntity): string | null {
    if (!project.milestones || project.milestones.length === 0) return null;

    const inProgress = project.milestones.find((m) => m.status === MilestoneStatus.IN_PROGRESS);
    if (inProgress) return inProgress.milestoneType;

    const latest = [...project.milestones].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return latest[0]?.milestoneType ?? null;
  }

  private computeHealthStatus(project: ProjectEntity): 'on_track' | 'at_risk' | 'delayed' | null {
    const inactiveStatuses = [
      ProjectStatus.ON_HOLD,
      ProjectStatus.COMPLETED,
      ProjectStatus.CANCELLED,
      ProjectStatus.DRAFT,
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
   * Auto-apply active workflow steps to a project.
   * Filters out excluded templates, detects dependency cycles, and resolves dependencies.
   */
  private async applyWorkflowSteps(
    projectId: string,
    organizationId: string,
    createdBy: string,
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

      const task = await this.taskRepository.create(
        {
          projectId,
          workflowStepId: step.id,
          code: taskCode,
          kanbanOrder: step.sequenceOrder * PROJECT_CONSTANTS.KANBAN_ORDER_MULTIPLIER,
          endDate: step.effortDays != null ? addDays(baseDate, step.effortDays) : undefined,
          status: TaskStatus.BACKLOG,
          createdBy,
          updatedBy: createdBy,
        },
        manager,
      );

      codeToTaskId.set(step.code, task.id);
    }

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
    milestones: Array<{ name: string; type: MilestoneType; order: number }>;
    teamConfig?: {
      pmId?: string;
      members?: Array<{ userId: string; roleName: string; isProjectManager?: boolean }>;
    };
    excludedStepIds?: string[];
    taskAssignments?: Array<{ workflowStepId: string; assignedToUserId: string }>;
    taskMilestoneOverrides?: Array<{ workflowStepId: string; milestoneOrder: number }>;
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
    } = params;

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

      // 4. Create milestones
      const { milestoneTypeMap, milestoneOrderMap } = await this.createProjectMilestones(
        project.id,
        milestones,
        orgCode,
        createdBy,
        manager,
      );

      // 5. Set excluded steps on project (transitions are DB-driven, no hardcoded map)
      await this.projectRepository.updateById(
        project.id,
        { excludedStepIds: excludedStepIds ?? [] },
        manager,
      );

      // 6. Apply workflow steps (lean rows, no data copy)
      await this.applyWorkflowSteps(
        project.id,
        organizationId,
        createdBy,
        excludedStepIds,
        project.startDate,
        manager,
      );

      // 7. Link tasks to milestones via step.defaultMilestoneType
      await this.linkTasksToMilestones(project.id, organizationId, milestoneTypeMap, manager);

      // 8. Apply milestone overrides from frontend
      if (taskMilestoneOverrides?.length) {
        await this.applyMilestoneOverrides(
          project.id,
          taskMilestoneOverrides,
          milestoneOrderMap,
          manager,
        );
      }

      // 9. Add PM + team members
      await this.addTeamMembers(project.id, teamConfig, manager);

      // 10. Apply explicit task assignments from API payload (sole assignment path)
      await this.applyTaskAssignments(project.id, taskAssignments ?? [], manager);

      // 11. Compute initial progress
      const { done, total } = await this.taskRepository.computeProgress(project.id, manager);
      const progress = total > 0 ? Math.round((100 * done) / total) : 0;
      await this.projectRepository.updateById(
        project.id,
        { progressPercentage: progress },
        manager,
      );
      await this.milestoneRepository.updateProgressForProject(project.id, manager);

      return this.projectRepository.findById(project.id, organizationId, manager);
    });
  }

  private async createProjectMilestones(
    projectId: string,
    milestones: Array<{ name: string; type: MilestoneType; order: number }>,
    orgCode: string,
    createdBy: string,
    manager: EntityManager,
  ): Promise<{ milestoneTypeMap: Map<string, string>; milestoneOrderMap: Map<number, string> }> {
    const milestoneTypeMap = new Map<string, string>();
    const milestoneOrderMap = new Map<number, string>();

    for (const ms of milestones) {
      const milestone = await this.milestoneRepository.create(
        {
          projectId,
          name: ms.name,
          milestoneType: ms.type,
          status: MilestoneStatus.PENDING,
          sequenceOrder: ms.order,
          createdBy,
        },
        manager,
      );

      try {
        const milestoneCode = await this.milestoneRepository.generateMilestoneCode(
          orgCode,
          manager,
        );
        await this.milestoneRepository.updateById(milestone.id, { milestoneCode }, manager);
      } catch (err) {
        this.logger.warn(`Failed to generate milestone code for ${milestone.id}: ${String(err)}`);
      }

      milestoneTypeMap.set(ms.type, milestone.id);
      milestoneOrderMap.set(ms.order, milestone.id);
    }

    return { milestoneTypeMap, milestoneOrderMap };
  }

  private async linkTasksToMilestones(
    projectId: string,
    organizationId: string,
    milestoneTypeMap: Map<string, string>,
    manager: EntityManager,
  ): Promise<void> {
    const allTasks = await this.taskRepository.findByProjectRaw(
      projectId,
      { relations: ['workflowStep'] },
      manager,
    );
    const steps = await this.workflowStepRepository.findAllActive(organizationId, manager);
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    for (const task of allTasks) {
      if (!task.workflowStepId || task.milestoneId) continue;
      const step = stepMap.get(task.workflowStepId);
      if (!step?.defaultMilestoneType) continue;
      const milestoneId = milestoneTypeMap.get(step.defaultMilestoneType);
      if (milestoneId) {
        await this.taskRepository.updateById(task.id, { milestoneId }, manager);
      }
    }
  }

  private async applyMilestoneOverrides(
    projectId: string,
    overrides: Array<{ workflowStepId: string; milestoneOrder: number }>,
    milestoneOrderMap: Map<number, string>,
    manager: EntityManager,
  ): Promise<void> {
    const tasks = await this.taskRepository.findByProjectRaw(projectId, undefined, manager);
    for (const override of overrides) {
      const task = tasks.find((t) => t.workflowStepId === override.workflowStepId);
      if (!task) continue;
      const milestoneId =
        override.milestoneOrder === 0 ? null : milestoneOrderMap.get(override.milestoneOrder);
      if (override.milestoneOrder === 0 || milestoneId) {
        await this.taskRepository.updateById(
          task.id,
          { milestoneId: milestoneId ?? undefined },
          manager,
        );
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
}
