import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AssignSuperAdminDto,
  CreateOrganizationResponseDto,
  PaginatedOrganizationsResponseDto,
  OrganizationWithStatsDto,
  PlatformOrganizationResponseDto,
} from '../dto';
import { PlatformOrganizationService } from '../services';

/**
 * Platform Organization Controller
 * Platform admin endpoints for managing organizations
 * All endpoints require platform_admin role
 */
@ApiTags('Platform - Organizations')
@Controller('platform/organizations')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('platform:organizations:manage')
@ApiBearerAuth()
export class PlatformOrganizationController {
  constructor(private readonly platformOrganizationService: PlatformOrganizationService) {}

  /**
   * Create new organization with super admin
   */
  @Post()
  @ApiOperation({
    summary: 'Create organization',
    description:
      'Creates organization, seeds default roles, creates super admin user, and sends invitation',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization created successfully',
    type: CreateOrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Organization code or email already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Platform admin access required',
  })
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: { id: string },
  ): Promise<CreateOrganizationResponseDto> {
    return this.platformOrganizationService.createOrganization(dto, user.id);
  }

  /**
   * List all organizations with pagination and filters
   */
  @Get()
  @ApiOperation({
    summary: 'List all organizations',
    description: 'Get paginated list of organizations with optional search and status filter',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organizations retrieved successfully',
    type: PaginatedOrganizationsResponseDto,
  })
  async listOrganizations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedOrganizationsResponseDto> {
    return this.platformOrganizationService.listOrganizations(page, limit, search, status);
  }

  /**
   * Get organization by ID with statistics
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get organization details',
    description: 'Get organization by ID with user and project statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: OrganizationWithStatsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async getOrganization(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationWithStatsDto> {
    return this.platformOrganizationService.getOrganizationById(id);
  }

  /**
   * Update organization
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Update organization details',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization updated successfully',
    type: PlatformOrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async updateOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: { id: string },
  ): Promise<PlatformOrganizationResponseDto> {
    return this.platformOrganizationService.updateOrganization(id, dto, user.id);
  }

  /**
   * Delete organization (soft delete)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Soft delete organization and all related data',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async deleteOrganization(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.platformOrganizationService.deleteOrganization(id);
  }

  /**
   * Assign additional super admin to organization
   */
  @Post(':id/super-admin')
  @ApiOperation({
    summary: 'Assign super admin',
    description: 'Assign additional super admin user to organization',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Super admin assigned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already has super_admin role',
  })
  async assignSuperAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSuperAdminDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ userId: string; invitationLink: string }> {
    return this.platformOrganizationService.assignSuperAdmin(id, dto, user.id);
  }
}
