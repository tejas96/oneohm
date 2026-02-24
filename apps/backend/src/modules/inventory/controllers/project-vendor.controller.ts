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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectVendorStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateProjectVendorDto, ProjectVendorResponseDto, UpdateProjectVendorDto } from '../dto';
import { ProjectVendorService } from '../services';

/**
 * Project Vendor Controller
 * Handles HTTP requests for project-vendor relationship management
 */
@ApiTags('Inventory - Project Vendors')
@ApiBearerAuth()
@Controller('project-vendors')
@UseGuards(JwtAuthGuard)
export class ProjectVendorController {
  constructor(private readonly projectVendorService: ProjectVendorService) {}

  /**
   * Assign vendor to project
   */
  @Post()
  @ApiCreate({
    summary: 'Assign vendor to project',
    description: 'Create a relationship between a vendor and a project',
    responseType: ProjectVendorResponseDto,
  })
  async assignVendor(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateProjectVendorDto,
  ): Promise<ProjectVendorResponseDto> {
    const projectVendor = await this.projectVendorService.assignVendorToProject(
      organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(ProjectVendorResponseDto, projectVendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get project-vendor by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get project-vendor by ID',
    description: 'Retrieve a specific project-vendor relationship by its ID',
    responseType: ProjectVendorResponseDto,
  })
  async findOne(
    @OrganizationContext() _organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectVendorResponseDto> {
    const projectVendor = await this.projectVendorService.findById(id);

    return plainToInstance(ProjectVendorResponseDto, projectVendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all vendors for a project
   */
  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get vendors by project',
    description: 'Retrieve all vendors assigned to a specific project',
  })
  async findByProject(
    @OrganizationContext() _organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectVendorResponseDto[]> {
    const projectVendors = await this.projectVendorService.findByProject(projectId);

    return plainToInstance(ProjectVendorResponseDto, projectVendors, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all projects for a vendor
   */
  @Get('vendor/:vendorId')
  @ApiReadAll({
    summary: 'Get projects by vendor',
    description: 'Retrieve all projects assigned to a specific vendor',
    responseType: ProjectVendorResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ProjectVendorStatus),
    description: 'Filter by status',
  })
  async findByVendor(
    @OrganizationContext() _organizationId: string,
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
      {
        status,
      },
    );

    return {
      data: plainToInstance(ProjectVendorResponseDto, projectVendors, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page: page ?? 1,
        limit: limit ?? 20,
        total,
        totalPages: Math.ceil(total / (limit ?? 20)),
      },
    };
  }

  /**
   * Update project-vendor relationship
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update project-vendor',
    description: 'Update an existing project-vendor relationship',
    responseType: ProjectVendorResponseDto,
  })
  async update(
    @OrganizationContext() _organizationId: string,
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
  @ApiDelete({
    summary: 'Remove vendor from project',
    description: 'Delete a project-vendor relationship (inactive only)',
  })
  async remove(
    @OrganizationContext() _organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.projectVendorService.removeVendorFromProject(id);

    return { message: 'Vendor removed from project successfully' };
  }

  /**
   * Change vendor status
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change vendor status',
    description: 'Update the status of a project-vendor relationship',
  })
  async changeStatus(
    @OrganizationContext() _organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ProjectVendorStatus,
  ): Promise<ProjectVendorResponseDto> {
    const projectVendor = await this.projectVendorService.changeStatus(id, status);

    return plainToInstance(ProjectVendorResponseDto, projectVendor, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get total contract value for a project
   */
  @Get('project/:projectId/contract-value')
  @ApiOperation({
    summary: 'Get total contract value',
    description: 'Calculate total contract value for all active vendors in a project',
  })
  async getTotalContractValue(
    @OrganizationContext() _organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ totalValue: number }> {
    const totalValue = await this.projectVendorService.getTotalContractValueByProject(projectId);

    return { totalValue };
  }

  /**
   * Get active vendors for a project
   */
  @Get('project/:projectId/active')
  @ApiOperation({
    summary: 'Get active vendors',
    description: 'Retrieve all active vendors for a project',
  })
  async getActiveVendors(
    @OrganizationContext() _organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectVendorResponseDto[]> {
    const projectVendors = await this.projectVendorService.getActiveVendorsByProject(projectId);

    return plainToInstance(ProjectVendorResponseDto, projectVendors, {
      excludeExtraneousValues: true,
    });
  }
}
