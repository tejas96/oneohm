import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectPriority, ProjectStatus, QuoteStatus } from '@oneohm-epc/shared-types';

import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { QuoteService } from '../../quotes/services/quote.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto';
import { ProjectEntity } from '../entities/project.entity';
import { MilestoneRepository, ProjectRepository } from '../repositories';

/**
 * Project Service
 * Business logic for project management
 */
@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly quoteService: QuoteService,
  ) {}

  /**
   * Create a new project
   */
  async create(
    organizationId: string,
    createDto: CreateProjectDto,
    createdBy: string,
  ): Promise<ProjectEntity> {
    // Get organization for project number generation
    const org = await this.organizationRepository.findOneById(organizationId);

    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Generate project number
    const projectNumber = await this.generateProjectNumber(org.code);

    // Create project
    const project = await this.projectRepository.create({
      organizationId,
      quoteId: createDto.quoteId,
      customerId: createDto.customerId,
      projectManagerId: createDto.projectManagerId,
      leadTechnicianId: createDto.leadTechnicianId,
      createdBy,
      projectNumber,
      name: createDto.name,
      description: createDto.description,
      siteAddress: createDto.siteAddress,
      siteCoordinates: createDto.siteCoordinates,
      systemSizeKw: createDto.systemSizeKw,
      projectType: createDto.projectType,
      status: createDto.status || ProjectStatus.DRAFT,
      priority: createDto.priority || ProjectPriority.NORMAL,
      progressPercentage: createDto.progressPercentage || 0,
      plannedStartDate: createDto.plannedStartDate
        ? new Date(createDto.plannedStartDate)
        : undefined,
      plannedEndDate: createDto.plannedEndDate ? new Date(createDto.plannedEndDate) : undefined,
      actualStartDate: createDto.actualStartDate ? new Date(createDto.actualStartDate) : undefined,
      actualEndDate: createDto.actualEndDate ? new Date(createDto.actualEndDate) : undefined,
      estimatedCost: createDto.estimatedCost,
      actualCost: createDto.actualCost,
      notes: createDto.notes,
      metadata: createDto.metadata,
    });

    return this.projectRepository.findById(project.id, organizationId);
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
      projectManagerId?: string;
      quoteId?: string;
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
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    // Verify project exists
    await this.projectRepository.findById(id, organizationId);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...updateDto,
      plannedStartDate: updateDto.plannedStartDate
        ? new Date(updateDto.plannedStartDate)
        : undefined,
      plannedEndDate: updateDto.plannedEndDate ? new Date(updateDto.plannedEndDate) : undefined,
      actualStartDate: updateDto.actualStartDate ? new Date(updateDto.actualStartDate) : undefined,
      actualEndDate: updateDto.actualEndDate ? new Date(updateDto.actualEndDate) : undefined,
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

    // Update actual dates based on status
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === ProjectStatus.IN_PROGRESS && !project.actualStartDate) {
      updateData.actualStartDate = new Date();
    }

    if (newStatus === ProjectStatus.COMPLETED && !project.actualEndDate) {
      updateData.actualEndDate = new Date();
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
   * Find projects by quote
   */
  async findByQuote(quoteId: string, organizationId: string): Promise<ProjectEntity[]> {
    return this.projectRepository.findByQuote(quoteId, organizationId);
  }

  /**
   * Convert a quote to a project
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

    // Check if project already exists for this quote
    const existingProjects = await this.projectRepository.findByQuote(quoteId, organizationId);
    if (existingProjects.length > 0) {
      throw new BadRequestException('A project already exists for this quote');
    }

    // Get organization for project number generation
    const org = await this.organizationRepository.findOneById(organizationId);
    if (!org) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Generate project number
    const projectNumber = await this.generateProjectNumber(org.code);

    // Determine project type from quote (defensive fallback)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const projectType = quote.projectType || 'residential';

    // Create project from quote data (using optional chaining for runtime safety)

    const project = await this.projectRepository.create({
      organizationId,
      quoteId,
      customerId: quote.customerId,
      projectManagerId: quote.salesPersonId, // Sales person becomes project manager initially
      createdBy,
      projectNumber,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      name: `${quote.customer?.firstName || ''} ${quote.customer?.lastName || ''} - ${quote.systemSizeKw}kW Solar Installation`.trim(),
      description: `Solar installation project converted from quote ${quote.quoteNumber}`,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      siteAddress: quote.customer?.address || 'To be confirmed',
      systemSizeKw: quote.systemSizeKw,
      projectType,
      status: ProjectStatus.DRAFT,
      priority: ProjectPriority.NORMAL,
      progressPercentage: 0,
      estimatedCost: quote.finalPrice,
      metadata: {
        convertedFromQuote: true,
        quoteNumber: quote.quoteNumber,
        originalQuoteAmount: quote.finalPrice,
      },
    });

    return this.projectRepository.findById(project.id, organizationId);
  }

  /**
   * Generate unique project number
   */
  private async generateProjectNumber(orgCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRJ-${orgCode}-${year}`;

    // Find the last project number for this organization and year
    const { projects } = await this.projectRepository.findAll(orgCode, 1, 1, {
      search: prefix,
    });

    let nextNumber = 1;

    if (projects.length > 0 && projects[0]?.projectNumber) {
      const parts = projects[0].projectNumber.split('-');
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const lastNumber = parts?.[parts.length - 1];
      if (lastNumber) {
        nextNumber = parseInt(lastNumber, 10) + 1;
      }
    }

    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
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
