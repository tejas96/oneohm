import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuoteStatus } from '@tejas96/shared/types';
import { plainToInstance } from 'class-transformer';

import { OrganizationContext } from '../../../common/decorators';
import { toDtoArray } from '../../../common/utils';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import { QuoteResponseDto } from '../../quotes/dto';
import { QuoteService } from '../../quotes/services/quote.service';
import { ConsumerAcceptQuotationDto, ConsumerRejectQuotationDto } from '../dto';
import { CustomerOwnershipGuard } from '../guards';

/**
 * Consumer Quotation Controller
 * Customer-safe quotation read + accept/reject under /consumer/*.
 */
@ApiTags('Consumer')
@ApiBearerAuth()
@Controller('consumer')
@UseGuards(JwtAuthGuard, CustomerOwnershipGuard)
export class ConsumerQuotationController {
  constructor(private readonly quoteService: QuoteService) {}

  /**
   * List quotations for an owned property (excludes draft quotes).
   */
  @Get('properties/:propertyId/quotations')
  @ApiOperation({
    summary: 'List quotations for a property',
    description:
      'Returns customer-visible quotes for an owned property. Draft quotes are excluded.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of quotations',
    type: [QuoteResponseDto],
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async findByProperty(
    @OrganizationContext() organizationId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<QuoteResponseDto[]> {
    const quotes = await this.quoteService.findAllByPropertyId(propertyId, organizationId);

    // Property ownership is already verified by CustomerOwnershipGuard; return all
    // non-draft quotes for this property (quote.customerId may differ on legacy rows).
    const customerVisible = quotes.filter((quote) => quote.status !== QuoteStatus.DRAFT);

    return toDtoArray(QuoteResponseDto, customerVisible);
  }

  /**
   * Get a single quotation by ID (customer-owned, non-draft).
   */
  @Get('quotations/:quotationId')
  @ApiOperation({
    summary: 'Get quotation by ID',
    description: 'Returns a customer-owned quotation. Draft quotes are not accessible.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation details',
    type: QuoteResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async findOne(
    @OrganizationContext() organizationId: string,
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.findById(quotationId, organizationId);

    if (quote.status === QuoteStatus.DRAFT) {
      throw new ForbiddenException('Access denied: This quotation is not available yet');
    }

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Accept a quotation (requires customer signature).
   */
  @Post('quotations/:quotationId/accept')
  @ApiOperation({
    summary: 'Accept quotation',
    description:
      'Accepts a sent or viewed quotation. Requires customer signature. ' +
      'Property lock prevents accepting a second quote on the same property.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation accepted',
    type: QuoteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid transition or missing signature',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async accept(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
    @Body() body: ConsumerAcceptQuotationDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.updateStatus(
      quotationId,
      organizationId,
      {
        status: QuoteStatus.ACCEPTED,
        customerSignature: body.customerSignature,
      },
      currentUser.id,
    );

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Reject a quotation (requires rejection reason).
   */
  @Post('quotations/:quotationId/reject')
  @ApiOperation({
    summary: 'Reject quotation',
    description: 'Rejects a sent or viewed quotation. Requires a rejection reason.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation rejected',
    type: QuoteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid transition or missing reason',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized' })
  async reject(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Param('quotationId', ParseUUIDPipe) quotationId: string,
    @Body() body: ConsumerRejectQuotationDto,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteService.updateStatus(
      quotationId,
      organizationId,
      {
        status: QuoteStatus.REJECTED,
        rejectionReason: body.rejectionReason,
      },
      currentUser.id,
    );

    return plainToInstance(QuoteResponseDto, quote, {
      excludeExtraneousValues: true,
    });
  }
}
