import { Body, Controller, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard, Role, RolesGuard } from '@oneohm-epc/shared-auth';
import { OrganizationStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';

import {
  CreateOrganizationDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
  UpdateOrganizationStatusDto,
} from '../dto';
import { OrganizationService } from '../services/organization.service';

import type { CurrentUserType } from '@oneohm-epc/shared-auth';

/**
 * Organization Controller
 * Handles HTTP requests for organization management
 */
@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * Create a new organization
   */
  @ApiCreate({
    summary: 'Create a new organization',
    description: 'Creates a new organization in the system. Requires SUPER_ADMIN or ADMIN role.',
    responseType: OrganizationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    additionalErrors: [
      {
        status: 409,
        description: 'Organization code already exists',
      },
    ],
  })
  async create(
    @Body() createDto: CreateOrganizationDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.create(createDto, currentUser.id);
    return organization as OrganizationResponseDto;
  }

  /**
   * Get all organizations with pagination
   */
  @ApiReadAll({
    summary: 'Get all organizations',
    description: 'Retrieve all organizations with pagination and optional status filter.',
    responseType: OrganizationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    additionalQueries: [
      {
        name: 'status',
        required: false,
        enum: OrganizationStatus,
        description: 'Filter by organization status',
      },
    ],
  })
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: OrganizationStatus,
  ): Promise<{
    items: OrganizationResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = await this.organizationService.findAll({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
    });

    return {
      ...result,
      items: result.items as OrganizationResponseDto[],
    };
  }

  /**
   * Get organization by ID
   */
  @ApiReadOne({
    summary: 'Get organization by ID',
    description: 'Retrieve a specific organization by its UUID.',
    responseType: OrganizationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.findById(id);
    return organization as OrganizationResponseDto;
  }

  /**
   * Update organization by ID
   */
  @ApiUpdate({
    summary: 'Update organization',
    description: 'Update an existing organization by its UUID.',
    responseType: OrganizationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    additionalErrors: [
      {
        status: 409,
        description: 'Organization code already exists',
      },
    ],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrganizationDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.update(id, updateDto, currentUser.id);
    return organization as OrganizationResponseDto;
  }

  /**
   * Delete organization by ID
   */
  @ApiDelete({
    summary: 'Delete organization',
    description:
      'Soft delete an organization by its UUID. Only SUPER_ADMIN can delete organizations.',
    roles: [Role.SUPER_ADMIN],
    additionalErrors: [
      {
        status: 400,
        description: 'Cannot delete active organization',
      },
    ],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<void> {
    await this.organizationService.delete(id, currentUser.id);
  }

  /**
   * Update organization status (Generic endpoint)
   */
  @ApiAction({
    path: 'status',
    summary: 'Update organization status',
    description:
      'Update organization status to active, inactive, or suspended. Generic endpoint for all status transitions.',
    responseType: OrganizationResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateOrganizationStatusDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.updateStatus(
      id,
      statusDto.status,
      currentUser.id,
    );
    return organization as OrganizationResponseDto;
  }
}
