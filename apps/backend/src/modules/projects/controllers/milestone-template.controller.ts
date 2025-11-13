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
import {
  type CurrentUserType,
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import { type PaginatedResponse } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '@oneohm-epc/shared-utils';

import {
  CreateMilestoneTemplateDto,
  MilestoneTemplateResponseDto,
  UpdateMilestoneTemplateDto,
} from '../dto';
import { MilestoneTemplateService } from '../services';

@ApiTags('Milestone Templates')
@ApiBearerAuth()
@Controller('milestone-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MilestoneTemplateController {
  constructor(private readonly templateService: MilestoneTemplateService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiCreate({ responseType: MilestoneTemplateResponseDto, summary: 'Create a new milestone template' })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateMilestoneTemplateDto,
  ): Promise<MilestoneTemplateResponseDto> {
    return this.templateService.create(createDto, currentUser.id);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadAll({ responseType: MilestoneTemplateResponseDto, summary: 'Get all milestone templates' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<MilestoneTemplateResponseDto>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.templateService.findAll(
      currentUser.organizationId,
      pageNum,
      limitNum,
      {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        type,
        search,
      },
    );
  }

  @Get('active')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Get all active milestone templates' })
  async findAllActive(
    @CurrentUser() currentUser: CurrentUserType,
  ): Promise<MilestoneTemplateResponseDto[]> {
    return this.templateService.findAllActive(currentUser.organizationId);
  }

  @Get('type/:type')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({ summary: 'Get milestone templates by type' })
  async findByType(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('type') type: string,
  ): Promise<MilestoneTemplateResponseDto[]> {
    return this.templateService.findByType(currentUser.organizationId, type);
  }

  @Get('count')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get milestone template count' })
  async getCount(@CurrentUser() currentUser: CurrentUserType): Promise<{ count: number }> {
    const count = await this.templateService.getCount(currentUser.organizationId);
    return { count };
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadOne({ responseType: MilestoneTemplateResponseDto, summary: 'Get milestone template by ID' })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MilestoneTemplateResponseDto> {
    return this.templateService.findById(id, currentUser.organizationId);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiUpdate({ responseType: MilestoneTemplateResponseDto, summary: 'Update milestone template' })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMilestoneTemplateDto,
  ): Promise<MilestoneTemplateResponseDto> {
    return this.templateService.update(id, currentUser.organizationId, updateDto, currentUser.id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  @ApiDelete({ summary: 'Delete milestone template (soft delete)' })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.templateService.delete(id, currentUser.organizationId);
    return { message: 'Milestone template deleted successfully' };
  }
}

