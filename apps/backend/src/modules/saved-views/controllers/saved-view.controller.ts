import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { PermissionGuard } from '../../iam/guards/permission.guard';
import {
  CreateSavedViewDto,
  SavedViewResponseDto,
  UpdateSavedViewDto,
} from '../dto';
import { SavedViewService } from '../services/saved-view.service';
import { isSavedViewResource } from '../types/saved-view-resource';

@ApiTags('Saved Views')
@ApiBearerAuth()
@Controller('saved-views')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SavedViewController {
  constructor(private readonly service: SavedViewService) {}

  @RequirePermission('saved-view:read')
  @Get()
  @ApiOperation({ summary: 'List saved views for the current user on a given resource' })
  @ApiResponse({ status: 200, type: [SavedViewResponseDto] })
  async list(
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
    @Query('resource') resource?: string,
  ): Promise<SavedViewResponseDto[]> {
    if (!resource) {
      throw new BadRequestException('Query param "resource" is required');
    }
    if (!isSavedViewResource(resource)) {
      throw new BadRequestException(`Unknown resource "${resource}"`);
    }
    const views = await this.service.list(organizationId, user.id, resource);
    return plainToInstance(SavedViewResponseDto, views, { excludeExtraneousValues: true });
  }

  @RequirePermission('saved-view:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a single saved view by id (current user only)' })
  @ApiResponse({ status: 200, type: SavedViewResponseDto })
  @ApiResponse({ status: 404, description: 'Saved view not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<SavedViewResponseDto> {
    const view = await this.service.findOne(id, organizationId, user.id);
    return plainToInstance(SavedViewResponseDto, view, { excludeExtraneousValues: true });
  }

  @RequirePermission('saved-view:write')
  @Post()
  @ApiOperation({ summary: 'Create a saved view for the current user' })
  @ApiResponse({ status: 201, type: SavedViewResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed (unknown filter keys, etc.)' })
  @ApiResponse({ status: 409, description: 'Name already exists or 25-view cap reached' })
  async create(
    @Body() dto: CreateSavedViewDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<SavedViewResponseDto> {
    const view = await this.service.create(dto, organizationId, user.id);
    return plainToInstance(SavedViewResponseDto, view, { excludeExtraneousValues: true });
  }

  @RequirePermission('saved-view:write')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved view (rename and/or replace filters)' })
  @ApiResponse({ status: 200, type: SavedViewResponseDto })
  @ApiResponse({ status: 404, description: 'Saved view not found' })
  @ApiResponse({ status: 409, description: 'Name conflict' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSavedViewDto,
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<SavedViewResponseDto> {
    const view = await this.service.update(id, dto, organizationId, user.id);
    return plainToInstance(SavedViewResponseDto, view, { excludeExtraneousValues: true });
  }

  @RequirePermission('saved-view:write')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved view' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Saved view not found' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @OrganizationContext() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    await this.service.delete(id, organizationId, user.id);
  }
}
