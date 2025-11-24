import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InspectionStatus } from '@oneohm-epc/shared-types';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { CreateInspectionDto, UpdateInspectionDto, InspectionResponseDto } from '../dto';
import { InspectionService } from '../services/inspection.service';

@ApiTags('Compliance & Liaising')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspections')
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new inspection' })
  @ApiResponse({
    status: 201,
    description: 'Inspection created successfully',
    type: InspectionResponseDto,
  })
  async create(
    @Body() createDto: CreateInspectionDto,
    @CurrentUser() user: { id: string },
  ): Promise<InspectionResponseDto> {
    return this.inspectionService.create({
      ...createDto,
      createdBy: user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all inspections' })
  @ApiResponse({
    status: 200,
    description: 'List of all inspections',
    type: [InspectionResponseDto],
  })
  async findAll(): Promise<InspectionResponseDto[]> {
    return this.inspectionService.findAll();
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming inspections' })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming inspections',
    type: [InspectionResponseDto],
  })
  async findUpcoming(): Promise<InspectionResponseDto[]> {
    return this.inspectionService.findUpcoming();
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get inspections by project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of inspections for project',
    type: [InspectionResponseDto],
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<InspectionResponseDto[]> {
    return this.inspectionService.findByProject(projectId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get inspections by status' })
  @ApiParam({ name: 'status', enum: InspectionStatus })
  @ApiResponse({
    status: 200,
    description: 'List of inspections with given status',
    type: [InspectionResponseDto],
  })
  async findByStatus(@Param('status') status: InspectionStatus): Promise<InspectionResponseDto[]> {
    return this.inspectionService.findByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inspection by ID' })
  @ApiParam({ name: 'id', description: 'Inspection UUID' })
  @ApiResponse({
    status: 200,
    description: 'Inspection found',
    type: InspectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Inspection not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<InspectionResponseDto> {
    return this.inspectionService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection UUID' })
  @ApiResponse({
    status: 200,
    description: 'Inspection updated successfully',
    type: InspectionResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInspectionDto,
    @CurrentUser() user: { id: string },
  ): Promise<InspectionResponseDto> {
    return this.inspectionService.update(id, {
      ...updateDto,
      updatedBy: user.id,
    } as UpdateInspectionDto);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection UUID' })
  @ApiResponse({
    status: 200,
    description: 'Inspection completed successfully',
    type: InspectionResponseDto,
  })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('passed') passed: boolean,
    @Query('report') report?: string,
  ): Promise<InspectionResponseDto> {
    return this.inspectionService.completeInspection(id, passed, report);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection UUID' })
  @ApiResponse({ status: 200, description: 'Inspection deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.inspectionService.delete(id);
    return { message: 'Inspection deleted successfully' };
  }
}
