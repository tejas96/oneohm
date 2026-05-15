import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';

import { OrganizationContext } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import { type CurrentUserType } from '../../auth/types';
import { EffectiveUnitPriceResponseDto } from '../dto/effective-unit-price-response.dto';
import { PricingService } from '../services/pricing.service';

/**
 * PricingController -- single-purpose read endpoint that resolves the
 * canonical ₹-per-piece price for any product. Used by the PO create form
 * (and any future mobile / external consumer) so suggested unit prices stay
 * in sync with the quote calculator's view of the catalog.
 *
 * NOTE: Lives on a new controller (not product-price.controller.ts) because
 * the latter's base route is `products/:productId/prices` which would
 * conflict with `/products/:productId/effective-price`.
 */
@ApiTags('Product Pricing')
@Controller('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get(':productId/effective-price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get effective per-piece price for a product',
    description:
      'Resolves the canonical ₹-per-piece price using product_types.default_pricing_basis, ' +
      'product_prices.unit_price, cost_multiplier, and (for per_watt) specifications.wattage. ' +
      'Returns unitPricePerPiece=null with source=none when no active price exists or when ' +
      'required conversion input (wattage / systemSizeKw) is missing -- callers should fall ' +
      'back to manual entry in that case.',
  })
  @ApiParam({ name: 'productId', type: String, example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiQuery({ name: 'projectType', required: false, type: String })
  @ApiQuery({
    name: 'asOf',
    required: false,
    type: String,
    description:
      'ISO date; defaults to today. Use poDate / quote.createdAt for historical lookups.',
  })
  @ApiQuery({
    name: 'systemSizeKw',
    required: false,
    type: Number,
    description: 'Required for per_kw structures to derive per-piece price.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: EffectiveUnitPriceResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found' })
  async getEffectivePrice(
    @OrganizationContext() organizationId: string,
    @CurrentUser() _currentUser: CurrentUserType,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('projectType') projectType?: string,
    @Query('asOf') asOf?: string,
    @Query('systemSizeKw') systemSizeKw?: string,
  ): Promise<EffectiveUnitPriceResponseDto> {
    const asOfDate = parseAsOf(asOf);
    const systemSize = systemSizeKw != null ? Number(systemSizeKw) : undefined;

    const resolved = await this.pricingService.getEffectiveUnitPrice(productId, organizationId, {
      projectType,
      asOf: asOfDate,
      systemSizeKw: systemSize != null && Number.isFinite(systemSize) ? systemSize : undefined,
    });

    return plainToInstance(EffectiveUnitPriceResponseDto, resolved, {
      excludeExtraneousValues: true,
    });
  }
}

/**
 * Parse `asOf` query into a Date that won't drift across TZ boundaries.
 * Date-only inputs (YYYY-MM-DD) are interpreted as local midnight so a PO
 * dated 2024-06-15 always matches `effective_from <= '2024-06-15'` regardless
 * of where the server is deployed. Full ISO timestamps pass through as-is.
 * Returns undefined for missing or unparseable values so the resolver falls
 * back to "today".
 */
function parseAsOf(asOf: string | undefined): Date | undefined {
  if (!asOf) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnly.test(asOf)) {
    const parts = asOf.split('-').map(Number);
    const [y, m, d] = parts as [number, number, number];
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(asOf);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
