import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@oneohm-epc/shared-auth';

import { AuditLogService } from '../services/audit-log.service';
import {
  CreateAuditLogDto,
  QueryAuditLogsDto,
  AuditLogResponseDto,
} from '../dto';

@ApiTags('Audit & Logging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create audit log entry (manual)' })
  @ApiResponse({
    status: 201,
    description: 'Audit log created successfully',
    type: AuditLogResponseDto,
  })
  async create(@Body() createDto: CreateAuditLogDto): Promise<AuditLogResponseDto> {
    return this.auditLogService.create(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Query audit logs with filters' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default: 100)' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs',
    type: [AuditLogResponseDto],
  })
  async findWithFilters(
    @Query() filters: QueryAuditLogsDto,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.findWithFilters(filters, limit);
  }

  @Get('recent')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get recent audit logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default: 50)' })
  @ApiResponse({
    status: 200,
    description: 'List of recent audit logs',
    type: [AuditLogResponseDto],
  })
  async findRecent(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.findRecent(limit);
  }

  @Get('stats/actions')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get action statistics' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Action statistics',
  })
  async getActionStats(
    @Query('organizationId') organizationId?: string,
  ): Promise<Record<string, number>> {
    return this.auditLogService.getActionStats(organizationId);
  }

  @Get('stats/entities')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get entity type statistics' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Entity type statistics',
  })
  async getEntityTypeStats(
    @Query('organizationId') organizationId?: string,
  ): Promise<Record<string, number>> {
    return this.auditLogService.getEntityTypeStats(organizationId);
  }

  @Get('count')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Count audit logs with filters' })
  @ApiResponse({
    status: 200,
    description: 'Count of audit logs',
  })
  async countWithFilters(@Query() filters: QueryAuditLogsDto): Promise<{ count: number }> {
    const count = await this.auditLogService.countWithFilters(filters);
    return { count };
  }

  @Get('entity/:entityType/:entityId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type (e.g., user, project)' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs for entity',
    type: [AuditLogResponseDto],
  })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.findByEntity(entityType, entityId);
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get audit logs for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default: 100)' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs for user',
    type: [AuditLogResponseDto],
  })
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.findByUser(userId, limit);
  }

  @Get('organization/:organizationId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get audit logs for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default: 100)' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs for organization',
    type: [AuditLogResponseDto],
  })
  async findByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.findByOrganization(organizationId, limit);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiParam({ name: 'id', description: 'Audit Log UUID' })
  @ApiResponse({
    status: 200,
    description: 'Audit log found',
    type: AuditLogResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLogResponseDto> {
    return this.auditLogService.findById(id);
  }
}

