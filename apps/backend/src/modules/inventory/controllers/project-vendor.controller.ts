import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectVendorStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateProjectVendorDto, ProjectVendorResponseDto, UpdateProjectVendorDto } from '../dto';
import { ProjectVendorService } from '../services';

/**
 * Project Vendor Controller
 * IMPORTANT: Static sub-paths (project/:projectId, vendor/:vendorId, project/:projectId/*)
 * are declared BEFORE :id to prevent NestJS from treating them as UUID params.
 */
@ApiTags('Inventory - Project Vendors')
@ApiBearerAuth()
@Controller('project-vendors')
@UseGuards(JwtAuthGuard)
export class ProjectVendorController {
  constructor(private readonly projectVendorService: ProjectVendorService) {}

  // ==================== Static Routes (MUST come before :id) ====================

  /**
   * Get all vendors for a project
   */
  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get vendors by project' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectVendorResponseDto[]> {
    const projectVendors = await this.projectVendorService.findByProject(projectId);
    return plainToInstance(ProjectVendorResponseDto, projectVendors, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get total contract value for a project
   */
  @Get('project/:projectId/contract-value')
  @ApiOperation({ summary: 'Get total contract value for a project' })
  async getTotalContractValue(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ totalValue: number }> {
    const totalValue = await this.projectVendorService.getTotalContractValueByProject(projectId);
    return { totalValue };
  }

  /**
   * Get active vendors for a project
   */
  @Get('project/:projectId/active')
  @ApiOperation({ summary: 'Get active vendors for a project' })
  async getActiveVendors(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectVendorResponseDto[]> {
    const projectVendors = await this.projectVendorService.getActiveVendorsByProject(projectId);
    return plainToInstance(ProjectVendorResponseDto, projectVendors, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all projects for a vendor
   */
  @Get('vendor/:vendorId')
  @ApiReadAll({ summary: 'Get projects by vendor', responseType: ProjectVendorResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: Object.values(ProjectVendorStatus) })
  async findByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ProjectVendorStatus,
  ): Promise<{
    data: ProjectVendorResponseDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { projectVendors, total } = await this.projectVendorService.findByVendor(
      vendorId,
      page,
      limit,
      { status },
    );

    const pageNum = page ?? 1;
    const limitNum = limit ?? 20;
    return {
      data: plainToInstance(ProjectVendorResponseDto, projectVendors, {
        excludeExtraneousValues: true,
      }),
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  // ==================== Collection Routes ====================

  /**
   * Assign vendor to project
   */
  @Post()
  @ApiCreate({
    summary: 'Assign vendor to project',
    responseType: ProjectVendorResponseDto,
  })
  async assignVendor(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProjectVendorDto,
  ): Promise<ProjectVendorResponseDto> {
    const projectVendor = await this.projectVendorService.assignVendorToProject(
      createDto,
      currentUser.id,
    );
    return plainToInstance(ProjectVendorResponseDto, projectVendor, {
      excludeExtraneousValues: true,
    });
  }

  // ==================== Item Routes (:id — MUST come after static routes) ====================

  /**
   * Get project-vendor by ID
   */
  @Get(':id')
  @ApiReadOne({ summary: 'Get project-vendor by ID', responseType: ProjectVendorResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectVendorResponseDto> {
    const projectVendor = await this.projectVendorService.findById(id);
    return plainToInstance(ProjectVendorResponseDto, projectVendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update project-vendor relationship
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update project-vendor',
    responseType: ProjectVendorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProjectVendorDto,
  ): Promise<ProjectVendorResponseDto> {
    const projectVendor = await this.projectVendorService.update(id, updateDto);
    return plainToInstance(ProjectVendorResponseDto, projectVendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Remove vendor from project
   */
  @Delete(':id')
  @ApiDelete({ summary: 'Remove vendor from project' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.projectVendorService.removeVendorFromProject(id);
    return { message: 'Vendor removed from project successfully' };
  }

  /**
   * Change vendor status
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change vendor status in project' })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', new ParseEnumPipe(ProjectVendorStatus)) status: ProjectVendorStatus,
  ): Promise<ProjectVendorResponseDto> {
    const projectVendor = await this.projectVendorService.changeStatus(id, status);
    return plainToInstance(ProjectVendorResponseDto, projectVendor, {
      excludeExtraneousValues: true,
    });
  }
}
