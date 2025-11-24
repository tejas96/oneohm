import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SiteSurveyStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateSurveyDto, SurveyResponseDto, UpdateSurveyDto } from '../dto';
import { SurveyService } from '../services/survey.service';

/**
 * Survey Controller
 * Handles HTTP requests for site survey management
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects/:projectId/surveys')
@UseGuards(JwtAuthGuard)
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  /**
   * Create a new site survey
   */
  @Post()
  @ApiCreate({
    summary: 'Create a new site survey',
    description: 'Creates a new pre-installation site survey',
    responseType: SurveyResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createDto: CreateSurveyDto,
  ): Promise<SurveyResponseDto> {
    // Ensure projectId in path matches DTO
    createDto.projectId = projectId;

    const survey = await this.surveyService.create(organizationId, createDto);

    return plainToInstance(SurveyResponseDto, survey, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all surveys for a project
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all surveys',
    description: 'Retrieve all site surveys for a project',
    responseType: SurveyResponseDto,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(SiteSurveyStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'surveyorId',
    required: false,
    type: String,
    description: 'Filter by surveyor user ID',
  })
  async findByProject(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: SiteSurveyStatus,
    @Query('surveyorId') surveyorId?: string,
  ): Promise<SurveyResponseDto[]> {
    const surveys = await this.surveyService.findByProject(projectId, organizationId, {
      status,
      surveyorId,
    });

    return plainToInstance(SurveyResponseDto, surveys, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get survey by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get survey by ID',
    description: 'Retrieve a single survey with all details',
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SurveyResponseDto> {
    const survey = await this.surveyService.findById(id, projectId, organizationId);

    return plainToInstance(SurveyResponseDto, survey, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update a survey
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update a survey',
    description: 'Update survey findings and details',
    responseType: SurveyResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSurveyDto,
  ): Promise<SurveyResponseDto> {
    const survey = await this.surveyService.update(id, projectId, organizationId, updateDto);

    return plainToInstance(SurveyResponseDto, survey, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete a survey
   */
  @Delete(':id')
  @ApiDelete({
    summary: 'Delete a survey',
    description: 'Delete a survey (only scheduled)',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.surveyService.delete(id, projectId, organizationId);
    return { message: 'Survey deleted successfully' };
  }

  /**
   * Update survey status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update survey status',
    description: 'Change survey status',
  })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: Object.values(SiteSurveyStatus),
    description: 'New status',
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: SiteSurveyStatus,
  ): Promise<SurveyResponseDto> {
    const survey = await this.surveyService.updateStatus(id, projectId, organizationId, status);

    return plainToInstance(SurveyResponseDto, survey, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get latest survey
   */
  @Get('latest/survey')
  @ApiOperation({
    summary: 'Get latest survey',
    description: 'Retrieve the most recent survey for a project',
  })
  async findLatest(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<SurveyResponseDto | null> {
    const survey = await this.surveyService.findLatest(projectId, organizationId);

    return survey
      ? plainToInstance(SurveyResponseDto, survey, {
          excludeExtraneousValues: true,
        })
      : null;
  }
}
