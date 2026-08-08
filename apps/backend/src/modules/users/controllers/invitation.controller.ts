import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { CreateInvitationDto } from '../dto/create-invitation.dto';
import { InvitationResponseDto } from '../dto/invitation-response.dto';
import { InvitationStatus } from '../entities/invitation.entity';
import { InvitationRepository } from '../repositories/invitation.repository';
import { InvitationService } from '../services/invitation.service';

@ApiTags('Invitations')
@ApiBearerAuth()
@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationController {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly invitationRepository: InvitationRepository,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Send invitation',
    description: 'Send an invitation email to a new user',
  })
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationService.createInvitation({
      email: dto.email,
      roleId: dto.roleId,
      invitedBy: user.id,
    });

    return this.toResponseDto(invitation);
  }

  @Get()
  @ApiOperation({
    summary: 'List invitations',
    description: 'Get paginated list of invitations',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: InvitationStatus })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: InvitationStatus,
  ): Promise<{ data: InvitationResponseDto[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;
    const [invitations, total] = await this.invitationRepository.findAllPaginated(skip, pageSize, {
      status,
    });

    return {
      data: invitations.map((inv) => this.toResponseDto(inv)),
      total,
      page,
      pageSize,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel invitation',
    description: 'Cancel a pending invitation',
  })
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.invitationService.cancelInvitation(id);
    return { message: 'Invitation cancelled' };
  }

  @Post(':id/resend')
  @ApiOperation({
    summary: 'Resend invitation',
    description: 'Cancel old invitation and create a new one with fresh token',
  })
  async resend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationService.resendInvitation(id, user.id);
    return this.toResponseDto(invitation);
  }

  private toResponseDto(
    entity: import('../entities/invitation.entity').InvitationEntity,
  ): InvitationResponseDto {
    const dto = plainToInstance(InvitationResponseDto, entity, {
      excludeExtraneousValues: true,
    });
    dto.roleName = entity.role?.name;
    return dto;
  }
}
