import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { toDto, toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { CreateDiscomDto, DiscomResponseDto, UpdateDiscomDto } from '../dto';
import { DiscomService } from '../services/discom.service';

@ApiTags('Discoms')
@Controller('discoms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DiscomController {
  constructor(private readonly discomService: DiscomService) {}

  @Post()
  @ApiCreate({
    summary: 'Create a new discom',
    description: 'Register a new DISCOM hierarchy entry',
    responseType: DiscomResponseDto,
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() body: CreateDiscomDto,
  ): Promise<DiscomResponseDto> {
    const discom = await this.discomService.create(body, currentUser.id);
    return toDto(DiscomResponseDto, discom);
  }

  @Get()
  @ApiReadAll({
    summary: 'Get all discoms',
    description: 'Retrieve all discoms, optionally filtered by search and active status',
    responseType: DiscomResponseDto,
    additionalQueries: [
      { name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' },
      {
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'Include inactive discoms (admin use)',
      },
      {
        name: 'search',
        required: false,
        type: String,
        description: 'Search by circle, division, subdivision, or section',
      },
      {
        name: 'circleName',
        required: false,
        type: String,
        description: 'Filter by circle name (exact match, case-insensitive)',
      },
      { name: 'page', required: false, type: Number, description: 'Page number (default: 1)' },
      { name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' },
      {
        name: 'sortBy',
        required: false,
        type: String,
        description: 'Sort field (circleName, divisionName, sectionName, createdAt)',
      },
      {
        name: 'sortOrder',
        required: false,
        type: String,
        description: 'Sort direction (ASC, DESC)',
      },
    ],
  })
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('search') search?: string,
    @Query('circleName') circleName?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<{
    data: DiscomResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      stats?: { circles: number; active: number; linkedProperties: number };
      circleNames?: string[];
    };
  }> {
    const result = await this.discomService.findAll({
      ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      ...(includeInactive !== undefined ? { includeInactive: includeInactive === 'true' } : {}),
      search,
      circleName,
      page,
      limit,
      sortBy,
      sortOrder: sortOrder === 'DESC' ? 'DESC' : 'ASC',
    });
    return {
      data: toDtoArray(DiscomResponseDto, result.data),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiReadOne({
    summary: 'Get discom by ID',
    description: 'Retrieve a specific discom',
    responseType: DiscomResponseDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<DiscomResponseDto> {
    const discom = await this.discomService.findById(id, {
      includeInactive: includeInactive === 'true',
    });
    return toDto(DiscomResponseDto, discom);
  }

  @Patch(':id')
  @ApiUpdate({
    summary: 'Update discom',
    description: 'Update an existing discom',
    responseType: DiscomResponseDto,
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDiscomDto,
  ): Promise<DiscomResponseDto> {
    const discom = await this.discomService.update(id, body, currentUser.id);
    return toDto(DiscomResponseDto, discom);
  }

  @Delete(':id')
  @ApiDelete({
    summary: 'Delete discom',
    description: 'Soft delete a discom',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.discomService.delete(id);
  }
}
