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
import { type PaginatedResponse } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateMilestoneTemplateDto,
  MilestoneTemplateResponseDto,
  UpdateMilestoneTemplateDto,
} from '../dto';
import { MilestoneTemplateService } from '../services';

@ApiTags('Milestone Templates')
@ApiBearerAuth()
@Controller('milestone-templates')
@UseGuards(JwtAuthGuard)
export class MilestoneTemplateController {
  constructor(private readonly templateService: MilestoneTemplateService) {}

  @Post()
  @ApiCreate({
    responseType: MilestoneTemplateResponseDto,
    summary: 'Create a new milestone template',
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateMilestoneTemplateDto,
  ): Promise<MilestoneTemplateResponseDto> {
    return this.templateService.create(createDto, currentUser.id);
  }

  @Get()
  @ApiReadAll({
    responseType: MilestoneTemplateResponseDto,
    summary: 'Get all milestone templates',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<MilestoneTemplateResponseDto>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.templateService.findAll(organizationId, pageNum, limitNum, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      type,
      search,
    });
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active milestone templates' })
  async findAllActive(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<MilestoneTemplateResponseDto[]> {
    return this.templateService.findAllActive(organizationId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get milestone templates by type' })
  async findByType(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('type') type: string,
  ): Promise<MilestoneTemplateResponseDto[]> {
    return this.templateService.findByType(organizationId, type);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get milestone template count' })
  async getCount(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
  ): Promise<{ count: number }> {
    const count = await this.templateService.getCount(organizationId);
    return { count };
  }

  @Get(':id')
  @ApiReadOne({
    responseType: MilestoneTemplateResponseDto,
    summary: 'Get milestone template by ID',
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MilestoneTemplateResponseDto> {
    return this.templateService.findById(id, organizationId);
  }

  @Patch(':id')
  @ApiUpdate({ responseType: MilestoneTemplateResponseDto, summary: 'Update milestone template' })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMilestoneTemplateDto,
  ): Promise<MilestoneTemplateResponseDto> {
    return this.templateService.update(id, organizationId, updateDto, currentUser.id);
  }

  @Delete(':id')
  @ApiDelete({ summary: 'Delete milestone template (soft delete)' })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.templateService.delete(id, organizationId);
    return { message: 'Milestone template deleted successfully' };
  }
}
