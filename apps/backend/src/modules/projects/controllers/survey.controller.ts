import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCreate, ApiDelete, ApiUpdate, OrganizationContext } from '@oneohm-epc/shared-utils';

import { toDto } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { SurveyResponseDto, UpdateSurveyDto, UpdateSurveyStatusDto, UpsertSurveyDto } from '../dto';
import { ProjectTeamGuard } from '../guards';
import { SurveyService } from '../services/survey.service';

/**
 * Survey Controller
 * Handles HTTP requests for site survey management (one-to-one with project)
 */
@ApiTags('Projects & Installation')
@ApiBearerAuth()
@Controller('projects/:projectId/survey')
@UseGuards(JwtAuthGuard, ProjectTeamGuard)
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  /**
   * Create or update the site survey (idempotent upsert)
   */
  @Put()
  @ApiCreate({
    summary: 'Create or update site survey',
    description: 'Creates a new survey or updates the existing one for this project',
    responseType: SurveyResponseDto,
  })
  async upsert(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpsertSurveyDto,
  ): Promise<SurveyResponseDto> {
    const survey = await this.surveyService.upsert(organizationId, projectId, dto, currentUser.id);
    return toDto(SurveyResponseDto, survey);
  }

  /**
   * Get the survey for a project
   */
  @Get()
  @ApiOperation({
    summary: 'Get site survey',
    description: 'Retrieve the site survey for a project',
  })
  async findByProject(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<SurveyResponseDto | null> {
    const survey = await this.surveyService.findByProject(projectId, organizationId);

    return survey ? toDto(SurveyResponseDto, survey) : null;
  }

  /**
   * Partially update the survey
   */
  @Patch()
  @ApiUpdate({
    summary: 'Update site survey',
    description: 'Partially update survey findings and details',
    responseType: SurveyResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateSurveyDto,
  ): Promise<SurveyResponseDto> {
    const survey = await this.surveyService.update(projectId, organizationId, dto, currentUser.id);
    return toDto(SurveyResponseDto, survey);
  }

  /**
   * Soft delete the survey
   */
  @Delete()
  @ApiDelete({
    summary: 'Delete site survey',
    description: 'Soft delete the survey (only scheduled surveys can be deleted)',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ message: string }> {
    await this.surveyService.delete(projectId, organizationId);
    return { message: 'Survey deleted successfully' };
  }

  /**
   * Update survey status with FSM validation
   */
  @Patch('status')
  @ApiOperation({
    summary: 'Update survey status',
    description: 'Change survey status with state machine validation',
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateSurveyStatusDto,
  ): Promise<SurveyResponseDto> {
    const survey = await this.surveyService.updateStatus(projectId, organizationId, dto.status);
    return toDto(SurveyResponseDto, survey);
  }
}
