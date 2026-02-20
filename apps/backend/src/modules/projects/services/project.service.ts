import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  type MilestoneType,
  MilestoneStatus,
  type PaymentMilestone,
  PaymentMilestoneStage,
  ProjectPriority,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  TaskStatus,
} from '@oneohm-epc/shared-types';
import { DataSource } from 'typeorm';

import { generateEntityCode } from '../../../common/utils/code-generator.util';
import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { QuoteService } from '../../quotes/services/quote.service';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { ConvertFromQuoteDto, CreateProjectDto, UpdateProjectDto } from '../dto';
import type { InitiateProjectDto } from '../dto/projects/initiate-project.dto';
import { ProjectEntity } from '../entities/project.entity';
import {
  MilestoneRepository,
  ProjectRepository,
  ProjectTaskRepository,
  ProjectTeamRepository,
  TaskTemplateRepository,
} from '../repositories';

const STAGE_TO_MILESTONE_TYPE: Partial<Record<PaymentMilestoneStage, MilestoneType>> = {
  [PaymentMilestoneStage.MATERIAL_PROCUREMENT]: 'material_procurement' as MilestoneType,
  [PaymentMilestoneStage.INSTALLATION_START]: 'installation' as MilestoneType,
  [PaymentMilestoneStage.INSTALLATION_COMPLETE]: 'installation' as MilestoneType,
  [PaymentMilestoneStage.COMMISSIONING]: 'commissioning' as MilestoneType,
  [PaymentMilestoneStage.NET_METERING]: 'handover' as MilestoneType,
};

const DEFAULT_PROJECT_MILESTONES: Array<{ name: string; type: MilestoneType; order: number }> = [
  { name: 'Site Survey & Design', type: 'site_survey' as MilestoneType, order: 1 },
  { name: 'Permits & Approvals', type: 'permits' as MilestoneType, order: 2 },
  { name: 'Material Procurement', type: 'material_procurement' as MilestoneType, order: 3 },
  { name: 'Installation', type: 'installation' as MilestoneType, order: 4 },
  { name: 'Commissioning & Testing', type: 'commissioning' as MilestoneType, order: 5 },
  { name: 'Handover', type: 'handover' as MilestoneType, order: 6 },
];

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
    private readonly taskTemplateRepository: TaskTemplateRepository,
    private readonly taskRepository: ProjectTaskRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new project
   * Requires a valid propertyId that belongs to the organization
   * Enforces OneToOne constraint: one property can have only one project
   */
  async create(
    organizationId: string,
    createDto: CreateProjectDto,
    createdBy: string,
  ): Promise<ProjectEntity> {
    // Validate property exists and belongs to org
    const property = await this.customerPropertyRepository.findByIdAndOrganization(
      createDto.propertyId,
      organizationId,
    );
    if (!property) {
      throw new NotFoundException(`Property with ID ${createDto.propertyId} not found`);
    }

    // Check OneToOne constraint: property must not have existing project
    const existingProject = await this.projectRepository.findOneByPropertyId(
      createDto.propertyId,
      organizationId,
    );
    if (existingProject) {
      throw new BadRequestException(
        `Property already has a project (${existingProject.projectNumber}). One property can only have one project.`,
      );
    }

    // Get organization for project number generation
    const org = await this.organizationRepository.findOneById(organizationId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Generate project number
    const projectNumber = await this.generateProjectNumber(org.code);

    // Create project - organizationId, customerId, siteAddress, siteCoordinates
    // are derived from property relation
    const project = await this.projectRepository.create({
      propertyId: createDto.propertyId,
      createdBy,
      projectNumber,
      name: createDto.name,
      description: createDto.description,
      systemSizeKw: createDto.systemSizeKw,
      projectType: createDto.projectType,
      status: createDto.status || ProjectStatus.DRAFT,
      priority: createDto.priority || ProjectPriority.NORMAL,
      progressPercentage: createDto.progressPercentage || 0,
      startDate: createDto.startDate ? new Date(createDto.startDate) : undefined,
      endDate: createDto.endDate ? new Date(createDto.endDate) : undefined,
      estimatedCost: createDto.estimatedCost,
      actualCost: createDto.actualCost,
      metadata: createDto.metadata,
    });

    // Auto-apply task templates after project creation
    await this.applyTaskTemplates(project.id, organizationId, createdBy);

    return this.projectRepository.findById(project.id, organizationId);
  }

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
   * Note: propertyId cannot be changed after creation
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateProjectDto,
    updatedBy: string,
  ): Promise<ProjectEntity> {
    // Verify project exists (repository handles org validation via property)
    await this.projectRepository.findById(id, organizationId);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...updateDto,
      updatedBy,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
    };

    // Remove undefined values
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
    // Verify project exists
    const project = await this.projectRepository.findById(id, organizationId);

    // Check if project can be deleted (only draft/cancelled projects)
    if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot delete project with status ${project.status}. Only draft or cancelled projects can be deleted.`,
      );
    }

    await this.projectRepository.delete(id, organizationId);
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
   * 6. Apply task templates (filtering excluded)
   * 7. Link tasks to milestones via template.defaultMilestoneType
   * 8. Add PM + team members if provided
   * 9. Auto-assign tasks by role
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

    const projectNumber = await this.generateProjectNumber(org.code);
    const projectType = quote.projectType;
    const customerName =
      property?.consumerName ||
      `${quote.customer.firstName} ${quote.customer.lastName || ''}`.trim() ||
      'Customer';
    const autoName = `${customerName} - ${quote.systemSizeKw}kW Solar Installation`.trim();

    const currentVersion = quote.versions?.find((v) => v.isCurrent) || quote.versions?.[0];
    const paymentMilestones: PaymentMilestone[] = currentVersion?.paymentMilestones || [];

    const milestones = paymentMilestones.map((pm, i) => ({
      name: pm.name,
      type: STAGE_TO_MILESTONE_TYPE[pm.stage] || ('custom' as MilestoneType),
      order: pm.order || i + 1,
    }));

    return this.orchestrateProjectCreation({
      projectData: {
        propertyId: quote.propertyId,
        projectNumber,
        name: convertDto?.name || autoName,
        description: convertDto?.description || `Solar installation project converted from quote ${quote.quoteNumber}`,
        systemSizeKw: quote.systemSizeKw,
        projectType,
        status: ProjectStatus.DRAFT,
        priority: convertDto?.priority || ProjectPriority.NORMAL,
        progressPercentage: 0,
        estimatedCost: quote.finalPrice,
        startDate: convertDto?.startDate ? new Date(convertDto.startDate) : undefined,
        endDate: convertDto?.endDate ? new Date(convertDto.endDate) : undefined,
        metadata: {
          convertedFromQuote: true,
          quoteNumber: quote.quoteNumber,
          quoteId,
          originalQuoteAmount: quote.finalPrice,
        },
      },
      propertyId: quote.propertyId,
      organizationId,
      orgCode: org.code,
      createdBy,
      milestones,
      teamConfig: convertDto
        ? { pmId: convertDto.projectManagerId, members: convertDto.teamMembers }
        : undefined,
      excludedTemplateIds: convertDto?.excludedTaskTemplateIds,
    });
  }

  /**
   * Initiate a new project from a property (no quote required, transactional).
   * Uses DEFAULT_PROJECT_MILESTONES instead of quote payment terms.
   */
  async initiateProject(
    organizationId: string,
    createdBy: string,
    dto: InitiateProjectDto,
  ): Promise<ProjectEntity> {
    const property = await this.customerPropertyRepository.findByIdAndOrganization(
      dto.propertyId,
      organizationId,
    );
    if (!property) {
      throw new NotFoundException(`Property with ID ${dto.propertyId} not found in this organization`);
    }
    if (property.status === PropertyStatus.CONVERTED) {
      throw new BadRequestException(
        'This property has already been converted to a project. Cannot create another.',
      );
    }

    const existingProject = await this.projectRepository.findOneByPropertyId(
      dto.propertyId,
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

    const projectNumber = await this.generateProjectNumber(org.code);

    return this.orchestrateProjectCreation({
      projectData: {
        propertyId: dto.propertyId,
        projectNumber,
        name: dto.name,
        description: dto.description,
        systemSizeKw: dto.systemSizeKw,
        projectType: dto.projectType,
        status: ProjectStatus.DRAFT,
        priority: dto.priority || ProjectPriority.NORMAL,
        progressPercentage: 0,
        estimatedCost: dto.estimatedCost,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      propertyId: dto.propertyId,
      organizationId,
      orgCode: org.code,
      createdBy,
      milestones: DEFAULT_PROJECT_MILESTONES,
      teamConfig: { pmId: dto.projectManagerId, members: dto.teamMembers },
      excludedTemplateIds: dto.excludedTaskTemplateIds,
    });
  }

  /**
   * Shared orchestration for project creation (both quote and property flows).
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
    excludedTemplateIds?: string[];
  }): Promise<ProjectEntity> {
    const {
      projectData,
      propertyId,
      organizationId,
      orgCode,
      createdBy,
      milestones,
      teamConfig,
      excludedTemplateIds,
    } = params;

    return this.dataSource.transaction(async () => {
      // 1. Create project
      const project = await this.projectRepository.create({
        ...projectData,
        createdBy,
      });

      // 2. Lock + update property to CONVERTED
      await this.customerPropertyRepository.update(propertyId, {
        status: PropertyStatus.CONVERTED,
      });

      // 3. Create milestones
      const milestoneTypeMap = new Map<string, string>();
      for (const ms of milestones) {
        const milestone = await this.milestoneRepository.create({
          projectId: project.id,
          name: ms.name,
          milestoneType: ms.type,
          status: MilestoneStatus.PENDING,
          sequenceOrder: ms.order,
          createdBy,
        });

        try {
          const milestoneCode = await generateEntityCode(
            this.milestoneRepository.repository,
            'milestoneCode',
            'MS',
            orgCode,
            'milestone_code',
          );
          await this.milestoneRepository.repository.update(milestone.id, { milestoneCode });
        } catch (err) {
          this.logger.warn(
            `Failed to generate milestone code for ${milestone.id}: ${String(err)}`,
          );
        }

        milestoneTypeMap.set(ms.type, milestone.id);
      }

      // 4. Apply task templates (filtering excluded)
      await this.applyTaskTemplates(project.id, organizationId, createdBy, excludedTemplateIds);

      // 5. Link tasks to milestones via template.defaultMilestoneType
      const { data: tasks } = await this.taskRepository.findAll(project.id, 1, 10000, {});
      const templates = await this.taskTemplateRepository.findAllActive(organizationId);
      const templateMap = new Map(templates.map((t) => [t.id, t]));

      for (const task of tasks) {
        if (!task.taskTemplateId || task.milestoneId) continue;
        const template = templateMap.get(task.taskTemplateId);
        if (!template?.defaultMilestoneType) continue;
        const milestoneId = milestoneTypeMap.get(template.defaultMilestoneType);
        if (milestoneId) {
          await this.taskRepository.update(task.id, project.id, { milestoneId });
        }
      }

      // 6. Add PM + team members
      if (teamConfig?.pmId) {
        const existing = await this.teamRepository.findByUserAndProject(
          teamConfig.pmId,
          project.id,
        );
        if (!existing) {
          await this.teamRepository.create({
            projectId: project.id,
            userId: teamConfig.pmId,
            roleName: 'Project Manager',
            isProjectManager: true,
          });
        }
      }

      if (teamConfig?.members) {
        for (const member of teamConfig.members) {
          const existing = await this.teamRepository.findByUserAndProject(
            member.userId,
            project.id,
          );
          if (existing) continue;
          await this.teamRepository.create({
            projectId: project.id,
            userId: member.userId,
            roleName: member.roleName,
            isProjectManager: member.isProjectManager ?? false,
          });
        }
      }

      // 7. Auto-assign tasks by role
      await this.autoAssignTasksByRole(project.id, organizationId);

      return this.projectRepository.findById(project.id, organizationId);
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
    const { data: tasks } = await this.taskRepository.findAll(projectId, 1, 10000, {});

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
        name: task.name,
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
        name: task.name,
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
   * Auto-assign unassigned tasks to project team members based on their system roles.
   * Uses user_roles table (multi-role) for matching, with project_team_members.roleName as fallback.
   * When multiple members match, assigns to the one with fewer tasks (workload balancing).
   */
  private async autoAssignTasksByRole(projectId: string, organizationId: string): Promise<void> {
    const { data: allTasks } = await this.taskRepository.findAll(projectId, 1, 10000, {});
    const unassignedTasks = allTasks.filter((t) => !t.assignedToUserId && t.taskTemplateId);

    if (unassignedTasks.length === 0) return;

    const teamMembers = await this.teamRepository.findByProject(projectId);
    if (teamMembers.length === 0) return;

    const templates = await this.taskTemplateRepository.findAllActive(organizationId);
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    // Build user -> system roles map (from user_roles table)
    const userRolesMap = new Map<string, string[]>();
    for (const member of teamMembers) {
      const userRoles = await this.userRoleRepository.findByUserAndOrganization(
        member.userId,
        organizationId,
      );
      const roleCodes = userRoles.map((ur) => ur.role.toLowerCase());
      userRolesMap.set(member.userId, roleCodes);
    }

    // Track assignment counts for workload balancing
    const assignmentCounts = new Map<string, number>();
    for (const task of allTasks) {
      if (task.assignedToUserId) {
        assignmentCounts.set(
          task.assignedToUserId,
          (assignmentCounts.get(task.assignedToUserId) || 0) + 1,
        );
      }
    }

    for (const task of unassignedTasks) {
      const template = templateMap.get(task.taskTemplateId!);
      if (!template?.defaultRoleCode) continue;

      const targetRole = template.defaultRoleCode.toLowerCase();
      let bestMatch: { userId: string; count: number } | null = null;

      // Priority 1: Match via user_roles (system-level roles)
      for (const member of teamMembers) {
        const systemRoles = userRolesMap.get(member.userId) || [];
        if (systemRoles.includes(targetRole)) {
          const count = assignmentCounts.get(member.userId) || 0;
          if (!bestMatch || count < bestMatch.count) {
            bestMatch = { userId: member.userId, count };
          }
        }
      }

      // Priority 2: Fallback to project_team_members.roleName
      if (!bestMatch) {
        for (const member of teamMembers) {
          if (member.roleName?.toLowerCase() === targetRole) {
            const count = assignmentCounts.get(member.userId) || 0;
            if (!bestMatch || count < bestMatch.count) {
              bestMatch = { userId: member.userId, count };
            }
          }
        }
      }

      if (bestMatch) {
        await this.taskRepository.update(task.id, projectId, {
          assignedToUserId: bestMatch.userId,
        });
        assignmentCounts.set(bestMatch.userId, (assignmentCounts.get(bestMatch.userId) || 0) + 1);
      }
    }
  }

  /**
   * Generate unique project number using centralized code generator
   */
  private async generateProjectNumber(orgCode: string): Promise<string> {
    return generateEntityCode(
      this.projectRepository.repository,
      'projectNumber',
      'PRJ',
      orgCode,
      'project_number',
    );
  }

  /**
   * Auto-apply active task templates to a project.
   * Filters out excluded templates, detects dependency cycles, and resolves dependencies.
   */
  private async applyTaskTemplates(
    projectId: string,
    organizationId: string,
    createdBy: string,
    excludedTemplateIds?: string[],
  ): Promise<void> {
    let templates = await this.taskTemplateRepository.findAllActive(organizationId);

    if (templates.length === 0) {
      return;
    }

    if (excludedTemplateIds && excludedTemplateIds.length > 0) {
      const excludeSet = new Set(excludedTemplateIds);
      templates = templates.filter((t) => !excludeSet.has(t.id));
    }

    if (templates.length === 0) {
      return;
    }

    // Cycle detection via topological sort
    const codeSet = new Set(templates.map((t) => t.code));
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    for (const t of templates) {
      adjList.set(t.code, []);
      inDegree.set(t.code, 0);
    }
    for (const t of templates) {
      if (t.dependsOnTaskCodes) {
        for (const dep of t.dependsOnTaskCodes) {
          if (!codeSet.has(dep)) {
            this.logger.warn(`Template "${t.code}" depends on missing code "${dep}" — skipping dep`);
            continue;
          }
          adjList.get(dep)!.push(t.code);
          inDegree.set(t.code, (inDegree.get(t.code) || 0) + 1);
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
    if (visited < templates.length) {
      this.logger.warn(
        `Dependency cycle detected among task templates — proceeding without dependency links for cycled nodes`,
      );
    }

    const org = await this.organizationRepository.findOneById(organizationId);
    const orgCode = org?.code || 'UNKNOWN';
    const codeToTaskId = new Map<string, string>();

    for (const template of templates) {
      let taskCode: string;
      try {
        taskCode = await generateEntityCode(this.taskRepository.repository, 'code', 'TSK', orgCode);
      } catch {
        taskCode = template.code;
      }

      const task = await this.taskRepository.create({
        projectId,
        taskTemplateId: template.id,
        name: template.name,
        code: taskCode,
        description: template.description,
        kanbanOrder: template.sequenceOrder * 100,
        status: TaskStatus.BACKLOG,
        checklist: template.checklistTemplate,
        labels: template.type ? [template.type] : undefined,
        createdBy,
        updatedBy: createdBy,
      });

      codeToTaskId.set(template.code, task.id);
    }

    for (const template of templates) {
      if (template.dependsOnTaskCodes && template.dependsOnTaskCodes.length > 0) {
        const taskId = codeToTaskId.get(template.code);
        if (!taskId) continue;

        const dependsOnTaskIds: string[] = [];
        for (const depCode of template.dependsOnTaskCodes) {
          const depTaskId = codeToTaskId.get(depCode);
          if (depTaskId) {
            dependsOnTaskIds.push(depTaskId);
          } else {
            this.logger.warn(
              `Task dependency resolution: code "${depCode}" not found for template "${template.code}"`,
            );
          }
        }

        if (dependsOnTaskIds.length > 0) {
          await this.taskRepository.update(taskId, projectId, {
            dependsOnTaskIds,
          });
        }
      }
    }
  }
}
