import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ReportRenderResult, ReportWorkspace } from '@tejas96/shared/reports';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  FileReportDto,
  RenderReportDto,
  ReportsPendingDto,
  UpdateReportFactsDto,
} from '../dto/report-workspace.dto';
import { ReportWorkspaceService } from '../services/report-workspace.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly workspace: ReportWorkspaceService) {}

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Every report fact and every report status for a project' })
  getWorkspace(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<ReportWorkspace> {
    return this.workspace.getWorkspace(projectId);
  }

  @Patch('projects/:projectId/facts')
  @ApiOperation({ summary: 'Set or clear (null) hand-typed report facts' })
  updateFacts(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateReportFactsDto,
  ): Promise<ReportWorkspace> {
    return this.workspace.updateFacts(projectId, dto.facts);
  }

  @Post('projects/:projectId/render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render one report from stored facts' })
  render(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: RenderReportDto,
  ): Promise<ReportRenderResult> {
    return this.workspace.render(projectId, dto.reportId);
  }

  @Post('projects/:projectId/file')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'File a generated report PDF against the project' })
  file(
    @CurrentUser() user: CurrentUserType,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: FileReportDto,
  ): Promise<{ documentId: string; fileUrl: string }> {
    return this.workspace.file(projectId, dto.reportId, dto.file, user.id);
  }

  @Post('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pending report count per project, for list badges' })
  pending(@Body() dto: ReportsPendingDto): Promise<Record<string, number>> {
    return this.workspace.pendingCounts(dto.projectIds);
  }
}
