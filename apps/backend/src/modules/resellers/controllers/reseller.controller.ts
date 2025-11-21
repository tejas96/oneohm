import { Body, Controller, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type CurrentUserType,
  CurrentUser,
  JwtAuthGuard,
  Role,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import { ResellerStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';

import { ProfileService } from '../../users/services/profile.service';
import {
  CreateResellerDto,
  ResellerResponseDto,
  UpdateResellerDto,
  UpdateResellerStatusDto,
} from '../dto';
import { ResellerService } from '../services/reseller.service';

/**
 * Reseller Controller
 * Handles HTTP requests for reseller management
 *
 * Multi-Organization Support:
 * - organizationId is required as query parameter or header (X-Organization-Id)
 * - Automatically verifies user has access to the specified organization
 */
@ApiTags('Resellers')
@ApiBearerAuth()
@Controller('resellers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResellerController {
  constructor(
    private readonly resellerService: ResellerService,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Create a new reseller
   */
  @ApiCreate({
    summary: 'Create a new reseller',
    description:
      'Creates a new reseller partner in the system. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    // Verify user has access to this organization
    await this.profileService.verifyUserHasAccessToOrg(currentUser.id, organizationId);

    const reseller = await this.resellerService.create(organizationId, createDto, currentUser.id);
    return reseller as unknown as ResellerResponseDto;
  }

  /**
   * Get all resellers
   */
  @ApiReadAll({
    summary: 'Get all resellers',
    description:
      'Retrieve all reseller partners for the specified organization. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto[]> {
    // Verify user has access to this organization
    await this.profileService.verifyUserHasAccessToOrg(currentUser.id, organizationId);

    const resellers = await this.resellerService.findAll(organizationId);
    return resellers as unknown as ResellerResponseDto[];
  }

  /**
   * Get reseller by ID
   */
  @ApiReadOne({
    summary: 'Get reseller by ID',
    description:
      'Retrieve a specific reseller by their ID. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    // Verify user has access to this organization
    await this.profileService.verifyUserHasAccessToOrg(currentUser.id, organizationId);

    const reseller = await this.resellerService.findById(id, organizationId);
    return reseller as unknown as ResellerResponseDto;
  }

  /**
   * Update reseller
   */
  @ApiUpdate({
    summary: 'Update reseller',
    description:
      'Update reseller information. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    // Verify user has access to this organization
    await this.profileService.verifyUserHasAccessToOrg(currentUser.id, organizationId);

    const reseller = await this.resellerService.update(
      id,
      organizationId,
      updateDto,
      currentUser.id,
    );
    return reseller as unknown as ResellerResponseDto;
  }

  /**
   * Update reseller status (generic)
   */
  @ApiAction({
    path: 'status',
    summary: 'Update reseller status',
    description: `Update reseller status (${Object.values(ResellerStatus).join(', ')}). Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).`,
    responseType: ResellerResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateResellerStatusDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<ResellerResponseDto> {
    // Verify user has access to this organization
    await this.profileService.verifyUserHasAccessToOrg(currentUser.id, organizationId);

    const reseller = await this.resellerService.updateStatus(
      id,
      organizationId,
      statusDto.status,
      currentUser.id,
    );
    return reseller as unknown as ResellerResponseDto;
  }

  /**
   * Delete reseller
   */
  @ApiDelete({
    summary: 'Delete reseller',
    description:
      'Soft delete a reseller partner. Organization ID must be provided via query parameter (?organizationId=xxx) or header (X-Organization-Id).',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    // Verify user has access to this organization
    await this.profileService.verifyUserHasAccessToOrg(currentUser.id, organizationId);

    await this.resellerService.delete(id, organizationId);
  }
}
