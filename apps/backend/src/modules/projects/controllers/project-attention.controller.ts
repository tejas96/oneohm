import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OrganizationContext } from '../../../common/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { AttentionResponseDto } from '../dto/attention-response.dto';
import { ProjectAttentionService } from '../services/project-attention.service';

@ApiTags('Project Attention')
@Controller('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProjectAttentionController {
  constructor(private readonly projectAttentionService: ProjectAttentionService) {}

  @Get(':id/attention')
  @ApiOperation({
    summary: 'Get project attention items',
    description:
      'Returns prioritized attention items for project tasks, milestones, materials, and payments.',
  })
  @ApiResponse({ status: 200, type: [AttentionResponseDto] })
  async getProjectAttention(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttentionResponseDto[]> {
    return this.projectAttentionService.getProjectAttention(id, organizationId);
  }
}
