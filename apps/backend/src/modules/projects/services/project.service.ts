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
import { COMPANY } from '@tejas96/shared/constants';
import {
  type PaymentMilestone,
  LookupTypeCode,
  ProjectPriority,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  TaskStatus,
  type TaskStatusConfig,
} from '@tejas96/shared/types';
import { DataSource, type EntityManager } from 'typeorm';

import { ChangeRequestTaskService } from './change-request-task.service';
import { BomService } from '../../bom/services/bom.service';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';
import { CustomerPropertyRepository } from '../../customers/repositories/customer-property.repository';
import { LeadClosureService } from '../../customers/services/lead-closure.service';
import { rupeesToPaise } from '../../ledger/domain/paise';
import { MilestoneService } from '../../ledger/services/milestone.service';
import { LookupRepository } from '../../lookups/repositories/lookup.repository';
import {
  CONSUMER_EVENTS,
  ProjectCompletedEvent,
  ProjectOnboardedEvent,
} from '../../notifications/events/consumer-notification.events';
import { QuoteVersionEntity } from '../../quotes/entities/quote-version.entity';
import { QuoteEntity } from '../../quotes/entities/quote.entity';
import { QuoteService } from '../../quotes/services/quote.service';
import { ConvertFromQuoteDto, UpdateProjectDto } from '../dto';
import { ProjectEntity } from '../entities/project.entity';
import {
  type ProjectPaymentSummary,
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
    private readonly quoteService: QuoteService,
    private readonly customerPropertyRepository: CustomerPropertyRepository,
    private readonly workflowStepRepository: WorkflowStepRepository,
    private readonly taskRepository: ProjectTaskRepository,
    private readonly teamRepository: ProjectTeamRepository,
    private readonly bomService: BomService,
    private readonly changeRequestTaskService: ChangeRequestTaskService,
    private readonly lookupRepository: LookupRepository,
    @Inject(forwardRef(() => MilestoneService))
    private readonly milestoneService: MilestoneService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly leadClosureService: LeadClosureService,
  ) {}

  /**
   * Find all projects with filters, computed fields, and payment summaries
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
  ): Promise<{
    projects: (ProjectEntity & {
      currentPhase: string | null;
      healthStatus: string | null;
      paymentSummary: ProjectPaymentSummary;
      completedTasks: number;
      totalTasks: number;
      nextTask?: { id: string; name: string; code: string; endDate?: Date } | null;
      userOverdueTasks?: number;
    })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { projects, total } = await this.projectRepository.findAll(page, limit, filters);

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
        const paymentSummary = paymentMap.get(project.id) ?? {
          totalExpected: 0,
          totalPaid: 0,
          contractValue: 0,
          outstanding: 0,
        };
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
  async findById(id: string): Promise<ProjectEntity> {
    return this.projectRepository.findById(id);
  }

  /**
   * Update a project
   * Note: propertyId and quoteId cannot be changed after creation.
   * actualCost is routed to metadata.actualCost.
   */
  async update(id: string, updateDto: UpdateProjectDto, updatedBy: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(id);

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
      const { StockAllocationStatus } = await import('@tejas96/shared/types');
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

    // Prepare update data (whitelisted to prevent prototype pollution and remote property injection)
    const allowedKeys: (keyof typeof safeDto)[] = [
      'name',
      'description',
      'priority',
      'progressPercentage',
      'defaultWarehouseId',
      'taskStatuses',
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (safeDto[key] !== undefined) {
        updateData[key] = safeDto[key];
      }
    }

    updateData.updatedBy = updatedBy;

    if (safeDto.startDate !== undefined) {
      updateData.startDate = safeDto.startDate ? new Date(safeDto.startDate) : null;
    }
    if (safeDto.endDate !== undefined) {
      updateData.endDate = safeDto.endDate ? new Date(safeDto.endDate) : null;
    }

    if (actualCost !== undefined || incomingMetadata !== undefined) {
      updateData.metadata = {
        ...project.metadata,
        ...(incomingMetadata ?? {}),
        ...(actualCost !== undefined ? { actualCost } : {}),
      };
    }

    return this.projectRepository.update(id, updateData);
  }

  /**
   * Delete a project
   */
  async delete(id: string): Promise<void> {
    const project = await this.projectRepository.findById(id);

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
  async updateStatus(id: string, newStatus: ProjectStatus): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(id);

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

    await this.projectRepository.update(id, updateData);
    const updatedProject = await this.projectRepository.findById(id);

    // Notify consumer when project is completed (manual status change)
    if (newStatus === ProjectStatus.COMPLETED) {
      this.logger.debug(
        `Project status changed to COMPLETED. Emitting CONSUMER_EVENTS.PROJECT_COMPLETED event. orgId=, projectId=${id}, propertyId=${updatedProject.propertyId}, projectName=${updatedProject.name}`,
      );
      this.eventEmitter.emit(
        CONSUMER_EVENTS.PROJECT_COMPLETED,
        new ProjectCompletedEvent(id, updatedProject.propertyId, updatedProject.name),
      );
    }

    return updatedProject;
  }

  /**
   * Calculate and update project progress based on task completion ratio.
   * Cancelled tasks are excluded from both numerator and denominator.
   */
  async calculateProgress(id: string): Promise<ProjectEntity> {
    const { done, total } = await this.taskRepository.computeProgress(id);
    const progress = total > 0 ? Math.round((100 * done) / total) : 0;

    await this.projectRepository.update(id, {
      progressPercentage: progress,
    });

    return this.projectRepository.findById(id);
  }

  /**
   * Find projects by customer
   */
  async findByCustomer(customerId: string): Promise<ProjectEntity[]> {
    return this.projectRepository.findByCustomer(customerId);
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
    createdBy: string,
    convertDto?: ConvertFromQuoteDto,
  ): Promise<ProjectEntity> {
    const quote = await this.quoteService.findById(quoteId);

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
    );
    if (!property) {
      throw new NotFoundException(`Property with ID ${quote.propertyId} not found`);
    }
    if (property.status === PropertyStatus.CONVERTED) {
      throw new BadRequestException(
        'This property has already been converted to a project. Cannot create another.',
      );
    }

    const existingProject = await this.projectRepository.findOneByPropertyId(quote.propertyId);
    if (existingProject) {
      throw new BadRequestException(
        `Property already has a project (${existingProject.projectNumber}). One property can only have one project.`,
      );
    }

    const contractVersion = this.pickContractQuoteVersion(quote);
    if (!contractVersion) {
      throw new BadRequestException(
        `Quote ${quote.quoteNumber} has no versions; there is nothing to convert.`,
      );
    }

    const customerName =
      property?.consumerName ||
      `${quote.customer.firstName} ${quote.customer.lastName || ''}`.trim() ||
      'Customer';
    const actualKw = contractVersion.totalWattageWp
      ? Number(contractVersion.totalWattageWp) / 1000
      : contractVersion.systemSizeKw;
    const actualKwFormatted = actualKw != null ? parseFloat(Number(actualKw).toFixed(2)) : '';
    const autoName =
      `${customerName} - ${actualKwFormatted ? `${actualKwFormatted}kW ` : ''}Solar Installation`.trim();
    const paymentMilestones: PaymentMilestone[] = contractVersion.paymentMilestones || [];

    // #region agent log
    {
      const pricing = contractVersion.quoteSnapshot?.pricing as
        | { subsidyAmount?: number; totalGst?: number; totalPrice?: number; gst5OnEquipment?: number; gst18OnServices?: number }
        | undefined;
      const milestoneSumRupees = paymentMilestones.reduce((s, m) => s + Number(m.amount ?? 0), 0);
      const finalPrice = Number(contractVersion.finalPrice ?? 0);
      const effectivePrice = Number(contractVersion.effectivePrice ?? 0);
      const subsidyAmount = Number(pricing?.subsidyAmount ?? 0);
      const totalGst = Number(pricing?.totalGst ?? 0);
      const snapshotTotalPrice = Number(pricing?.totalPrice ?? 0);
      const debugPayload = {quoteNumber:quote.quoteNumber,versionId:contractVersion.id,versionNumber:contractVersion.versionNumber,finalPrice,effectivePrice,subsidyAmount,totalGst,snapshotTotalPrice,gst5:Number(pricing?.gst5OnEquipment??0),gst18:Number(pricing?.gst18OnServices??0),milestoneCount:paymentMilestones.length,milestoneSumRupees,percentSum:paymentMilestones.reduce((s,m)=>s+Number(m.percentage??0),0),milestones:paymentMilestones.map((m)=>({name:m.name,percentage:m.percentage,amount:m.amount,amountType:typeof m.amount})),diffFinalMinusSchedule:Math.round((finalPrice-milestoneSumRupees)*100)/100,diffEqualsSubsidy:Math.abs(finalPrice-milestoneSumRupees-subsidyAmount)<0.02,diffEqualsGst:Math.abs(finalPrice-milestoneSumRupees-totalGst)<0.02,scheduleEqualsEffective:Math.abs(milestoneSumRupees-effectivePrice)<0.02,contractPaise:rupeesToPaise(finalPrice)};
      this.logger.warn(`[debug-5bace0] convertFromQuote financials ${JSON.stringify(debugPayload)}`);
      fetch('http://127.0.0.1:7349/ingest/4b53374e-fe26-4694-885e-4994385050c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5bace0'},body:JSON.stringify({sessionId:'5bace0',runId:'pre-fix',hypothesisId:'A',location:'project.service.ts:convertFromQuote',message:'Quote financials vs stored milestone schedule',data:debugPayload,timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion

    // Build milestone list: prefer explicit input, else derive names from payment milestone names
    const milestones: Array<{ name: string; order: number }> = convertDto?.milestones?.length
      ? convertDto.milestones.map((m) => ({ name: m.name, order: m.order }))
      : paymentMilestones.map((pm, i) => ({
          name: pm.name,
          order: pm.order || i + 1,
        }));

    const taskStatuses = convertDto?.taskStatuses?.length
      ? convertDto.taskStatuses
      : await this.resolveDefaultTaskStatuses();

    const project = await this.orchestrateProjectCreation({
      projectData: {
        propertyId: quote.propertyId,
        quoteId,
        // Pin the signed version. Without this the contract silently follows
        // whatever version happens to be newest, which is precisely the drift
        // migration 1851000000001 exists to stop.
        contractQuoteVersionId: contractVersion.id,
        name: convertDto?.name || autoName,
        description:
          convertDto?.description ||
          `Solar installation project converted from quote ${quote.quoteNumber}`,
        status: ProjectStatus.ACTIVE,
        priority: convertDto?.priority || ProjectPriority.NORMAL,
        progressPercentage: 0,
        startDate: convertDto?.startDate ? new Date(convertDto.startDate) : undefined,
        endDate: convertDto?.endDate ? new Date(convertDto.endDate) : undefined,
        taskStatuses: taskStatuses?.length ? taskStatuses : undefined,
      },
      propertyId: quote.propertyId,
      orgCode: COMPANY.code,
      createdBy,
      milestones,
      teamConfig: convertDto
        ? { pmId: convertDto.projectManagerId, members: convertDto.teamMembers }
        : undefined,
      excludedStepIds: convertDto?.excludedStepIds,
      taskAssignments: convertDto?.taskAssignments,
      taskMilestoneOverrides: convertDto?.taskMilestoneOverrides,
      paymentTermSnapshot: {
        sourceVersionId: contractVersion.id,
        milestones: paymentMilestones,
        // Gross contract, in paise. Subsidy is NOT deducted: the government
        // pays the customer directly, so the customer owes the full amount.
        contractPaise: rupeesToPaise(Number(contractVersion.finalPrice ?? 0)),
      },
    });

    // Copy BOM from quote version to project
    await this.copyQuoteBomToProject(contractVersion.id, project.id, createdBy);

    // Notify consumer about project onboarding (fire-and-forget)
    this.eventEmitter.emit(
      CONSUMER_EVENTS.PROJECT_ONBOARDED,
      new ProjectOnboardedEvent(
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
  async getProjectTimeline(projectId: string): Promise<{
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
    const project = await this.findById(projectId);

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
  async getProjectProgress(projectId: string): Promise<{
    totalTasks: number;
    statusCounts: Record<TaskStatus, number>;
    completionPercentage: number;
    overdueTasksCount: number;
    blockedTasksCount: number;
    upcomingDeadlines: Array<{ id: string; name: string; endDate: Date }>;
  }> {
    const project = await this.findById(projectId);

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
   * The quote version the customer actually signed.
   *
   * Taking the plain latest version is the defect this exists to prevent: a
   * quote revised after acceptance would silently move the contract, which is
   * how 12 production projects came to disagree with their own milestones.
   *
   * ACCEPTED is a terminal status and `update()` refuses accepted quotes, so in
   * practice no version should post-date acceptance — but nothing in the schema
   * enforces that, so anchor on `acceptedAt` explicitly rather than trusting it.
   *
   * Sorts on `version_number` first: it is NOT NULL and unique per quote, while
   * `quote_versions.created_at` is nullable and therefore an unsafe primary key
   * for ordering. When acceptance tells us nothing, fall back to the EARLIEST
   * version — the state at conversion — never the latest. That matches the
   * deliberate choice in BACKFILL_CONTRACT_QUOTE_VERSION.
   */
  private pickContractQuoteVersion(quote: QuoteEntity): QuoteVersionEntity | null {
    const versions = quote.versions ?? [];
    if (versions.length === 0) return null;

    const byVersionDesc = [...versions].sort((a, b) => {
      const n = b.versionNumber - a.versionNumber;
      if (n !== 0) return n;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

    const acceptedAt = quote.acceptedAt ? new Date(quote.acceptedAt).getTime() : null;
    if (acceptedAt !== null) {
      const signed = byVersionDesc.find(
        (v) => !v.createdAt || new Date(v.createdAt).getTime() <= acceptedAt,
      );
      if (signed) {
        // #region agent log
        {
          const versionPick = {quoteNumber:quote.quoteNumber,acceptedAt:quote.acceptedAt,pickedId:signed.id,pickedVersionNumber:signed.versionNumber,pickedFinalPrice:Number(signed.finalPrice??0),pickedEffectivePrice:Number(signed.effectivePrice??0),versionCount:byVersionDesc.length,versions:byVersionDesc.map((v)=>({id:v.id,n:v.versionNumber,finalPrice:Number(v.finalPrice??0),effectivePrice:Number(v.effectivePrice??0),createdAt:v.createdAt,milestoneCount:(v.paymentMilestones??[]).length,milestoneSumRupees:(v.paymentMilestones??[]).reduce((s,m)=>s+Number(m.amount??0),0)}))};
          this.logger.warn(`[debug-5bace0] pickContractQuoteVersion signed ${JSON.stringify(versionPick)}`);
          fetch('http://127.0.0.1:7349/ingest/4b53374e-fe26-4694-885e-4994385050c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5bace0'},body:JSON.stringify({sessionId:'5bace0',runId:'pre-fix',hypothesisId:'B',location:'project.service.ts:pickContractQuoteVersion',message:'Picked signed version at or before acceptedAt',data:versionPick,timestamp:Date.now()})}).catch(()=>{});
        }
        // #endregion
        return signed;
      }
    }

    const earliest = byVersionDesc[byVersionDesc.length - 1]!;
    this.logger.warn(
      `Quote ${quote.quoteNumber}: no version resolvable from acceptedAt; ` +
        `pinning earliest version ${earliest.versionNumber} (${earliest.id}) as the contract.`,
    );
    // #region agent log
    fetch('http://127.0.0.1:7349/ingest/4b53374e-fe26-4694-885e-4994385050c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5bace0'},body:JSON.stringify({sessionId:'5bace0',runId:'pre-fix',hypothesisId:'B',location:'project.service.ts:pickContractQuoteVersion',message:'Fell back to earliest version',data:{quoteNumber:quote.quoteNumber,acceptedAt:quote.acceptedAt,pickedId:earliest.id,pickedVersionNumber:earliest.versionNumber,pickedFinalPrice:Number(earliest.finalPrice??0),versionCount:byVersionDesc.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return earliest;
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
      contractPaise: number;
    };
  }): Promise<ProjectEntity> {
    const {
      projectData,
      propertyId,
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

      // 3b. Project tasks take over from here, so the sales chase is finished.
      // Same transaction as the conversion: a property cannot end up converted
      // while still carrying pending sales followups.
      //
      // ProjectEntity has no customerId of its own — it is derived from the
      // property — so read it back rather than threading it through the params.
      const converted = await manager
        .getRepository(CustomerPropertyEntity)
        .findOne({ where: { id: propertyId }, select: { id: true, customerId: true } });
      if (converted) {
        await this.leadClosureService.closeProperty(
          propertyId,
          converted.customerId,
          createdBy,
          manager,
        );
      }

      // 4. Set excluded steps on project
      await this.projectRepository.updateById(
        project.id,
        { excludedStepIds: excludedStepIds ?? [] },
        manager,
      );

      // 5. Apply workflow steps — milestone fields are set directly on each task
      await this.applyWorkflowStepsWithMilestones(
        project.id,
        createdBy,
        milestoneNameToOrder,
        taskMilestoneOverrides ?? [],
        excludedStepIds,
        project.startDate,
        manager,
      );

      await this.changeRequestTaskService.applyChangeRequestTasks({
        projectId: project.id,
        propertyId,
        createdBy,
        orgCode,
        manager,
      });

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
        await this.milestoneService.snapshotFromQuoteVersion({
          projectId: project.id,
          sourceVersionId: paymentTermSnapshot.sourceVersionId,
          milestones: paymentTermSnapshot.milestones,
          // Lets the snapshot derive amounts from percentages when a milestone
          // carries no explicit amount, rather than silently dropping it and
          // leaving the schedule short of the contract.
          contractPaise: paymentTermSnapshot.contractPaise,
          createdBy,
          manager,
        });
      }

      return this.projectRepository.findById(project.id, manager);
    });
  }

  /**
   * Apply workflow steps to a new project, setting milestone_name and milestone_order
   * directly on each task. Overrides from the wizard take precedence over step defaults.
   */
  private async applyWorkflowStepsWithMilestones(
    projectId: string,
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
    let steps = await this.workflowStepRepository.findAllActive(manager);

    if (steps.length === 0) return;

    if (excludedStepIds && excludedStepIds.length > 0) {
      const excludeSet = new Set(excludedStepIds);
      steps = steps.filter((s) => !excludeSet.has(s.id));
    }

    // Change-request templates are only instantiated when property has pending requests.
    steps = steps.filter((s) => !s.isSpecial && !s.changeRequestType);

    if (steps.length === 0) return;

    this.detectDependencyCycles(steps);

    const orgCode = COMPANY.code;

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
  async syncBomFromSnapshot(projectId: string, userId: string): Promise<void> {
    const project = await this.projectRepository.findById(projectId);

    const quote = await this.quoteService.findById(project.quoteId);

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
      const existingProjectBom = await this.bomService.findByEntity('project', projectId);
      if (existingProjectBom) {
        this.logger.debug(`Project ${projectId} already has BOM ${existingProjectBom.bomNumber}`);
        return;
      }

      // Find quote version BOM
      const quoteBom = await this.bomService.findByEntity('quote_version', quoteVersionId);

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

      await this.bomService.createFromItems('project', projectId, clonedItems, createdBy);

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

  private async resolveDefaultTaskStatuses(): Promise<TaskStatusConfig[] | undefined> {
    const lookups = await this.lookupRepository.findByTypeCodeRaw(
      LookupTypeCode.DEFAULT_TASK_STATUS,
    );
    if (!lookups.length) return undefined;

    return lookups.map((row) => ({
      code: row.code as TaskStatus,
      label: row.label,
      color: row.color ?? '#6B7280',
      orderIndex: row.orderIndex,
    }));
  }
}
