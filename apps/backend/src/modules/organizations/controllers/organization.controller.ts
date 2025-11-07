import { Body, Controller, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@oneohm-epc/shared-auth';
import { OrganizationStatus } from '@oneohm-epc/shared-types';
import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';

import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationService } from '../services/organization.service';

/**
 * Organization Controller
 * Handles HTTP requests for organization management
 *
 * ⚠️ TEMP: Authentication bypassed for testing - @Public() decorator active
 */
@ApiTags('Organizations')
// @ApiBearerAuth() // TEMP: Disabled for testing
@Controller('api/v1/organizations')
// @UseGuards(JwtAuthGuard, RolesGuard) // TEMP: Disabled for testing
@Public() // TEMP: Added for testing without auth
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * Create a new organization
   */
  @ApiCreate({
    summary: 'Create a new organization',
    description: 'Creates a new organization in the system. Requires SUPER_ADMIN or ADMIN role.',
    responseType: OrganizationResponseDto,
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
    additionalErrors: [
      {
        status: 409,
        description: 'Organization code already exists',
      },
    ],
  })
  async create(
    @Body() createDto: CreateOrganizationDto,
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ): Promise<OrganizationResponseDto> {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    const organization = await this.organizationService.create(createDto, userId);
    return organization as OrganizationResponseDto;
  }

  /**
   * Get all organizations with pagination
   */
  @ApiReadAll({
    summary: 'Get all organizations',
    description: 'Retrieve all organizations with pagination and optional status filter.',
    responseType: OrganizationResponseDto,
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
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
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
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
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
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
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ): Promise<OrganizationResponseDto> {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    const organization = await this.organizationService.update(id, updateDto, userId);
    return organization as OrganizationResponseDto;
  }

  /**
   * Delete organization by ID
   */
  @ApiDelete({
    summary: 'Delete organization',
    description:
      'Soft delete an organization by its UUID. Only SUPER_ADMIN can delete organizations.',
    // roles: [Role.SUPER_ADMIN], // TEMP: Disabled for testing
    additionalErrors: [
      {
        status: 400,
        description: 'Cannot delete active organization',
      },
    ],
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ): Promise<void> {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    await this.organizationService.delete(id, userId);
  }

  /**
   * Activate organization
   */
  @ApiAction({
    path: 'activate',
    summary: 'Activate organization',
    description: 'Activate an inactive or suspended organization.',
    responseType: OrganizationResponseDto,
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ): Promise<OrganizationResponseDto> {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    const organization = await this.organizationService.activate(id, userId);
    return organization as OrganizationResponseDto;
  }

  /**
   * Deactivate organization
   */
  @ApiAction({
    path: 'deactivate',
    summary: 'Deactivate organization',
    description: 'Deactivate an active organization.',
    responseType: OrganizationResponseDto,
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ): Promise<OrganizationResponseDto> {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    const organization = await this.organizationService.deactivate(id, userId);
    return organization as OrganizationResponseDto;
  }

  /**
   * Suspend organization
   */
  @ApiAction({
    path: 'suspend',
    summary: 'Suspend organization',
    description: 'Suspend an organization. Only SUPER_ADMIN can suspend organizations.',
    responseType: OrganizationResponseDto,
    // roles: [Role.SUPER_ADMIN], // TEMP: Disabled for testing
  })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ): Promise<OrganizationResponseDto> {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    const organization = await this.organizationService.suspend(id, userId);
    return organization as OrganizationResponseDto;
  }
}
