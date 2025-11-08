import { Body, Controller, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard, Role, RolesGuard } from '@oneohm-epc/shared-auth';
import { ApiCreate, ApiDelete, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';

import { CreateOrganizationSettingDto } from '../dto/create-organization-setting.dto';
import { UpdateOrganizationSettingDto } from '../dto/update-organization-setting.dto';
import { OrganizationSettingService } from '../services/organization-setting.service';

import type { CurrentUserType } from '@oneohm-epc/shared-auth';

/**
 * Organization Setting Controller
 * Handles HTTP requests for organization settings management
 */
@ApiTags('Organization Settings')
@ApiBearerAuth()
@Controller('api/v1/organization-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationSettingController {
  constructor(private readonly organizationSettingService: OrganizationSettingService) {}

  /**
   * Create a new organization setting
   */
  @ApiCreate({
    summary: 'Create organization setting',
    description: 'Create a new setting for an organization.',
    responseType: Object, // Generic response since we don't have a specific DTO
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async create(
    @Body() createDto: CreateOrganizationSettingDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.organizationSettingService.create(createDto, currentUser.id);
  }

  /**
   * Get all settings for an organization
   */
  @ApiReadOne({
    summary: 'Get organization settings',
    description: 'Retrieve all settings for a specific organization.',
    responseType: Array,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
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
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
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
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrganizationSettingDto,
    @CurrentUser() currentUser: CurrentUserType,
  ) {
    return this.organizationSettingService.update(id, updateDto, currentUser.id);
  }

  /**
   * Delete setting by ID
   */
  @ApiDelete({
    summary: 'Delete setting',
    description: 'Delete a setting by its UUID.',
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.organizationSettingService.delete(id);
  }
}
