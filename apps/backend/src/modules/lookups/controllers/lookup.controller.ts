import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse, LookupScopeType } from '@tejas96/shared/types';
import { parsePaginationParams } from '@tejas96/shared/utils';

import {
  ApiAction,
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateLookupDto,
  LookupByTypeCodeResponseDto,
  LookupResponseDto,
  ToggleActiveLookupDto,
  UpdateLookupDto,
} from '../dto';
import { LookupService } from '../services/lookup.service';

@ApiTags('Lookups')
@Controller('lookups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  // ── Static routes BEFORE dynamic :id routes to prevent NestJS shadowing ──

  @Get('by-type/:typeCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get lookups by type code',
    description:
      'Returns active, ordered lookup entries for a given type — used to populate dropdowns',
  })
  @ApiQuery({ name: 'scopeType', required: false, enum: LookupScopeType })
  @ApiQuery({ name: 'scopeId', required: false, type: String })
  async findByTypeCode(
    @Param('typeCode') typeCode: string,
    @Query('scopeType') scopeType?: LookupScopeType,
    @Query('scopeId') scopeId?: string,
  ): Promise<LookupByTypeCodeResponseDto[]> {
    return this.lookupService.findByTypeCode(typeCode, scopeType, scopeId);
  }

  @Post()
  @ApiCreate({
    summary: 'Create a lookup entry',
    description: 'Creates a new lookup entry. For record-scoped entries, provide scopeId.',
    responseType: LookupResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: CreateLookupDto,
  ): Promise<LookupResponseDto> {
    return this.lookupService.create(body, currentUser.id);
  }

  @Get()
  @ApiReadAll({
    summary: 'List all lookups',
    description: 'Paginated list of all lookup entries with filtering support',
    responseType: LookupResponseDto,
    additionalQueries: [
      { name: 'typeCode', required: false, type: String, description: 'Filter by type code' },
      { name: 'scopeType', required: false, type: String, description: 'Filter by scope type' },
      { name: 'scopeId', required: false, type: String, description: 'Filter by scope ID (UUID)' },
      { name: 'parentId', required: false, type: String, description: 'Filter by parent ID' },
      { name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search label, code, or typeCode',
      },
      { name: 'page', required: false, type: Number, description: 'Page number (default: 1)' },
      { name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' },
      { name: 'sortBy', required: false, type: String, description: 'Sort field' },
      { name: 'sortOrder', required: false, type: String, description: 'ASC | DESC' },
    ],
  })
  async findAll(
    @Query('typeCode') typeCode?: string,
    @Query('scopeType') scopeType?: string,
    @Query('scopeId') scopeId?: string,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<PaginatedResponse<LookupResponseDto>> {
    const { page: pageNum, limit: limitNum } = parsePaginationParams(page, limit);
    return this.lookupService.findAll({
      typeCode,
      scopeType,
      scopeId,
      parentId,
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      search,
      page: pageNum,
      limit: limitNum,
      sortBy,
      sortOrder: sortOrder === 'DESC' ? ('DESC' as const) : ('ASC' as const),
    });
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get lookup by ID',
    description: 'Retrieve a specific lookup entry by its UUID',
    responseType: LookupResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LookupResponseDto> {
    return this.lookupService.findById(id);
  }

  @ApiUpdate({
    summary: 'Update lookup',
    description: 'Update an existing lookup entry',
    responseType: LookupResponseDto,
    method: 'PATCH',
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLookupDto,
  ): Promise<LookupResponseDto> {
    return this.lookupService.update(id, body, currentUser.id);
  }

  @ApiAction({
    path: 'toggle-active',
    summary: 'Toggle lookup active state',
    description: 'Activate or deactivate a lookup entry',
    responseType: LookupResponseDto,
  })
  async toggleActive(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ToggleActiveLookupDto,
  ): Promise<LookupResponseDto> {
    return this.lookupService.toggleActive(id, body.isActive, currentUser.id);
  }

  @ApiDelete({
    summary: 'Delete lookup',
    description: 'Soft delete a lookup entry',
  })
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.lookupService.delete(id, currentUser.id);
  }
}
