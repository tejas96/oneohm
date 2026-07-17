import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { ReportsPendingSummaryDto } from '../dto/report-completeness-response.dto';
import {
  ReportInitializeDto,
  ReportInitializeResponseDto,
  ReportPreviewResponseDto,
  ReportRenderDto,
  ReportSaveDto,
  ReportSaveResponseDto,
} from '../dto/report.dto';
import { ReportEngineService } from '../engine/report-engine.service';
import type { ReportEngineContext } from '../registry/report-plugin.interface';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportEngine: ReportEngineService) {}

  @Get()
  @ApiOperation({ summary: 'List available report templates' })
  list() {
    return this.reportEngine.listCatalog();
  }

  @Get('completeness')
  @ApiOperation({ summary: 'Get completeness summary for all reports of a project' })
  @ApiResponse({ status: HttpStatus.OK, type: ReportsPendingSummaryDto })
  async getCompleteness(
    @OrganizationContext() organizationId: string,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ReportsPendingSummaryDto> {
    return this.reportEngine.getCompleteness(projectId, organizationId);
  }

  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize report — fetch project data and merge saved fields' })
  @ApiResponse({ status: HttpStatus.OK, type: ReportInitializeResponseDto })
  async initialize(
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: ReportInitializeDto,
  ): Promise<ReportInitializeResponseDto> {
    return this.reportEngine.initialize(
      dto.reportId,
      this.buildContext(dto, organizationId, user),
      { ignoreSavedDraft: dto.ignoreSavedDraft },
    );
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render preview HTML from field snapshot' })
  async preview(
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: ReportRenderDto,
  ): Promise<ReportPreviewResponseDto> {
    return this.reportEngine.preview(
      dto.reportId,
      this.buildContext(dto, organizationId, user),
      dto.fields,
    );
  }

  @Post('save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save client-generated PDF and field snapshot to project documents' })
  @ApiResponse({ status: HttpStatus.OK, type: ReportSaveResponseDto })
  async save(
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: ReportSaveDto,
  ): Promise<ReportSaveResponseDto> {
    return this.reportEngine.save(
      dto.reportId,
      this.buildContext(dto, organizationId, user),
      dto.fields,
      dto.file,
    );
  }

  private buildContext(
    dto: ReportInitializeDto | ReportRenderDto,
    organizationId: string,
    user: CurrentUserType,
  ): ReportEngineContext {
    return {
      organizationId,
      userId: user.id,
      entityType: dto.context.entityType,
      entityId: dto.context.entityId,
    };
  }
}
