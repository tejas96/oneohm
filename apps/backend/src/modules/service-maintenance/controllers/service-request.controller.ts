import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Role, JwtAuthGuard, RolesGuard, Roles } from '@oneohm-epc/shared-auth';
import { ServiceRequestStatus } from '@oneohm-epc/shared-types';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  ServiceRequestResponseDto,
} from '../dto';
import { ServiceRequestService } from '../services/service-request.service';

/**
 * Controller for Service Request Operations
 */
@ApiTags('Service & Maintenance - Service Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-requests')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.SALES, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Create a new service request' })
  @ApiResponse({
    status: 201,
    description: 'Service request created successfully',
    type: ServiceRequestResponseDto,
  })
  async create(
    @Body() createDto: CreateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestService.create(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get all service requests' })
  @ApiResponse({
    status: 200,
    description: 'Service requests retrieved successfully',
    type: [ServiceRequestResponseDto],
  })
  async findAll(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto[]> {
    return this.serviceRequestService.findAll(includeRelations === 'true');
  }

  @Get('open')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get open service requests' })
  @ApiResponse({
    status: 200,
    description: 'Open requests retrieved successfully',
    type: [ServiceRequestResponseDto],
  })
  async findOpen(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto[]> {
    return this.serviceRequestService.findOpen(includeRelations === 'true');
  }

  @Get('overdue')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Get overdue service requests' })
  @ApiResponse({
    status: 200,
    description: 'Overdue requests retrieved successfully',
    type: [ServiceRequestResponseDto],
  })
  async findOverdue(
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto[]> {
    return this.serviceRequestService.findOverdue(includeRelations === 'true');
  }

  @Get('project/:projectId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get requests by project' })
  @ApiResponse({
    status: 200,
    description: 'Requests retrieved successfully',
    type: [ServiceRequestResponseDto],
  })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto[]> {
    return this.serviceRequestService.findByProject(projectId, includeRelations === 'true');
  }

  @Get('customer/:customerId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get requests by customer' })
  @ApiResponse({
    status: 200,
    description: 'Requests retrieved successfully',
    type: [ServiceRequestResponseDto],
  })
  async findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto[]> {
    return this.serviceRequestService.findByCustomer(customerId, includeRelations === 'true');
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get requests assigned to user' })
  @ApiResponse({
    status: 200,
    description: 'Requests retrieved successfully',
    type: [ServiceRequestResponseDto],
  })
  async findByAssignedUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto[]> {
    return this.serviceRequestService.findByAssignedUser(userId, includeRelations === 'true');
  }

  @Get('status/:status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get requests by status' })
  @ApiResponse({
    status: 200,
    description: 'Requests retrieved successfully',
    type: [ServiceRequestResponseDto],
  })
  async findByStatus(
    @Param('status') status: ServiceRequestStatus,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto[]> {
    return this.serviceRequestService.findByStatus(status, includeRelations === 'true');
  }

  @Get('statistics/:organizationId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Get request statistics for organization' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<Record<string, unknown>> {
    return this.serviceRequestService.getStatistics(organizationId);
  }

  @Get('average-rating')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get average customer rating' })
  @ApiResponse({
    status: 200,
    description: 'Average rating retrieved successfully',
  })
  async getAverageRating(
    @Query('projectId') projectId?: string,
    @Query('customerId') customerId?: string,
  ): Promise<{ averageRating: number }> {
    const avgRating = await this.serviceRequestService.getAverageRating(projectId, customerId);
    return { averageRating: avgRating };
  }

  @Get('number/:requestNumber')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get request by request number' })
  @ApiResponse({
    status: 200,
    description: 'Request retrieved successfully',
    type: ServiceRequestResponseDto,
  })
  async findByRequestNumber(
    @Param('requestNumber') requestNumber: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestService.findByRequestNumber(
      requestNumber,
      includeRelations === 'true',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Get service request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Request retrieved successfully',
    type: ServiceRequestResponseDto,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeRelations') includeRelations?: string,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestService.findById(id, includeRelations === 'true');
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Update service request' })
  @ApiResponse({
    status: 200,
    description: 'Request updated successfully',
    type: ServiceRequestResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateServiceRequestDto,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestService.update(id, updateDto);
  }

  @Patch(':id/assign/:userId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Assign request to user' })
  @ApiResponse({
    status: 200,
    description: 'Request assigned successfully',
    type: ServiceRequestResponseDto,
  })
  async assignRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestService.assignRequest(id, userId);
  }

  @Patch(':id/resolve')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER, Role.FIELD_WORKER)
  @ApiOperation({ summary: 'Mark request as resolved' })
  @ApiResponse({
    status: 200,
    description: 'Request resolved successfully',
    type: ServiceRequestResponseDto,
  })
  async resolveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resolutionNotes') resolutionNotes: string,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestService.resolveRequest(id, resolutionNotes);
  }

  @Patch(':id/close')
  @Roles(Role.ADMIN, Role.MANAGER, Role.EXECUTION_ENGINEER)
  @ApiOperation({ summary: 'Close resolved request' })
  @ApiResponse({
    status: 200,
    description: 'Request closed successfully',
    type: ServiceRequestResponseDto,
  })
  async closeRequest(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceRequestResponseDto> {
    return this.serviceRequestService.closeRequest(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete service request (soft delete)' })
  @ApiResponse({ status: 200, description: 'Request deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.serviceRequestService.delete(id);
  }
}

