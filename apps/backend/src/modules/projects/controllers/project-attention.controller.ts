import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ResellerAllowed, ResellerOwnershipService, ResellerScope } from '../../../common/reseller';
import { JwtAuthGuard } from '../../auth/guards';
import { AttentionResponseDto } from '../dto/attention-response.dto';
import { ProjectAttentionService } from '../services/project-attention.service';

@ApiTags('Project Attention')
@Controller('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProjectAttentionController {
  constructor(
    private readonly projectAttentionService: ProjectAttentionService,
    private readonly ownership: ResellerOwnershipService,
  ) {}

  @ResellerAllowed()
  @Get(':id/attention')
  @ApiOperation({
    summary: 'Get project attention items',
    description:
      'Returns prioritized attention items for project tasks, milestones, materials, and payments.',
  })
  @ApiResponse({ status: 200, type: [AttentionResponseDto] })
  async getProjectAttention(
    @Param('id', ParseUUIDPipe) id: string,
    @ResellerScope() resellerId?: string,
  ): Promise<AttentionResponseDto[]> {
    if (resellerId) await this.ownership.assertOwns('project', id, resellerId);
    return this.projectAttentionService.getProjectAttention(id);
  }
}
