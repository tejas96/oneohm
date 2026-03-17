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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type PaginatedResponse } from '@oneohm-epc/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
  OrganizationContext,
} from '../../../common/decorators';
import { toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  CreateQuoteDto,
  QuoteQueryDto,
  QuoteResponseDto,
  QuoteVersionResponseDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from '../dto';
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
    description: 'Creates a new quote with initial version',
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
   * Get all quotes with filtering, sorting, and pagination
   * Unified endpoint supporting search, filters, and sorting via query parameters
   */
  @Get()
  @ApiReadAll({
    summary: 'Get all quotes',
    description:
      'Retrieve quotes with comprehensive filtering, sorting, and pagination. ' +
      'Supports search (quote number, customer name, phone, property name), ' +
      'status filter, date range, and sorting.',
    responseType: QuoteResponseDto,
  })
  async findAll(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Query() query: QuoteQueryDto,
  ): Promise<PaginatedResponse<QuoteResponseDto>> {
    const result = await this.quoteService.findAll(organizationId, query);
    return toPaginatedResponse(
      QuoteResponseDto,
      result.data,
      result.total,
      query.page,
      query.limit,
    );
  }

  /**
   * Get quote by ID
   */
  @Get(':id')
  @ApiReadOne({
    summary: 'Get quote by ID',
    description: 'Retrieve a specific quote with all versions',
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
   * Get a specific version of a quote with its line items
   */
  @Get(':id/versions/:versionId')
  @ApiReadOne({
    summary: 'Get quote version by ID',
    description: 'Retrieve a specific version of a quote',
    responseType: QuoteVersionResponseDto,
  })
  async findVersion(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<QuoteVersionResponseDto> {
    const version = await this.quoteService.findVersionById(id, versionId, organizationId);

    return plainToInstance(QuoteVersionResponseDto, version, {
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
