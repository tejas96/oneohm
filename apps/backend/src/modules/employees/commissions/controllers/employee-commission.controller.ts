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
  ApiUpdate
} from '../../../../common/decorators';
import { CurrentUser } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/guards';
import type { CurrentUserType } from '../../../auth/types';
import {
  CommissionResponseDto,
  CreateCommissionDto,
  UpdateCommissionDto,
  UpdateCommissionStatusDto,
} from '../dto';
import { EmployeeCommissionService } from '../services/employee-commission.service';

/**
 * Employee Commission Controller
 * Handles HTTP requests for commission management.
 * Renamed from ResellerCommissionController; route prefix stays `/commissions`
 * (still a reasonable generic name), but the reseller sub-route now uses
 * `employee` for consistency with the merge into the employees module.
 */
@ApiTags('Employee Commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class EmployeeCommissionController {
  constructor(private readonly commissionService: EmployeeCommissionService) {}

  /**
   * Create a new commission record
   */
  @ApiCreate({
    summary: 'Create a new commission',
    description: 'Creates a new commission record for an employee (reseller-kind profile).',
    responseType: CommissionResponseDto,
    additionalErrors: [
      {
        status: 400,
        description: 'Commission calculation mismatch',
      },
    ],
  })
  async create(
    @Body() createDto: CreateCommissionDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.create(
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
        name: 'employeeId',
        required: false,
        type: String,
        description: 'Filter by employee (reseller-kind profile) ID',
      },
    ],
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('status') status?: CommissionStatus,
    @Query('employeeId') employeeId?: string,
  ): Promise<CommissionResponseDto[]> {
    if (status) {
      const commissions = await this.commissionService.findByStatus(status);
      return commissions as CommissionResponseDto[];
    }

    if (employeeId) {
      const commissions = await this.commissionService.findByEmployeeId(employeeId);
      return commissions as CommissionResponseDto[];
    }

    const commissions = await this.commissionService.findAll();
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.findById(id);
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCommissionDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.update(
      id,
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCommissionStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<CommissionResponseDto> {
    const commission = await this.commissionService.updateStatus(
      id,
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<void> {
    await this.commissionService.delete(id);
  }

  /**
   * Get total commission earned by an employee (reseller-kind profile)
   */
  @Get('employee/:employeeId/total')
  @ApiOperation({ summary: 'Get total commission earned' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Total commission retrieved' })
  async getTotalCommissionEarned(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ employeeId: string; totalCommissionEarned: number }> {
    const total = await this.commissionService.getTotalCommissionEarned(employeeId);
    return {
      employeeId,
      totalCommissionEarned: total,
    };
  }
}
