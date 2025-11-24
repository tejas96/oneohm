import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CreatePermissionDto } from '../dto/permissions/create-permission.dto';
import { UpdatePermissionDto } from '../dto/permissions/update-permission.dto';
import { PermissionResponseDto, PaginatedPermissionsDto } from '../dto/response';
import { PermissionGuard } from '../guards/permission.guard';
import { PermissionRepository } from '../repositories/permission.repository';

/**
 * Permission Controller - Admin UI for Permission Management
 * Full CRUD operations for permissions
 *
 * Security: All endpoints require IAM admin permissions
 */
@ApiTags('IAM - Permissions')
@ApiBearerAuth()
@Controller('iam/permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionController {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  /**
   * Create a new permission
   */
  @Post()
  @RequirePermission('iam:permissions:create')
  @ApiOperation({
    summary: 'Create a new permission',
    description: 'Creates a new permission for a feature',
  })
  async create(@Body() createPermissionDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.create(createPermissionDto);
    return permission;
  }

  /**
   * Get all permissions (paginated)
   */
  @Get()
  @RequirePermission('iam:permissions:read')
  @ApiOperation({
    summary: 'List all permissions',
    description: 'Get paginated list of permissions',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('featureId') featureId?: string,
  ): Promise<PaginatedPermissionsDto> {
    const skip = (page - 1) * pageSize;

    let permissions: any[];
    let total: number;

    if (featureId) {
      [permissions, total] = await this.permissionRepository.findByFeatureIdPaginated(
        featureId,
        skip,
        pageSize,
      );
    } else {
      [permissions, total] = await this.permissionRepository.findAllPaginated(skip, pageSize);
    }

    return {
      data: permissions,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get permission by ID
   */
  @Get(':id')
  @RequirePermission('iam:permissions:read')
  @ApiOperation({ summary: 'Get permission details', description: 'Get permission by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw new Error('Permission not found');
    }

    return permission;
  }

  /**
   * Update permission
   */
  @Patch(':id')
  @RequirePermission('iam:permissions:update')
  @ApiOperation({ summary: 'Update permission', description: 'Update permission details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    await this.permissionRepository.update(id, updatePermissionDto);

    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw new Error('Permission not found after update');
    }

    return permission;
  }

  /**
   * Delete permission
   */
  @Delete(':id')
  @RequirePermission('iam:permissions:delete')
  @ApiOperation({
    summary: 'Delete permission',
    description: 'Delete a permission (system permissions cannot be deleted)',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw new Error('Permission not found');
    }

    if (permission.isSystemPermission) {
      throw new Error('Cannot delete system permission');
    }

    await this.permissionRepository.delete(id);
    return { message: 'Permission deleted successfully' };
  }

  /**
   * Get permissions by feature code
   */
  @Get('by-feature/:featureCode')
  @RequirePermission('iam:permissions:read')
  @ApiOperation({
    summary: 'Get permissions by feature code',
    description: 'Get all permissions for a specific feature',
  })
  async findByFeatureCode(
    @Param('featureCode') _featureCode: string,
  ): Promise<PermissionResponseDto[]> {
    // TODO: Add method to find by feature code
    // For now, return empty array
    return [];
  }
}
