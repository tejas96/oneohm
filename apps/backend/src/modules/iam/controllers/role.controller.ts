import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { RoleResponseDto, RoleWithPermissionsDto, PaginatedRolesDto } from '../dto/response';
import { AssignPermissionsDto } from '../dto/roles/assign-permissions.dto';
import { CreateRoleDto } from '../dto/roles/create-role.dto';
import { UpdateRoleDto } from '../dto/roles/update-role.dto';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { RoleRepository } from '../repositories/role.repository';

/**
 * Role Controller — the backend for the superadmin role builder.
 *
 * Reads are open to any logged-in user; the 6 write endpoints require
 * `super_admin` via SuperAdminGuard. That guard is the only role check left in
 * the backend — see its own doc comment for why this one survived.
 */
@ApiTags('IAM - Roles')
@ApiBearerAuth()
@Controller('iam/roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  /**
   * Create a new role
   */
  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Create a new role',
    description: 'Creates a new role',
  })
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<RoleResponseDto> {
    const exists = await this.roleRepository.existsByCodeAndOrganization(createRoleDto.code);
    if (exists) {
      throw new ConflictException('A role with this code already exists');
    }

    const role = await this.roleRepository.create({
      ...createRoleDto,
      createdBy: user.id,
      updatedBy: user.id,
    });

    return plainToInstance(RoleResponseDto, role);
  }

  /**
   * Get all roles for current organization (paginated)
   */
  @Get()
  @ApiOperation({
    summary: 'List all roles',
    description: 'Get paginated list of roles ',
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize: number = 10,
    @Query('search') search?: string,
    @Query('isSystemRole') isSystemRole?: string,
  ): Promise<PaginatedRolesDto> {
    const skip = (page - 1) * pageSize;
    const [roles, total] = await this.roleRepository.findAllPaginated(skip, pageSize, {
      search,
      isSystemRole: isSystemRole !== undefined ? isSystemRole === 'true' : undefined,
    });

    const data = await Promise.all(
      roles.map(async (role) => {
        const permissionsCount = await this.rolePermissionRepository.countByRoleId(role.id);
        const usersCount = await this.userRoleRepository.countByRoleId(role.id);
        return plainToInstance(RoleResponseDto, {
          ...role,
          permissionsCount,
          usersCount,
        });
      }),
    );

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get role by ID with permissions
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get role details',
    description: 'Get role by ID with assigned permissions',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleWithPermissionsDto> {
    const role = await this.roleRepository.findWithPermissions(id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const rolePermissions = await this.rolePermissionRepository.findByRoleId(id);
    const permissions = rolePermissions.map((rp) => rp.permission.code);
    const permissionIds = rolePermissions.map((rp) => rp.permissionId);

    return plainToInstance(RoleWithPermissionsDto, {
      ...role,
      permissions,
      permissionIds,
    });
  }

  /**
   * Update role
   */
  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Update role', description: 'Update role details (not permissions)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<RoleResponseDto> {
    const existing = await this.roleRepository.findWithPermissions(id);
    if (!existing) {
      throw new NotFoundException('Role not found');
    }
    this.assertNotSystemRole(existing);

    const role = await this.roleRepository.update(id, {
      ...updateRoleDto,
      updatedBy: user.id,
    });

    return role;
  }

  /**
   * Delete role (soft delete)
   */
  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Delete role',
    description: 'Soft delete a role (system roles cannot be deleted)',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    const role = await this.roleRepository.findWithPermissions(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const usersCount = await this.userRoleRepository.countByRoleId(id);
    if (usersCount > 0) {
      throw new BadRequestException(
        `Cannot delete role with ${usersCount} users assigned. Remove user assignments first.`,
      );
    }

    await this.roleRepository.softDelete(id);
    return { message: 'Role deleted successfully' };
  }

  /**
   * Assign permissions to role (replaces existing)
   */
  @Post(':id/permissions/sync')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Sync role permissions',
    description: 'Replace all role permissions with new set',
  })
  async syncPermissions(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ message: string; permissionsCount: number }> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    this.assertNotSystemRole(role);

    await this.rolePermissionRepository.syncPermissions(
      roleId,
      assignPermissionsDto.permissionIds,
      user.id,
    );

    return {
      message: 'Permissions synced successfully',
      permissionsCount: assignPermissionsDto.permissionIds.length,
    };
  }

  /**
   * Add permissions to role (keeps existing)
   */
  @Post(':id/permissions/add')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Add role permissions',
    description: 'Add new permissions to role (keeps existing)',
  })
  async addPermissions(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ message: string; added: number }> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    this.assertNotSystemRole(role);

    await this.rolePermissionRepository.assignPermissions(
      roleId,
      assignPermissionsDto.permissionIds,
      user.id,
    );

    return {
      message: 'Permissions added successfully',
      added: assignPermissionsDto.permissionIds.length,
    };
  }

  /**
   * Remove permissions from role
   */
  @Delete(':id/permissions')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Remove role permissions',
    description: 'Remove specific permissions from role',
  })
  async removePermissions(
    @Param('id', ParseUUIDPipe) roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<{ message: string; removed: number }> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    this.assertNotSystemRole(role);

    if (assignPermissionsDto.permissionIds.length > 0) {
      await this.rolePermissionRepository.removePermissions(
        roleId,
        assignPermissionsDto.permissionIds,
      );
    }

    return {
      message: 'Permissions removed successfully',
      removed: assignPermissionsDto.permissionIds.length,
    };
  }

  /**
   * `admin` and `super_admin` pass every check by bypass, not by holding
   * permissions. Renaming one — its `code` above all — would silently break
   * that bypass across the whole web app, and granting one permissions
   * implies a control that does not exist. The UI hides these actions; this
   * refuses them for anyone reaching the API directly.
   */
  private assertNotSystemRole(role: { code: string; isSystemRole: boolean }): void {
    if (role.isSystemRole) {
      throw new BadRequestException(
        `The "${role.code}" role is built in and cannot be changed. It always has full access.`,
      );
    }
  }
}
