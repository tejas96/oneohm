import { Body, Controller, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@oneohm-epc/shared-auth';
import { ApiCreate, ApiDelete, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';

import { CreateOrganizationSettingDto } from '../dto/create-organization-setting.dto';
import { UpdateOrganizationSettingDto } from '../dto/update-organization-setting.dto';
import { OrganizationSettingService } from '../services/organization-setting.service';

/**
 * Organization Setting Controller
 * Handles HTTP requests for organization settings management
 *
 * ⚠️ TEMP: Authentication bypassed for testing - @Public() decorator active
 */
@ApiTags('Organization Settings')
// @ApiBearerAuth() // TEMP: Disabled for testing
@Controller('api/v1/organization-settings')
// @UseGuards(JwtAuthGuard, RolesGuard) // TEMP: Disabled for testing
@Public() // TEMP: Added for testing without auth
export class OrganizationSettingController {
  constructor(private readonly organizationSettingService: OrganizationSettingService) {}

  /**
   * Create a new organization setting
   */
  @ApiCreate({
    summary: 'Create organization setting',
    description: 'Create a new setting for an organization.',
    responseType: Object, // Generic response since we don't have a specific DTO
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
  })
  async create(
    @Body() createDto: CreateOrganizationSettingDto,
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ) {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    return this.organizationSettingService.create(createDto, userId);
  }

  /**
   * Get all settings for an organization
   */
  @ApiReadOne({
    summary: 'Get organization settings',
    description: 'Retrieve all settings for a specific organization.',
    responseType: Array,
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
    idParam: 'organizationId',
  })
  async findByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('category') category?: string,
  ) {
    return this.organizationSettingService.findByOrganization(organizationId, category);
  }

  /**
   * Get setting by ID
   */
  @ApiReadOne({
    summary: 'Get setting by ID',
    description: 'Retrieve a specific setting by its UUID.',
    responseType: Object,
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
  })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationSettingService.findById(id);
  }

  /**
   * Update setting by ID
   */
  @ApiUpdate({
    summary: 'Update setting',
    description: 'Update an existing setting by its UUID.',
    responseType: Object,
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrganizationSettingDto,
    // @CurrentUser('sub') userId: string, // TEMP: Disabled for testing
  ) {
    const userId = '00000000-0000-0000-0000-000000000001'; // TEMP: Mock user ID for testing
    return this.organizationSettingService.update(id, updateDto, userId);
  }

  /**
   * Delete setting by ID
   */
  @ApiDelete({
    summary: 'Delete setting',
    description: 'Delete a setting by its UUID.',
    // roles: [Role.SUPER_ADMIN, Role.ADMIN], // TEMP: Disabled for testing
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.organizationSettingService.delete(id);
  }
}
