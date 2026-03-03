import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationContext } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { AddTeamMemberDto, TeamMemberResponseDto, UpdateTeamMemberDto } from '../dto/project-team';
import { ProjectTeamGuard } from '../guards';
import { ProjectTeamService } from '../services/project-team.service';

@ApiTags('Project Team')
@ApiBearerAuth()
@Controller('projects/:projectId/team')
@UseGuards(JwtAuthGuard, ProjectTeamGuard)
export class ProjectTeamController {
  constructor(private readonly teamService: ProjectTeamService) {}

  @Post()
  @ApiOperation({ summary: 'Add a team member to a project' })
  async addMember(
    @OrganizationContext() organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Body() dto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamService.addMember({
      projectId,
      organizationId,
      userId: dto.userId,
      roleName: dto.roleName,
      isProjectManager: dto.isProjectManager,
    });

    return plainToInstance(TeamMemberResponseDto, member, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all team members for a project' })
  async getTeamMembers(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<TeamMemberResponseDto[]> {
    const members = await this.teamService.getTeamMembers(projectId);

    return plainToInstance(TeamMemberResponseDto, members, {
      excludeExtraneousValues: true,
    });
  }

  @Get('count')
  @ApiOperation({ summary: 'Get team member count for a project' })
  async getTeamCount(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ count: number }> {
    const count = await this.teamService.getTeamCount(projectId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific team member' })
  async getTeamMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamService.getTeamMember(id, projectId);

    return plainToInstance(TeamMemberResponseDto, member, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team member' })
  async updateMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Body() dto: UpdateTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamService.updateMember(id, projectId, dto);

    return plainToInstance(TeamMemberResponseDto, member, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a team member from a project' })
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ message: string }> {
    await this.teamService.removeMember(id, projectId);
    return { message: 'Team member removed successfully' };
  }
}
