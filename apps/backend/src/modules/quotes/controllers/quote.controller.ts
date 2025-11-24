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
import { type PaginatedResponse, QuoteStatus } from '@oneohm-epc/shared-types';
import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { CreateQuoteDto, QuoteResponseDto, UpdateQuoteDto, UpdateQuoteStatusDto } from '../dto';
import { QuoteService } from '../services/quote.service';

/**
 * Quote Controller
 * Handles HTTP requests for quote management
 */
@ApiTags('Quotes & Quotations')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  /**
   * Create a new quote
   */
  @Post()
  @ApiCreate({
    summary: 'Create a new quote',
    description: 'Creates a new quote with initial version and line items',
    responseType: QuoteResponseDto,
  })
  async create(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateQuoteDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.create(organizationId, createDto, currentUser.id);

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all quotes with filters
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all quotes',
    description: 'Retrieve all quotes with optional filters and pagination',
    responseType: QuoteResponseDto,
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
    @OrganizationContext() organizationId: string,
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
    const result = await this.quoteService.findAll(organizationId, page, limit, {
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
  @ApiReadOne({
    summary: 'Get quote by ID',
    description: 'Retrieve a specific quote with all versions and line items',
    responseType: QuoteResponseDto,
  })
  async findOne(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.findById(id, organizationId);

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update quote (creates new version)
   */
  @Patch(':id')
  @ApiUpdate({
    summary: 'Update quote',
    description:
      'Update quote details. Automatically creates a new version. Cannot update accepted/rejected quotes.',
    responseType: QuoteResponseDto,
  })
  async update(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateQuoteDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.update(id, organizationId, updateDto, currentUser.id);

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update quote status
   */
  @Patch(':id/status')
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
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateQuoteStatusDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.updateStatus(
      id,
      organizationId,
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
  })
  async delete(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.quoteService.delete(id, organizationId);
    return { message: 'Quote deleted successfully' };
  }
}
