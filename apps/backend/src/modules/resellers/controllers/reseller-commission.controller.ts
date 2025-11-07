import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard, Role, Roles, RolesGuard } from '@oneohm-epc/shared-auth';
import { CommissionStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';

import {
  CommissionResponseDto,
  CreateCommissionDto,
  UpdateCommissionDto,
  UpdateCommissionStatusDto,
} from '../dto';
import { ResellerCommissionService } from '../services/reseller-commission.service';

/**
 * Reseller Commission Controller
 * Handles HTTP requests for commission management
 */
@ApiTags('Reseller Commissions')
@ApiBearerAuth()
@Controller('api/v1/commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResellerCommissionController {
  constructor(private readonly commissionService: ResellerCommissionService) {}

  /**
   * Create a new commission record
   */
  @ApiCreate({
    summary: 'Create a new commission',
    description: 'Creates a new commission record for a reseller.',
    responseType: CommissionResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
    additionalErrors: [
      {
        status: 400,
        description: 'Commission calculation mismatch',
      },
    ],
  })
  async create(
    @Body() createDto: CreateCommissionDto,
    @CurrentUser() currentUser: any,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );
    return commission as CommissionResponseDto;
  }

  /**
   * Get all commissions
   */
  @ApiReadAll({
    summary: 'Get all commissions',
    description: 'Retrieve all commission records for the current organization.',
    responseType: CommissionResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
    additionalQueries: [
      {
        name: 'status',
        required: false,
        enum: CommissionStatus,
        description: 'Filter by commission status',
      },
      {
        name: 'resellerId',
        required: false,
        type: 'string',
        description: 'Filter by reseller ID',
      },
    ],
  })
  async findAll(
    @CurrentUser() currentUser: any,
    @Query('status') status?: CommissionStatus,
    @Query('resellerId') resellerId?: string,
  ): Promise<CommissionResponseDto[]> {
    if (status) {
      const commissions = await this.commissionService.findByStatus(
        currentUser.organizationId,
        status,
      );
      return commissions as CommissionResponseDto[];
    }

    if (resellerId) {
      const commissions = await this.commissionService.findByResellerId(
        resellerId,
        currentUser.organizationId,
      );
      return commissions as CommissionResponseDto[];
    }

    const commissions = await this.commissionService.findAll(currentUser.organizationId);
    return commissions as CommissionResponseDto[];
  }

  /**
   * Get commission by ID
   */
  @ApiReadOne({
    summary: 'Get commission by ID',
    description: 'Retrieve a specific commission record by its ID.',
    responseType: CommissionResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.findById(id, currentUser.organizationId);
    return commission as CommissionResponseDto;
  }

  /**
   * Update commission
   */
  @ApiUpdate({
    summary: 'Update commission',
    description: 'Update commission record details.',
    responseType: CommissionResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
    additionalErrors: [
      {
        status: 400,
        description: 'Cannot update paid or cancelled commissions',
      },
    ],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCommissionDto,
    @CurrentUser() currentUser: any,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );
    return commission as CommissionResponseDto;
  }

  /**
   * Update commission status (generic)
   */
  @ApiAction({
    path: 'status',
    summary: 'Update commission status',
    description: `Update commission status (${Object.values(CommissionStatus).join(', ')}). Handles approval and payment workflows.`,
    responseType: CommissionResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCommissionStatusDto,
    @CurrentUser() currentUser: any,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.updateStatus(
      id,
      currentUser.organizationId,
      statusDto.status,
      currentUser.id,
    );
    return commission as CommissionResponseDto;
  }

  /**
   * Delete commission
   */
  @ApiDelete({
    summary: 'Delete commission',
    description: 'Soft delete a commission record. Cannot delete paid commissions.',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    additionalErrors: [
      {
        status: 400,
        description: 'Cannot delete paid commissions',
      },
    ],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ): Promise<void> {
    await this.commissionService.delete(id, currentUser.organizationId);
  }

  /**
   * Get total commission earned by a reseller
   */
  @Get('reseller/:resellerId/total')
  @ApiOperation({ summary: 'Get total commission earned' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Total commission retrieved' })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async getTotalCommissionEarned(
    @Param('resellerId', ParseUUIDPipe) resellerId: string,
    @CurrentUser() currentUser: any,
  ): Promise<{ resellerId: string; totalCommissionEarned: number }> {
    const total = await this.commissionService.getTotalCommissionEarned(
      resellerId,
      currentUser.organizationId,
    );
    return {
      resellerId,
      totalCommissionEarned: total,
    };
  }
}
