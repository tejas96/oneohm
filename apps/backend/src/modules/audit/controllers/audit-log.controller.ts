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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards';
import { CreateAuditLogDto, QueryAuditLogsDto, AuditLogResponseDto } from '../dto';
import { AuditLogService } from '../services/audit-log.service';

@ApiTags('Audit & Logging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
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
  @ApiOperation({ summary: 'Query audit logs with filters' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default: 100)',
  })
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
  @ApiOperation({ summary: 'Get recent audit logs' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default: 50)',
  })
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
  @ApiOperation({ summary: 'Get audit logs for a user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default: 100)',
  })
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
  @ApiOperation({ summary: 'Get audit logs for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default: 100)',
  })
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
