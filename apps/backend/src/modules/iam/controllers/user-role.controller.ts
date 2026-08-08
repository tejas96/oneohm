import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { UserRoleEntity } from '../../users/entities/user-role.entity';
import { UserRoleRepository } from '../../users/repositories/user-role.repository';
import { ProfileService } from '../../users/services/profile.service';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AssignUserRoleDto, BulkAssignUserRoleDto } from '../dto/user-roles/assign-user-role.dto';
import {
  UserRoleResponseDto,
  BulkAssignResponseDto,
} from '../dto/user-roles/user-role-response.dto';
import { PermissionGuard } from '../guards/permission.guard';
import { RoleRepository } from '../repositories/role.repository';

/**
 * User Role Controller - Assign/remove roles from users
 *
 * Endpoints for managing user-role assignments in the IAM system.
 * All endpoints require authentication and appropriate permissions.
 */
@ApiTags('IAM - User Roles')
@ApiBearerAuth()
@Controller('iam/user-roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserRoleController {
  constructor(
    private readonly userRoleRepository: UserRoleRepository,
    private readonly roleRepository: RoleRepository,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Assign a role to a user
   */
  @Post()
  @RequirePermission('iam:user-roles:assign')
  @ApiOperation({
    summary: 'Assign role to user',
    description:
      'Assign an IAM role to a user in an organization. Supports lookup by roleId or roleCode.',
  })
  @ApiResponse({
    status: 201,
    description: 'Role assigned successfully',
    type: UserRoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Role or user not found' })
  async assignRole(
    @Body() dto: AssignUserRoleDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<UserRoleResponseDto> {
    // Validate: Either roleId or roleCode must be provided
    if (!dto.roleId && !dto.roleCode) {
      throw new BadRequestException('Either roleId or roleCode is required');
    }

    // Resolve role
    const role = await this.resolveRole(dto.roleId, dto.roleCode);

    await this.validateUserHasProfile(dto.userId);

    // Check if user already has this role
    const existing = await this.userRoleRepository.findByUserAndRole(dto.userId, role.id);
    if (existing) {
      // Return existing assignment (idempotent)
      return this.mapToResponseDto(existing);
    }

    // Create user role assignment
    const userRole = await this.userRoleRepository.create({
      userId: dto.userId,
      roleId: role.id,
      role: role.code,
      createdBy: currentUser.id,
    });

    // Fetch with relations for response
    const created = await this.userRoleRepository.findById(userRole.id);
    if (!created) {
      throw new NotFoundException('User role assignment could not be retrieved after creation');
    }

    return this.mapToResponseDto(created);
  }

  /**
   * Bulk assign a role to multiple users
   */
  @Post('bulk')
  @RequirePermission('iam:user-roles:assign')
  @ApiOperation({
    summary: 'Bulk assign role to users',
    description:
      'Assign an IAM role to multiple users at once. Skips users who already have the role.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk assignment completed',
    type: BulkAssignResponseDto,
  })
  async bulkAssignRole(
    @Body() dto: BulkAssignUserRoleDto,
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<BulkAssignResponseDto> {
    // Validate: Either roleId or roleCode must be provided
    if (!dto.roleId && !dto.roleCode) {
      throw new BadRequestException('Either roleId or roleCode is required');
    }

    // Resolve role
    const role = await this.resolveRole(dto.roleId, dto.roleCode);

    let assigned = 0;
    let skipped = 0;
    let failed = 0;

    for (const userId of dto.userIds) {
      try {
        // Validate user exists and has profile in organization
        await this.validateUserHasProfile(userId);

        // Check if user already has this role
        const existing = await this.userRoleRepository.findByUserAndRole(userId, role.id);
        if (existing) {
          skipped++;
          continue;
        }

        // Create user role assignment
        await this.userRoleRepository.create({
          userId,
          roleId: role.id,
          role: role.code,
          createdBy: currentUser.id,
        });
        assigned++;
      } catch {
        failed++;
      }
    }

    return {
      message: `Role assigned to ${assigned} users (${skipped} already had the role, ${failed} failed)`,
      assigned,
      skipped,
      failed,
    };
  }

  /**
   * Get all roles for a user
   */
  @Get('user/:userId')
  @RequirePermission('iam:user-roles:read')
  @ApiOperation({
    summary: 'Get user roles',
    description: 'Get all roles assigned to a user',
  })
  @ApiResponse({ status: 200, description: 'User roles retrieved', type: [UserRoleResponseDto] })
  async getUserRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserRoleResponseDto[]> {
    const userRoles = await this.userRoleRepository.findByUserIdWithRoles(userId);
    return userRoles.map((ur) => this.mapToResponseDto(ur));
  }

  /**
   * Get all users with a specific role
   */
  @Get('role/:roleId')
  @RequirePermission('iam:user-roles:read')
  @ApiOperation({
    summary: 'Get users by role',
    description: 'Get all users who have a specific role assigned',
  })
  @ApiResponse({
    status: 200,
    description: 'Users with role retrieved',
    type: [UserRoleResponseDto],
  })
  async getUsersByRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<UserRoleResponseDto[]> {
    const userRoles = await this.userRoleRepository.findByRoleId(roleId);
    return userRoles.map((ur) => this.mapToResponseDto(ur));
  }

  /**
   * Remove a role assignment
   */
  @Delete(':id')
  @RequirePermission('iam:user-roles:remove')
  @ApiOperation({
    summary: 'Remove role from user',
    description: 'Remove a specific role assignment from a user',
  })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'Role assignment not found' })
  async removeRole(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    // Check if assignment exists
    const existing = await this.userRoleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`User role assignment with ID '${id}' not found`);
    }

    await this.userRoleRepository.deleteById(id);

    return {
      message: 'Role removed successfully',
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Resolve role by ID or code
   */
  private async resolveRole(
    roleId?: string,
    roleCode?: string,
  ): Promise<{ id: string; code: string; name: string }> {
    let role;

    if (roleId) {
      role = await this.roleRepository.findWithPermissions(roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID '${roleId}' not found`);
      }
    } else if (roleCode) {
      role = await this.roleRepository.findByCodeAndOrganization(roleCode);
      if (!role) {
        throw new NotFoundException(`Role with code '${roleCode}' not found in organization`);
      }
    } else {
      throw new BadRequestException('Either roleId or roleCode is required');
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
    };
  }

  /**
   * Validate user exists and has profile in organization
   */
  private async validateUserHasProfile(userId: string): Promise<void> {
    try {
      await this.profileService.verifyUserHasAccessToOrg(userId);
    } catch {
      throw new BadRequestException(
        `User '${userId}' does not have a profile in organization ''`,
      );
    }
  }

  /**
   * Map entity to response DTO
   * Note: user/iamRole may be undefined if relations are not loaded
   */
  private mapToResponseDto(entity: UserRoleEntity): UserRoleResponseDto {
    // Relations may not be loaded, so we need to check defensively
    const user = entity.user as typeof entity.user | undefined;
    const iamRole = entity.iamRole;

    return {
      id: entity.id,
      userId: entity.userId,
      userName: user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : undefined,
      userEmail: user?.email,
      roleId: entity.roleId ?? '',
      roleCode: iamRole?.code ?? entity.role ?? '',
      roleName: iamRole?.name,
      createdAt: entity.createdAt,
    };
  }
}
