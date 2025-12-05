import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationStatus } from '@oneohm-epc/shared-types';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentUserType } from '../../auth/types';
import { RequireRole } from '../../iam/decorators/require-role.decorator';
import { RoleGuard } from '../../iam/guards/role.guard';
import {
  AssignSuperAdminDto,
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
  OrganizationResponseDto,
  OrganizationWithStatsDto,
  PaginatedOrganizationsResponseDto,
  UpdateOrganizationDto,
  UpdateOrganizationStatusDto,
} from '../dto';
import { OrganizationService } from '../services/organization.service';

/**
 * Organization Controller
 * Handles organization management for platform admins
 * All endpoints require platform_admin role
 */
@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // ==================== CREATE ====================

  /**
   * Create new organization with super admin
   */
  @Post()
  @RequireRole('platform_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create organization',
    description:
      'Creates organization, seeds default roles, creates super admin user, and sends invitation. Requires platform_admin role.',
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
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<CreateOrganizationResponseDto> {
    return this.organizationService.create(dto, user.id);
  }

  // ==================== READ ====================

  /**
   * List all organizations with pagination and filters
   */
  @Get()
  @RequireRole('platform_admin')
  @ApiOperation({
    summary: 'List all organizations',
    description:
      'Get paginated list of organizations with optional search and status filter. Requires platform_admin role.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: OrganizationStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organizations retrieved successfully',
    type: PaginatedOrganizationsResponseDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: OrganizationStatus,
  ): Promise<PaginatedOrganizationsResponseDto> {
    return this.organizationService.findAll(page, limit, search, status);
  }

  /**
   * Get organization by ID with statistics
   */
  @Get(':id')
  @RequireRole('platform_admin')
  @ApiOperation({
    summary: 'Get organization details',
    description:
      'Get organization by ID with user and project statistics. Requires platform_admin role.',
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
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<OrganizationWithStatsDto> {
    return this.organizationService.findById(id);
  }

  // ==================== UPDATE ====================

  /**
   * Update organization
   */
  @Patch(':id')
  @RequireRole('platform_admin')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Update organization details. Requires platform_admin role.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.update(id, dto, user.id);
  }

  /**
   * Update organization status
   */
  @Patch(':id/status')
  @RequireRole('platform_admin')
  @ApiOperation({
    summary: 'Update organization status',
    description:
      'Update organization status (active/inactive/suspended). Requires platform_admin role.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization status updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Organization already in requested status',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationStatusDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<OrganizationResponseDto> {
    return this.organizationService.updateStatus(id, dto.status, user.id);
  }

  // ==================== DELETE ====================

  /**
   * Delete organization (soft delete)
   */
  @Delete(':id')
  @RequireRole('platform_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Soft delete organization and all related data. Requires platform_admin role.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.organizationService.delete(id);
  }

  // ==================== SUPER ADMIN ====================

  /**
   * Assign additional super admin to organization
   */
  @Post(':id/super-admin')
  @RequireRole('platform_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign super admin',
    description:
      'Assign additional super admin user to organization. Requires platform_admin role.',
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
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ userId: string; invitationLink: string }> {
    return this.organizationService.assignSuperAdmin(id, dto, user.id);
  }
}
