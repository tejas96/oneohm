import {
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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateServiceTicketDto,
  ServiceTicketListResponseDto,
  ServiceTicketQueryDto,
  ServiceTicketResponseDto,
  ServiceTicketStatsDto,
  UpdateServiceTicketDto,
  UpdateTicketStatusDto,
} from '../dto';
import { ServiceTicketService } from '../services';

@ApiTags('Service Tickets')
@Controller('service-tickets')
@UseGuards(JwtAuthGuard)
export class ServiceTicketController {
  constructor(private readonly ticketService: ServiceTicketService) {}

  // ============================================
  // CREATE
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create a service ticket' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ServiceTicketResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'The selected project does not belong to the selected customer',
  })
  async create(
    @Body() dto: CreateServiceTicketDto,
    @CurrentUser() user: { id: string },
  ): Promise<ServiceTicketResponseDto> {
    const created = await this.ticketService.create(dto, user.id);
    return this.ticketService.toResponseDto(await this.ticketService.findById(created.id));
  }

  // ============================================
  // READ
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List service tickets' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketListResponseDto })
  async findAll(@Query() query: ServiceTicketQueryDto): Promise<ServiceTicketListResponseDto> {
    const { items, total } = await this.ticketService.findAll(query);
    return {
      items: items.map((ticket) => this.ticketService.toListItemDto(ticket)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Declared before `:id` — Nest matches in declaration order, so the other way
   * round `/stats` would hit the id route and fail ParseUUIDPipe with a 400.
   */
  @Get('stats')
  @ApiOperation({ summary: 'Ticket counts by status, plus the active urgent count' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketStatsDto })
  async getStats(): Promise<ServiceTicketStatsDto> {
    return this.ticketService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service ticket with its status history' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceTicketResponseDto> {
    return this.ticketService.toResponseDto(await this.ticketService.findById(id));
  }

  // ============================================
  // UPDATE
  // ============================================

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service ticket' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Ticket is closed' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceTicketDto,
    @CurrentUser() user: { id: string },
  ): Promise<ServiceTicketResponseDto> {
    return this.ticketService.toResponseDto(await this.ticketService.update(id, dto, user.id));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change ticket status' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceTicketResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Resolution note missing when resolving',
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Ticket is closed' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: { id: string },
  ): Promise<ServiceTicketResponseDto> {
    return this.ticketService.toResponseDto(
      await this.ticketService.updateStatus(id, dto, user.id),
    );
  }

  // ============================================
  // DELETE
  // ============================================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a service ticket' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Ticket deleted' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ticketService.softDelete(id);
  }
}
