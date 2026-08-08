import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { toDto, toDtoArray } from '../../../common/utils';
import { JwtAuthGuard } from '../../auth/guards';
import { DocumentService } from '../../documents/services/document.service';
import { ProjectLedgerService } from '../../ledger/services/project-ledger.service';
import { ProjectResponseDto } from '../../projects/dto';
import { ProjectSummaryResponseDto } from '../../projects/dto/analytics';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { ProjectAnalyticsService } from '../../projects/services/project-analytics.service';
import { ProjectService } from '../../projects/services/project.service';
import {
  ConsumerDocumentDto,
  ConsumerFinancialSummaryResponseDto,
  ConsumerProjectDocumentsResponseDto,
  ConsumerProjectPaymentsResponseDto,
  ConsumerProjectTimelineResponseDto,
} from '../dto';
import { CustomerOwnershipGuard } from '../guards';
import { resolveQuoteFinancialFields } from '../utils/consumer-project-quote.utils';

/**
 * Consumer Project Controller
 * Customer-safe project read endpoints under /consumer/* — guarded by JwtAuthGuard + CustomerOwnershipGuard.
 */
@ApiTags('Consumer')
@ApiBearerAuth()
@Controller('consumer')
@UseGuards(JwtAuthGuard, CustomerOwnershipGuard)
export class ConsumerProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectAnalyticsService: ProjectAnalyticsService,
    private readonly projectRepository: ProjectRepository,
    private readonly projectLedgerService: ProjectLedgerService,
    private readonly documentService: DocumentService,
  ) {}

  @Get('properties/:propertyId/project')
  @ApiOperation({
    summary: 'Get project for a property',
    description:
      'Returns the project associated with an owned property. ' +
      'If the property has not been converted to a project yet, returns { project: null }.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project details or null if no project exists',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async findProjectByProperty(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<{ project: ProjectResponseDto | null }> {
    const existing = await this.projectRepository.findOneByPropertyId(propertyId);

    if (!existing) {
      return { project: null };
    }

    const project = await this.projectService.findById(existing.id);

    return {
      project: plainToInstance(ProjectResponseDto, project, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Get('projects/:projectId/dashboard')
  @ApiOperation({
    summary: 'Get project dashboard for customer',
    description:
      'Returns aggregated analytics for an owned project: task metrics, ' +
      'status/priority breakdowns, recent activity, team workload, and milestone progress.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project summary dashboard data',
    type: ProjectSummaryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async getProjectDashboard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectSummaryResponseDto> {
    return this.projectAnalyticsService.getProjectSummary(projectId);
  }

  @Get('projects/:projectId/payments')
  @ApiOperation({
    summary: 'Get payment terms for an owned project',
    description:
      'Returns per-term expected/paid amounts and statuses from the project receipt ledger.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment terms for the project',
    type: ConsumerProjectPaymentsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async getProjectPayments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ConsumerProjectPaymentsResponseDto> {
    const summary = await this.projectLedgerService.getProjectSummary(projectId);
    const project = await this.projectService.findById(projectId);
    const { contractValue } = resolveQuoteFinancialFields(project);

    const terms = summary.terms.map((term) => ({
      ...term,
      expectedPercentage:
        contractValue > 0 ? Math.round((term.expectedAmount / contractValue) * 1000) / 10 : null,
    }));

    return toDto(ConsumerProjectPaymentsResponseDto, { terms });
  }

  @Get('projects/:projectId/financial-summary')
  @ApiOperation({
    summary: 'Get financial summary for an owned project',
    description:
      'Returns ledger totals plus contract value, subsidy, and net cost from the accepted quote.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Financial summary for the project',
    type: ConsumerFinancialSummaryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async getProjectFinancialSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ConsumerFinancialSummaryResponseDto> {
    const [summary, project] = await Promise.all([
      this.projectLedgerService.getProjectSummary(projectId),
      this.projectService.findById(projectId),
    ]);
    const { contractValue, subsidyAmount, netCost } = resolveQuoteFinancialFields(project);

    return toDto(ConsumerFinancialSummaryResponseDto, {
      totalExpected: summary.totals.totalExpected,
      totalReceived: summary.totals.totalReceived,
      pending: summary.totals.pending,
      receiptCount: summary.totals.receiptCount,
      contractValue,
      subsidyAmount,
      netCost,
      startDate: project.startDate ?? null,
      endDate: project.endDate ?? null,
    });
  }

  @Get('projects/:projectId/timeline')
  @ApiOperation({
    summary: 'Get installation timeline for an owned project',
    description:
      'Returns milestone aggregates (task progress by milestone group) for the consumer project tab.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone timeline for the project',
    type: ConsumerProjectTimelineResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async getProjectTimeline(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ConsumerProjectTimelineResponseDto> {
    const milestones = await this.projectAnalyticsService.getMilestoneAggregates(projectId);
    return toDto(ConsumerProjectTimelineResponseDto, { milestones });
  }

  @Get('projects/:projectId/documents')
  @ApiOperation({
    summary: 'Get documents for an owned project',
    description: 'Returns customer-visible documents linked to the project property.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Documents for the project',
    type: ConsumerProjectDocumentsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async getProjectDocuments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ConsumerProjectDocumentsResponseDto> {
    const project = await this.projectService.findById(projectId);
    const docs = await this.documentService.findByProperty(project.propertyId);

    const documents = toDtoArray(ConsumerDocumentDto, docs);
    return toDto(ConsumerProjectDocumentsResponseDto, { documents });
  }
}
