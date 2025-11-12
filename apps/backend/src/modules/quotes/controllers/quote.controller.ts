import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type CurrentUserType,
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@oneohm-epc/shared-auth';
import { type PaginatedResponse, QuoteStatus } from '@oneohm-epc/shared-types';
import { ApiCreate, ApiDelete, ApiReadAll, ApiReadOne, ApiUpdate } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CreateQuoteDto, QuoteResponseDto, UpdateQuoteDto, UpdateQuoteStatusDto } from '../dto';
import { QuoteService } from '../services/quote.service';

/**
 * Quote Controller
 * Handles HTTP requests for quote management
 */
@ApiTags('Quotes & Quotations')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  /**
   * Create a new quote
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiCreate({
    summary: 'Create a new quote',
    description: 'Creates a new quote with initial version and line items',
    responseType: QuoteResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async create(
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateQuoteDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.create(
      currentUser.organizationId,
      createDto,
      currentUser.id,
    );

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all quotes with filters
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadAll({
    summary: 'Get all quotes',
    description: 'Retrieve all quotes with optional filters and pagination',
    responseType: QuoteResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(QuoteStatus),
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: String,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'salesPersonId',
    required: false,
    type: String,
    description: 'Filter by sales person ID',
  })
  @ApiQuery({
    name: 'resellerId',
    required: false,
    type: String,
    description: 'Filter by reseller ID',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter from date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter to date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in quote number or customer name',
  })
  async findAll(
    @CurrentUser() currentUser: CurrentUserType,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: QuoteStatus,
    @Query('customerId') customerId?: string,
    @Query('salesPersonId') salesPersonId?: string,
    @Query('resellerId') resellerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<QuoteResponseDto>> {
    const result = await this.quoteService.findAll(currentUser.organizationId, page, limit, {
      status,
      customerId,
      salesPersonId,
      resellerId,
      fromDate,
      toDate,
      search,
    });

    return {
      data: plainToInstance(QuoteResponseDto, result.quotes, {
        excludeExtraneousValues: true,
      }),
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Get quote by ID
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiReadOne({
    summary: 'Get quote by ID',
    description: 'Retrieve a specific quote with all versions and line items',
    responseType: QuoteResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async findOne(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.findById(id, currentUser.organizationId);

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update quote (creates new version)
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiUpdate({
    summary: 'Update quote',
    description:
      'Update quote details. Automatically creates a new version. Cannot update accepted/rejected quotes.',
    responseType: QuoteResponseDto,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES],
  })
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateQuoteDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.update(
      id,
      currentUser.organizationId,
      updateDto,
      currentUser.id,
    );

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update quote status
   */
  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES)
  @ApiOperation({
    summary: 'Update quote status',
    description: `
      Change quote status (send, accept, reject, expire)
      
      Status workflow:
      - DRAFT → SENT: Sales person sends quote to customer
      - SENT → VIEWED: Customer opens/views quote
      - VIEWED/SENT → ACCEPTED: Customer accepts quote (requires signature)
      - VIEWED/SENT → REJECTED: Customer rejects quote (requires reason)
      - VIEWED/SENT → EXPIRED: Quote expires (auto or manual)
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quote status updated successfully',
    type: QuoteResponseDto,
  })
  async updateStatus(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateQuoteStatusDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.updateStatus(
      id,
      currentUser.organizationId,
      statusDto,
      currentUser.id,
    );

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete quote
   */
  @ApiDelete({
    summary: 'Delete quote',
    description: 'Soft delete a quote. Cannot delete accepted quotes.',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
  })
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async delete(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.quoteService.delete(id, currentUser.organizationId);
    return { message: 'Quote deleted successfully' };
  }
}
