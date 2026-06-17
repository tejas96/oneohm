import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommissionStatus } from '@tejas96/shared/types';

import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
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
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class ResellerCommissionController {
  constructor(private readonly commissionService: ResellerCommissionService) {}

  /**
   * Create a new commission record
   */
  @ApiCreate({
    summary: 'Create a new commission',
    description: 'Creates a new commission record for a reseller.',
    responseType: CommissionResponseDto,
    additionalErrors: [
      {
        status: 400,
        description: 'Commission calculation mismatch',
      },
    ],
  })
  async create(
    @OrganizationContext() organizationId: string,
    @Body() createDto: CreateCommissionDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.create(
      organizationId,
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
        type: String,
        description: 'Filter by reseller ID',
      },
    ],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('status') status?: CommissionStatus,
    @Query('resellerId') resellerId?: string,
  ): Promise<CommissionResponseDto[]> {
    if (status) {
      const commissions = await this.commissionService.findByStatus(organizationId, status);
      return commissions as CommissionResponseDto[];
    }

    if (resellerId) {
      const commissions = await this.commissionService.findByResellerId(resellerId, organizationId);
      return commissions as CommissionResponseDto[];
    }

    const commissions = await this.commissionService.findAll(organizationId);
    return commissions as CommissionResponseDto[];
  }

  /**
   * Get commission by ID
   */
  @ApiReadOne({
    summary: 'Get commission by ID',
    description: 'Retrieve a specific commission record by its ID.',
    responseType: CommissionResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.findById(id, organizationId);
    return commission as CommissionResponseDto;
  }

  /**
   * Update commission
   */
  @ApiUpdate({
    summary: 'Update commission',
    description: 'Update commission record details.',
    responseType: CommissionResponseDto,
    additionalErrors: [
      {
        status: 400,
        description: 'Cannot update paid or cancelled commissions',
      },
    ],
  })
  async update(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCommissionDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.update(
      id,
      organizationId,
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
  })
  async updateStatus(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCommissionStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.updateStatus(
      id,
      organizationId,
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
    additionalErrors: [
      {
        status: 400,
        description: 'Cannot delete paid commissions',
      },
    ],
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<void> {
    await this.commissionService.delete(id, organizationId);
  }

  /**
   * Get total commission earned by a reseller
   */
  @Get('reseller/:resellerId/total')
  @ApiOperation({ summary: 'Get total commission earned' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Total commission retrieved' })
  async getTotalCommissionEarned(
    @OrganizationContext() organizationId: string,
    @Param('resellerId', ParseUUIDPipe) resellerId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ resellerId: string; totalCommissionEarned: number }> {
    const total = await this.commissionService.getTotalCommissionEarned(resellerId, organizationId);
    return {
      resellerId,
      totalCommissionEarned: total,
    };
  }
}
