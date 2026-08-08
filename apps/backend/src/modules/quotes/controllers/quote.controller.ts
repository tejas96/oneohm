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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IntegrationProvider, type PaginatedResponse } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import {
  ApiCreate,
  ApiDelete,
  ApiReadAll,
  ApiReadOne,
  ApiUpdate,
} from '../../../common/decorators';
import { toPaginatedResponse } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { IntegrationService } from '../../integrations/services';
import {
  CreateQuoteDto,
  QuoteQueryDto,
  QuoteResponseDto,
  ShareQuoteWhatsappDto,
  ShareQuoteWhatsappResponseDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from '../dto';
import { QuoteService } from '../services/quote.service';
import type { UploadedPdfFile } from '../types/uploaded-pdf-file.interface';

/**
 * Quote Controller
 * Handles HTTP requests for quote management
 */
@ApiTags('Quotes & Quotations')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    private readonly integrationService: IntegrationService,
  ) {}

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
    @CurrentUser() currentUser: CurrentUserType,
    @Body() createDto: CreateQuoteDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.create(createDto, currentUser.id);

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
    @CurrentUser() currentUser: CurrentUserType,
    @Query() query: QuoteQueryDto,
  ): Promise<PaginatedResponse<QuoteResponseDto>> {
    const result = await this.quoteService.findAll(query);
    return toPaginatedResponse(
      QuoteResponseDto,
      result.data,
      result.total,
      query.page,
      query.limit,
    );
  }

  /**
   * Check if a property is locked (has an accepted quote)
   */
  @Get('property-lock-status')
  @ApiOperation({
    summary: 'Get property lock status',
    description:
      'Returns whether a property has an accepted quote, blocking further status changes and new quote creation.',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getPropertyLockStatus(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<{ locked: boolean; acceptedQuoteNumber?: string }> {
    return this.quoteService.getPropertyLockStatus(propertyId);
  }

  /**
   * Get all quote entries for a property, ordered by creation date (latest first)
   */
  @Get('property/:propertyId/versions')
  @ApiOperation({
    summary: 'Get property quote versions',
    description:
      'Returns all quotes for a property (accepted-first, then latest by creation date).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [QuoteResponseDto] })
  async findByProperty(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<QuoteResponseDto[]> {
    const quotes = await this.quoteService.findAllByPropertyId(propertyId);
    return plainToInstance(QuoteResponseDto, quotes, { excludeExtraneousValues: true });
  }

  @Get('whatsapp/health')
  @ApiOperation({
    summary: 'WhatsApp messaging health',
    description: 'Returns Meta can_send_message status for the active WhatsApp integration.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: { example: { canSend: true, errors: [] } },
  })
  async getWhatsappHealth(): Promise<{
    canSend: boolean;
    errors: Array<{ code?: string | number; description?: string }>;
  }> {
    return this.integrationService.getMessagingHealth(IntegrationProvider.WHATSAPP_BUSINESS);
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
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.findById(id);

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
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateQuoteDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.update(id, updateDto, currentUser.id);

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
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateQuoteStatusDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.updateStatus(id, statusDto, currentUser.id);

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/share/whatsapp')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Share quote PDF on WhatsApp',
    description:
      'Upload a quote PDF (multipart) or resend using an existing documentId (JSON). ' +
      'Sends the quotation_pdf WhatsApp template with the PDF as the header document.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'WhatsApp message accepted by Meta',
    type: ShareQuoteWhatsappResponseDto,
  })
  async shareOnWhatsapp(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShareQuoteWhatsappDto,
    @UploadedFile() file?: UploadedPdfFile,
  ): Promise<ShareQuoteWhatsappResponseDto> {
    return this.quoteService.shareOnWhatsapp(id, dto, currentUser.id, file);
  }

  /**
   * Delete quote
   */
  @ApiDelete({
    summary: 'Delete quote',
    description: 'Soft delete a quote. Cannot delete accepted quotes.',
  })
  async delete(
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.quoteService.delete(id);
  }
}
