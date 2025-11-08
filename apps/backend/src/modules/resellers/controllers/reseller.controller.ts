import { Body, Controller, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard, Role, RolesGuard } from '@oneohm-epc/shared-auth';
import { ResellerStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';

import {
  CreateResellerDto,
  ResellerResponseDto,
  UpdateResellerDto,
  UpdateResellerStatusDto,
} from '../dto';
import { ResellerService } from '../services/reseller.service';

import type { CurrentUserType } from '@oneohm-epc/shared-auth';

/**
 * Reseller Controller
 * Handles HTTP requests for reseller management
 */
@ApiTags('Resellers')
@ApiBearerAuth()
@Controller('api/v1/resellers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResellerController {
  constructor(private readonly resellerService: ResellerService) {}

  /**
   * Create a new reseller
   */
  @ApiCreate({
    summary: 'Create a new reseller',
    description: 'Creates a new reseller partner in the system.',
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    additionalErrors: [
      {
        status: 409,
        description: 'Reseller with same company code or email already exists',
      },
    ],
  })
  async create(
    @Body() createDto: CreateResellerDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    const reseller = await this.resellerService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );
    return reseller as ResellerResponseDto;
  }

  /**
   * Get all resellers
   */
  @ApiReadAll({
    summary: 'Get all resellers',
    description: 'Retrieve all reseller partners for the current organization.',
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async findAll(@CurrentUser() currentUser: CurrentUserType): Promise<ResellerResponseDto[]> {
    const resellers = await this.resellerService.findAll(currentUser.organizationId);
    return resellers as ResellerResponseDto[];
  }

  /**
   * Get reseller by ID
   */
  @ApiReadOne({
    summary: 'Get reseller by ID',
    description: 'Retrieve a specific reseller by their ID.',
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    const reseller = await this.resellerService.findById(id, currentUser.organizationId);
    return reseller as ResellerResponseDto;
  }

  /**
   * Update reseller
   */
  @ApiUpdate({
    summary: 'Update reseller',
    description: 'Update reseller information.',
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    additionalErrors: [
      {
        status: 409,
        description: 'Reseller with same email already exists',
      },
    ],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateResellerDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    const reseller = await this.resellerService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );
    return reseller as ResellerResponseDto;
  }

  /**
   * Update reseller status (generic)
   */
  @ApiAction({
    path: 'status',
    summary: 'Update reseller status',
    description: `Update reseller status (${Object.values(ResellerStatus).join(', ')}).`,
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateResellerStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    const reseller = await this.resellerService.updateStatus(
      id,
      currentUser.organizationId,
      statusDto.status,
      currentUser.id,
    );
    return reseller as ResellerResponseDto;
  }

  /**
   * Delete reseller
   */
  @ApiDelete({
    summary: 'Delete reseller',
    description: 'Soft delete a reseller partner.',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.resellerService.delete(id, currentUser.organizationId);
  }
}
