import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SiteVisitStatus, type PaginatedResponse } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';

import { toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { SiteVisitResponseDto } from '../dto';
import { SiteVisitService } from '../services/site-visit.service';

/**
 * Site Visit Controller
 * Handles listing and dashboard-related endpoints for site visits
 *
 * Note: CRUD operations for specific properties are handled in CustomerPropertyController
 * via nested routes: /customer-properties/:propertyId/site-visit
 */
@ApiTags('Site Visits')
@ApiBearerAuth()
@Controller('site-visits')
@UseGuards(JwtAuthGuard)
export class SiteVisitController {
  constructor(private readonly siteVisitService: SiteVisitService) {}

  /**
   * List site visits with optional filters
   * By default returns visits for properties created by the current user
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List site visits',
    description:
      'Retrieve site visits with optional filters. Use createdBy=me to get only your visits.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SiteVisitStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: String,
    description: 'Filter by creator. Use "me" for current user\'s visits',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter by date (YYYY-MM-DD or "today")',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of site visits',
    type: [SiteVisitResponseDto],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('status') status?: SiteVisitStatus,
    @Query('createdBy') createdBy?: string,
    @Query('date') date?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<PaginatedResponse<SiteVisitResponseDto>> {
    // Parse date filter
    let dateFilter: Date | undefined;
    if (date) {
      if (date === 'today') {
        dateFilter = new Date();
      } else {
        dateFilter = new Date(date);
      }
    }

    // If createdBy=me, filter by current user
    if (createdBy === 'me') {
      const result = await this.siteVisitService.findByUser(
        currentUser.id,
        { status, date: dateFilter },
        page,
        limit,
      );
      return toPaginatedResponse(SiteVisitResponseDto, result.data, result.total, page, limit);
    }

    // Otherwise, return all visits for the organization
    const result = await this.siteVisitService.findByOrganization(
      organizationId,
      { status },
      page,
      limit,
    );
    return toPaginatedResponse(SiteVisitResponseDto, result.data, result.total, page, limit);
  }

  /**
   * Get status counts for dashboard
   */
  @Get('statistics/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get site visit status statistics',
    description: 'Returns count of site visits grouped by status for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status statistics',
    schema: {
      type: 'object',
      properties: {
        pending: { type: 'number', example: 5 },
        in_progress: { type: 'number', example: 2 },
        completed: { type: 'number', example: 10 },
      },
    },
  })
  async getStatusStatistics(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<Record<string, number>> {
    return this.siteVisitService.getStatusCounts(currentUser.id);
  }
}
