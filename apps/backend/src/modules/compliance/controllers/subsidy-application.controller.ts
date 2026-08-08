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
import { SubsidyStatus } from '@tejas96/shared/types';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateSubsidyApplicationDto,
  UpdateSubsidyApplicationDto,
  SubsidyApplicationResponseDto,
} from '../dto';
import { SubsidyApplicationService } from '../services/subsidy-application.service';

@ApiTags('Compliance & Liaising')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subsidy-applications')
export class SubsidyApplicationController {
  constructor(private readonly subsidyService: SubsidyApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subsidy application' })
  @ApiResponse({
    status: 201,
    description: 'Subsidy application created successfully',
    type: SubsidyApplicationResponseDto,
  })
  async create(
    @Body() createDto: CreateSubsidyApplicationDto,
    @CurrentUser() user: { id: string },
  ): Promise<SubsidyApplicationResponseDto> {
    return this.subsidyService.create({
      ...createDto,
      createdBy: user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all subsidy applications' })
  @ApiResponse({
    status: 200,
    description: 'List of all subsidy applications',
    type: [SubsidyApplicationResponseDto],
  })
  async findAll(): Promise<SubsidyApplicationResponseDto[]> {
    return this.subsidyService.findAll();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get subsidy statistics by organization' })
  @ApiResponse({
    status: 200,
    description: 'Subsidy application statistics',
  })
  async getStatistics(
  ): Promise<Record<string, unknown>> {
    return this.subsidyService.getStatsByOrganization();
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get subsidy applications by project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of subsidy applications for project',
    type: [SubsidyApplicationResponseDto],
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<SubsidyApplicationResponseDto[]> {
    return this.subsidyService.findByProject(projectId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get subsidy applications by customer' })
  @ApiParam({ name: 'customerId', description: 'Customer UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of subsidy applications for customer',
    type: [SubsidyApplicationResponseDto],
  })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<SubsidyApplicationResponseDto[]> {
    return this.subsidyService.findByCustomer(customerId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get subsidy applications by status' })
  @ApiParam({ name: 'status', enum: SubsidyStatus })
  @ApiResponse({
    status: 200,
    description: 'List of subsidy applications with given status',
    type: [SubsidyApplicationResponseDto],
  })
  async findByStatus(
    @Param('status') status: SubsidyStatus,
  ): Promise<SubsidyApplicationResponseDto[]> {
    return this.subsidyService.findByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subsidy application by ID' })
  @ApiParam({ name: 'id', description: 'Subsidy Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Subsidy application found',
    type: SubsidyApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Subsidy application not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<SubsidyApplicationResponseDto> {
    return this.subsidyService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subsidy application' })
  @ApiParam({ name: 'id', description: 'Subsidy Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Subsidy application updated successfully',
    type: SubsidyApplicationResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSubsidyApplicationDto,
    @CurrentUser() user: { id: string },
  ): Promise<SubsidyApplicationResponseDto> {
    return this.subsidyService.update(id, {
      ...updateDto,
      updatedBy: user.id,
    } as UpdateSubsidyApplicationDto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve subsidy application' })
  @ApiParam({ name: 'id', description: 'Subsidy Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Subsidy application approved successfully',
    type: SubsidyApplicationResponseDto,
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('approvedAmount') approvedAmount: number,
  ): Promise<SubsidyApplicationResponseDto> {
    return this.subsidyService.approve(id, Number(approvedAmount));
  }

  @Patch(':id/disburse')
  @ApiOperation({ summary: 'Disburse subsidy' })
  @ApiParam({ name: 'id', description: 'Subsidy Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Subsidy disbursed successfully',
    type: SubsidyApplicationResponseDto,
  })
  async disburse(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('disbursementAmount') disbursementAmount: number,
    @Query('disbursementMode') disbursementMode: string,
    @Query('disbursementReference') disbursementReference: string,
  ): Promise<SubsidyApplicationResponseDto> {
    return this.subsidyService.disburse(
      id,
      Number(disbursementAmount),
      disbursementMode,
      disbursementReference,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subsidy application (soft delete)' })
  @ApiParam({ name: 'id', description: 'Subsidy Application UUID' })
  @ApiResponse({ status: 200, description: 'Subsidy application deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.subsidyService.delete(id);
    return { message: 'Subsidy application deleted successfully' };
  }
}
