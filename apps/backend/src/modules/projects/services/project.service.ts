import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectPriority, ProjectStatus, QuoteStatus, TaskStatus } from '@oneohm-epc/shared-types';

import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { QuoteService } from '../../quotes/services/quote.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto';
import { ProjectEntity } from '../entities/project.entity';
import {
  MilestoneRepository,
  ProjectRepository,
  ProjectTaskRepository,
  TaskTemplateRepository,
} from '../repositories';

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
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly quoteService: QuoteService,
    private readonly customerPropertyRepository: CustomerPropertyRepository,
    private readonly taskTemplateRepository: TaskTemplateRepository,
    private readonly taskRepository: ProjectTaskRepository,
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
    const projectNumber = await this.generateProjectNumber(organizationId, org.code);

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
   * Auto-apply active task templates to a project
   * Creates tasks from templates and resolves dependencies
   */
  private async applyTaskTemplates(
    projectId: string,
    organizationId: string,
    createdBy: string,
  ): Promise<void> {
    // Get all active task templates for the organization
    const templates = await this.taskTemplateRepository.findAllActive(organizationId);

    if (templates.length === 0) {
      return;
    }

    // Map from template code to created task ID (for dependency resolution)
    const codeToTaskId = new Map<string, string>();

    // First pass: create all tasks
    for (const template of templates) {
      const task = await this.taskRepository.create({
        projectId,
        taskTemplateId: template.id,
        name: template.name,
        code: template.code,
        description: template.description,
        kanbanOrder: template.sequenceOrder * 100, // Space out for insertion
        status: TaskStatus.BACKLOG,
        checklist: template.checklistTemplate,
        labels: template.type ? [template.type] : undefined,
        createdBy,
        updatedBy: createdBy,
      });

      codeToTaskId.set(template.code, task.id);
    }

    // Second pass: resolve dependencies (template.dependsOnTaskCodes -> task.dependsOnTaskIds)
    for (const template of templates) {
      if (template.dependsOnTaskCodes && template.dependsOnTaskCodes.length > 0) {
        const taskId = codeToTaskId.get(template.code);
        if (!taskId) continue;

        const dependsOnTaskIds: string[] = [];
        for (const depCode of template.dependsOnTaskCodes) {
          const depTaskId = codeToTaskId.get(depCode);
          if (depTaskId) {
            dependsOnTaskIds.push(depTaskId);
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

  /**
   * Find all projects with filters
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
    },
  ): Promise<{ projects: ProjectEntity[]; total: number; page: number; limit: number }> {
    const { projects, total } = await this.projectRepository.findAll(
      organizationId,
      page,
      limit,
      filters,
    );

    return {
      projects,
      total,
      page,
      limit,
    };
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
   * Convert a quote to a project
   * Quote must have a propertyId assigned
   * Enforces OneToOne constraint: one property can have only one project
   */
  async convertFromQuote(
    quoteId: string,
    organizationId: string,
    createdBy: string,
  ): Promise<ProjectEntity> {
    // Fetch the quote with all details
    const quote = await this.quoteService.findById(quoteId, organizationId);

    // Check if quote is accepted
    if (quote.status !== QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Only accepted quotes can be converted to projects');
    }

    // Validate quote has propertyId - required for project creation
    if (!quote.propertyId) {
      throw new BadRequestException(
        'Cannot convert quote to project: Quote must have a property assigned',
      );
    }

    // Check OneToOne constraint: property must not have existing project
    const existingProject = await this.projectRepository.findOneByPropertyId(
      quote.propertyId,
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
    const projectNumber = await this.generateProjectNumber(organizationId, org.code);

    // Determine project type from quote
    const projectType = quote.projectType;

    // Get customer name from property or customer
    const customerName =
      quote.property?.consumerName ||
      `${quote.customer.firstName} ${quote.customer.lastName || ''}`.trim() ||
      'Customer';

    // Create project from quote data
    // Note: quoteId and projectManagerId are no longer stored on project entity
    // Quote info is stored in metadata for reference
    const project = await this.projectRepository.create({
      propertyId: quote.propertyId,
      createdBy,
      projectNumber,
      name: `${customerName} - ${quote.systemSizeKw}kW Solar Installation`.trim(),
      description: `Solar installation project converted from quote ${quote.quoteNumber}`,
      systemSizeKw: quote.systemSizeKw,
      projectType,
      status: ProjectStatus.DRAFT,
      priority: ProjectPriority.NORMAL,
      progressPercentage: 0,
      estimatedCost: quote.finalPrice,
      metadata: {
        convertedFromQuote: true,
        quoteNumber: quote.quoteNumber,
        quoteId, // Store for reference
        originalQuoteAmount: quote.finalPrice,
      },
    });

    return this.projectRepository.findById(project.id, organizationId);
  }

  /**
   * Generate unique project number
   * @param organizationId - UUID of the organization (for querying)
   * @param orgCode - Organization code (for project number prefix)
   */
  private async generateProjectNumber(organizationId: string, orgCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRJ-${orgCode}-${year}`;

    // Find the last project number for this organization and year
    // IMPORTANT: This includes soft-deleted projects to ensure unique numbers
    const lastProjectNumber = await this.projectRepository.findLastProjectNumber(
      organizationId,
      prefix,
    );

    let nextNumber = 1;
    if (lastProjectNumber) {
      const parts = lastProjectNumber.split('-');
      const lastNumber = parts[parts.length - 1];
      if (lastNumber) {
        nextNumber = parseInt(lastNumber, 10) + 1;
      }
    }

    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
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
}
