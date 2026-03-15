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
import { ComplianceStatus } from '@oneohm-epc/shared/types';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateComplianceApplicationDto,
  UpdateComplianceApplicationDto,
  ComplianceApplicationResponseDto,
} from '../dto';
import { ComplianceApplicationService } from '../services/compliance-application.service';

@ApiTags('Compliance & Liaising')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance-applications')
export class ComplianceApplicationController {
  constructor(private readonly complianceService: ComplianceApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new compliance application' })
  @ApiResponse({
    status: 201,
    description: 'Compliance application created successfully',
    type: ComplianceApplicationResponseDto,
  })
  async create(
    @Body() createDto: CreateComplianceApplicationDto,
    @CurrentUser() user: { id: string },
  ): Promise<ComplianceApplicationResponseDto> {
    return this.complianceService.create({
      ...createDto,
      createdBy: user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all compliance applications' })
  @ApiResponse({
    status: 200,
    description: 'List of all compliance applications',
    type: [ComplianceApplicationResponseDto],
  })
  async findAll(): Promise<ComplianceApplicationResponseDto[]> {
    return this.complianceService.findAll();
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get compliance applications by project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of compliance applications for project',
    type: [ComplianceApplicationResponseDto],
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ComplianceApplicationResponseDto[]> {
    return this.complianceService.findByProject(projectId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get compliance applications by status' })
  @ApiParam({ name: 'status', enum: ComplianceStatus })
  @ApiResponse({
    status: 200,
    description: 'List of compliance applications with given status',
    type: [ComplianceApplicationResponseDto],
  })
  async findByStatus(
    @Param('status') status: ComplianceStatus,
  ): Promise<ComplianceApplicationResponseDto[]> {
    return this.complianceService.findByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get compliance application by ID' })
  @ApiParam({ name: 'id', description: 'Compliance Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Compliance application found',
    type: ComplianceApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Compliance application not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ComplianceApplicationResponseDto> {
    return this.complianceService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a compliance application' })
  @ApiParam({ name: 'id', description: 'Compliance Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Compliance application updated successfully',
    type: ComplianceApplicationResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateComplianceApplicationDto,
    @CurrentUser() user: { id: string },
  ): Promise<ComplianceApplicationResponseDto> {
    return this.complianceService.update(id, {
      ...updateDto,
      updatedBy: user.id,
    } as UpdateComplianceApplicationDto);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit compliance application' })
  @ApiParam({ name: 'id', description: 'Compliance Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Compliance application submitted successfully',
    type: ComplianceApplicationResponseDto,
  })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<ComplianceApplicationResponseDto> {
    return this.complianceService.submit(id, user.id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve compliance application' })
  @ApiParam({ name: 'id', description: 'Compliance Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Compliance application approved successfully',
    type: ComplianceApplicationResponseDto,
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('approvalDocumentPath') approvalDocumentPath?: string,
  ): Promise<ComplianceApplicationResponseDto> {
    return this.complianceService.approve(id, approvalDocumentPath);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject compliance application' })
  @ApiParam({ name: 'id', description: 'Compliance Application UUID' })
  @ApiResponse({
    status: 200,
    description: 'Compliance application rejected successfully',
    type: ComplianceApplicationResponseDto,
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('rejectionReason') rejectionReason: string,
  ): Promise<ComplianceApplicationResponseDto> {
    return this.complianceService.reject(id, rejectionReason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a compliance application (soft delete)' })
  @ApiParam({ name: 'id', description: 'Compliance Application UUID' })
  @ApiResponse({ status: 200, description: 'Compliance application deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.complianceService.delete(id);
    return { message: 'Compliance application deleted successfully' };
  }
}
