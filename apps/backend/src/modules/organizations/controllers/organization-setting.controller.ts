import { Body, Controller, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCreate, ApiDelete, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { CreateOrganizationSettingDto } from '../dto/create-organization-setting.dto';
import { UpdateOrganizationSettingDto } from '../dto/update-organization-setting.dto';
import type { OrganizationSettingEntity } from '../entities/organization-setting.entity';
import { OrganizationSettingService } from '../services/organization-setting.service';

/**
 * Organization Setting Controller
 * Handles HTTP requests for organization settings management
 */
@ApiTags('Organization Settings')
@ApiBearerAuth()
@Controller('organization-settings')
@UseGuards(JwtAuthGuard)
export class OrganizationSettingController {
  constructor(private readonly organizationSettingService: OrganizationSettingService) {}

  /**
   * Create a new organization setting
   */
  @ApiCreate({
    summary: 'Create organization setting',
    description: 'Create a new setting for an organization.',
    responseType: Object, // Generic response since we don't have a specific DTO
  })
  async create(
    @Body() createDto: CreateOrganizationSettingDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<OrganizationSettingEntity> {
    return this.organizationSettingService.create(createDto, currentUser.id);
  }

  /**
   * Get all settings for an organization
   */
  @ApiReadOne({
    summary: 'Get organization settings',
    description: 'Retrieve all settings for a specific organization.',
    responseType: Array,
    idParam: 'organizationId',
  })
  async findByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('category') category?: string,
  ): Promise<OrganizationSettingEntity[]> {
    return this.organizationSettingService.findByOrganization(organizationId, category);
  }

  /**
   * Get setting by ID
   */
  @ApiReadOne({
    summary: 'Get setting by ID',
    description: 'Retrieve a specific setting by its UUID.',
    responseType: Object,
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationSettingEntity> {
    return this.organizationSettingService.findById(id);
  }

  /**
   * Update setting by ID
   */
  @ApiUpdate({
    summary: 'Update setting',
    description: 'Update an existing setting by its UUID.',
    responseType: Object,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrganizationSettingDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<OrganizationSettingEntity> {
    return this.organizationSettingService.update(id, updateDto, currentUser.id);
  }

  /**
   * Delete setting by ID
   */
  @ApiDelete({
    summary: 'Delete setting',
    description: 'Delete a setting by its UUID.',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.organizationSettingService.delete(id);
  }
}
