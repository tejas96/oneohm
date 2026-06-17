import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectType } from '@tejas96/shared/types';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import {
  CreateSubsidyConfigurationDto,
  SubsidyConfigurationResponseDto,
  UpdateSubsidyConfigurationDto,
} from '../dto/subsidy-configuration';
import { SubsidyConfigurationService } from '../services/subsidy-configuration.service';

@ApiTags('Subsidy Configuration')
@Controller('subsidy-configurations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SubsidyConfigurationController {
  constructor(private readonly subsidyConfigurationService: SubsidyConfigurationService) {}

  @Post()
  @ApiCreate({
    summary: 'Create subsidy configuration',
    description: 'Create a new subsidy configuration for a project type',
    responseType: SubsidyConfigurationResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: CreateSubsidyConfigurationDto,
  ): Promise<SubsidyConfigurationResponseDto> {
    const config = await this.subsidyConfigurationService.create(
      organizationId,
      body,
      currentUser.id,
    );
    return toDto(SubsidyConfigurationResponseDto, config);
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all subsidy configurations',
    description: 'Retrieve all subsidy configurations with optional filters',
    responseType: SubsidyConfigurationResponseDto,
    additionalQueries: [
      {
        name: 'projectType',
        required: false,
        enum: ProjectType,
        description: 'Filter by project type',
      },
      {
        name: 'isActive',
        required: false,
        type: Boolean,
        description: 'Filter by active status',
      },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search by scheme name or code',
      },
    ],
    includePagination: false,
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Query('projectType') projectType?: ProjectType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ): Promise<SubsidyConfigurationResponseDto[]> {
    const filter =
      isActive !== undefined
        ? { projectType, isActive: isActive === 'true', search }
        : { projectType, search };
    const configs = await this.subsidyConfigurationService.findAll(organizationId, filter);
    return toDtoArray(SubsidyConfigurationResponseDto, configs);
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get subsidy configuration by ID',
    description: 'Retrieve a specific subsidy configuration',
    responseType: SubsidyConfigurationResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubsidyConfigurationResponseDto> {
    const config = await this.subsidyConfigurationService.findById(id, organizationId);
    return toDto(SubsidyConfigurationResponseDto, config);
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update subsidy configuration',
    description: 'Update an existing subsidy configuration',
    responseType: SubsidyConfigurationResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSubsidyConfigurationDto,
  ): Promise<SubsidyConfigurationResponseDto> {
    const config = await this.subsidyConfigurationService.update(
      id,
      organizationId,
      body,
      currentUser.id,
    );
    return toDto(SubsidyConfigurationResponseDto, config);
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete subsidy configuration',
    description: 'Delete a subsidy configuration',
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.subsidyConfigurationService.delete(id, organizationId);
  }
}
