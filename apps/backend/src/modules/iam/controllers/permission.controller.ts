import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { JwtAuthGuard } from '../../auth/guards';
import { PermissionResponseDto, PaginatedPermissionsDto } from '../dto/response';
import { PermissionRepository } from '../repositories/permission.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';

/**
 * Read-only.
 *
 * The catalog is fixed in `apps/web/lib/rbac/catalog.ts` and mirrored into the
 * table by migration. A permission invented at runtime would gate nothing,
 * because gating is wired into the UI — so there is nothing to create, update
 * or delete here. Roles are the thing you compose; permissions are the parts.
 */
@ApiTags('IAM - Permissions')
@ApiBearerAuth()
@Controller('iam/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all permissions',
    description: 'Get a paginated list of the fixed permission catalog',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 50,
    @Query('search') search?: string,
    @Query('module') module?: string,
  ): Promise<PaginatedPermissionsDto> {
    const skip = (page - 1) * pageSize;

    const [permissions, total] = await this.permissionRepository.findAllPaginated(skip, pageSize, {
      search,
      module,
    });

    const data = await Promise.all(
      permissions.map(async (p) => {
        const rolesCount = await this.rolePermissionRepository.countByPermissionId(p.id);
        return { ...plainToInstance(PermissionResponseDto, p), rolesCount };
      }),
    );

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission details', description: 'Get permission by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return plainToInstance(PermissionResponseDto, permission);
  }
}
