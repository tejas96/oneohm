import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';

import { OrganizationContext } from '../../../common/decorators';
import { toPaginatedResponse, toDto } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  CreateSiteActivityDto,
  QuerySiteActivityDto,
  SiteActivityResponseDto,
  UpdateSiteActivityDto,
} from '../dto';
import { SiteActivityService } from '../services/site-activity.service';

@ApiTags('Site Activities')
@ApiBearerAuth()
@Controller('site-activities')
@UseGuards(JwtAuthGuard)
export class SiteActivityController {
  constructor(private readonly siteActivityService: SiteActivityService) {}

  @Get('statistics/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get site activity status statistics' })
  async getStatusStatistics(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<Record<string, number>> {
    return this.siteActivityService.getStatusCounts(organizationId, currentUser.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a site activity for a property (one per property)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SiteActivityResponseDto })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateSiteActivityDto,
  ): Promise<SiteActivityResponseDto> {
    const activity = await this.siteActivityService.create(
      organizationId,
      createDto,
      currentUser.id,
    );
    return toDto(SiteActivityResponseDto, activity);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List site activities with filters' })
  @ApiResponse({ status: HttpStatus.OK, type: [SiteActivityResponseDto] })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query() queryDto: QuerySiteActivityDto,
  ): Promise<PaginatedResponse<SiteActivityResponseDto>> {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 20;

    let dateFilter: Date | undefined;
    if (queryDto.date) {
      dateFilter = queryDto.date === 'today' ? new Date() : new Date(queryDto.date);
    }

    if (queryDto.createdBy === 'me') {
      const result = await this.siteActivityService.findByUser(
        organizationId,
        currentUser.id,
        { overallStatus: queryDto.overallStatus, date: dateFilter },
        page,
        limit,
      );
      return toPaginatedResponse(SiteActivityResponseDto, result.data, result.total, page, limit);
    }

    const result = await this.siteActivityService.findAll(
      organizationId,
      {
        overallStatus: queryDto.overallStatus,
        propertyId: queryDto.propertyId,
        isSiteVisitDone: queryDto.isSiteVisitDone,
        isSiteSurveyDone: queryDto.isSiteSurveyDone,
      },
      page,
      limit,
    );
    return toPaginatedResponse(SiteActivityResponseDto, result.data, result.total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single site activity' })
  @ApiResponse({ status: HttpStatus.OK, type: SiteActivityResponseDto })
  async findOne(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SiteActivityResponseDto> {
    const activity = await this.siteActivityService.findById(id, organizationId);
    return toDto(SiteActivityResponseDto, activity);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update site activity (visit or survey data)' })
  @ApiResponse({ status: HttpStatus.OK, type: SiteActivityResponseDto })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSiteActivityDto,
  ): Promise<SiteActivityResponseDto> {
    const activity = await this.siteActivityService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return toDto(SiteActivityResponseDto, activity);
  }

  @Post(':id/complete-visit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete the visit phase' })
  @ApiResponse({ status: HttpStatus.OK, type: SiteActivityResponseDto })
  async completeVisit(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SiteActivityResponseDto> {
    const activity = await this.siteActivityService.completeVisit(
      id,
      organizationId,
      currentUser.id,
    );
    return toDto(SiteActivityResponseDto, activity);
  }

  @Post(':id/complete-survey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete the survey phase (requires visit to be done)' })
  @ApiResponse({ status: HttpStatus.OK, type: SiteActivityResponseDto })
  async completeSurvey(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SiteActivityResponseDto> {
    const activity = await this.siteActivityService.completeSurvey(
      id,
      organizationId,
      currentUser.id,
    );
    return toDto(SiteActivityResponseDto, activity);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a site activity (sets status to CANCELLED)' })
  @ApiResponse({ status: HttpStatus.OK, type: SiteActivityResponseDto })
  async cancel(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SiteActivityResponseDto> {
    const activity = await this.siteActivityService.cancel(id, organizationId, currentUser.id);
    return toDto(SiteActivityResponseDto, activity);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a site activity' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.siteActivityService.delete(id, organizationId, currentUser.id);
  }
}
