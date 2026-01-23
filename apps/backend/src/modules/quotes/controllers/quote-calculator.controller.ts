import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ItemCategory, ProjectType, SystemType } from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  SubsidyConfigurationRepository,
  InstallationPricingRepository,
  QuoteConfigurationRepository,
} from '../../master-data/repositories';
import {
  CalculateQuoteDto,
  CalculateQuoteResponseDto,
  CreateQuoteDto,
  CreateQuoteFromCalculationDto,
} from '../dto';
import { QuoteCalculatorService } from '../services/quote-calculator.service';
import { QuoteService } from '../services/quote.service';

/**
 * Quote Calculator Controller
 * Handles HTTP requests for quote calculation
 *
 * Endpoints:
 * - POST /quote-calculator/calculate - Calculate quote preview
 * - POST /quote-calculator/create-from-calculation - Create quote from calculation
 * - GET /quote-calculator/config - Get organization's quote configuration
 * - GET /quote-calculator/subsidy-rules - Get subsidy configuration
 * - GET /quote-calculator/installation-pricing - Get installation pricing
 */
@ApiTags('Quote Calculator')
@ApiBearerAuth()
@Controller('quote-calculator')
@UseGuards(JwtAuthGuard)
export class QuoteCalculatorController {
  constructor(
    private readonly calculatorService: QuoteCalculatorService,
    private readonly quoteService: QuoteService,
    private readonly subsidyConfigRepo: SubsidyConfigurationRepository,
    private readonly installationPricingRepo: InstallationPricingRepository,
    private readonly quoteConfigRepo: QuoteConfigurationRepository,
  ) {}

  /**
   * Calculate quote preview
   * Returns calculated quote without saving
   */
  @Post('calculate')
  @ApiOperation({
    summary: 'Calculate quote preview',
    description: `
      Calculates a complete quote based on input parameters.
      Does NOT save the quote - use create-from-calculation for that.
      
      Features:
      - Auto DCR/Non-DCR split based on subsidy eligibility
      - Panel quantity calculation with wattage rounding
      - Inverter combination logic (e.g., 60KW → 50KW + 10KW)
      - Installation cost calculation
      - Tiered subsidy calculation
      - GST split (70% @ 12%, 30% @ 18%)
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calculated quote details',
    type: CalculateQuoteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or missing products/pricing',
  })
  async calculate(
    @OrganizationContext() organizationId: string,
    @Body() input: CalculateQuoteDto,
  ): Promise<CalculateQuoteResponseDto> {
    return this.calculatorService.calculateQuote(organizationId, input);
  }

  /**
   * Create quote from calculated result
   * Saves the quote with all line items
   */
  @Post('create-from-calculation')
  @ApiOperation({
    summary: 'Create quote from calculation',
    description: `
      Creates a new quote from the calculation input.
      Calculates the quote and saves it with all line items.
      Returns the created quote.
    `,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quote created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or missing products/pricing',
  })
  async createFromCalculation(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() input: CreateQuoteFromCalculationDto,
  ): Promise<{ quoteId: string; quoteNumber: string; calculation: CalculateQuoteResponseDto }> {
    // First calculate the quote
    const calculation = await this.calculatorService.calculateQuote(organizationId, input);

    // Get quote config for validity days
    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + quoteConfig.defaultValidityDays);

    // Build line items from calculation
    const lineItems = this.buildLineItemsFromCalculation(calculation);

    // Validate required fields for saving
    if (!input.customerId) {
      throw new BadRequestException('Customer ID is required to save a quote');
    }

    // Create quote DTO
    const createDto: CreateQuoteDto = {
      customerId: input.customerId,
      propertyId: input.propertyId,
      systemType: SystemType.ON_GRID, // Default to on-grid for now
      systemSizeKw: calculation.systemConfig.totalSystemSizeKw,
      totalWattageWp: calculation.actualTotalWattage,
      projectType: input.projectType,
      validUntil: validUntil.toISOString().split('T')[0] as string,
      isSubsidyApplicable: input.subsidyApplicable,
      internalNotes: input.internalNotes,
      customerNotes: input.customerNotes,
      discountAmount: input.discountAmount || 0,
      projectCompletionWeeks: calculation.completionWeeks,
      lineItems,
    };

    // Save the quote
    const quote = await this.quoteService.create(organizationId, createDto, currentUser.id);

    return {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      calculation,
    };
  }

  /**
   * Build line items from calculation response
   */
  private buildLineItemsFromCalculation(calculation: CalculateQuoteResponseDto) {
    const lineItems = [];
    let displayOrder = 1;

    // Add panel line items
    for (const panel of calculation.panels) {
      lineItems.push({
        productId: panel.productId,
        itemCategory: ItemCategory.SOLAR_PANELS,
        itemName: panel.name,
        itemDescription: `${panel.brand} ${panel.wattagePerPanel}W ${panel.isDcr ? 'DCR' : 'Non-DCR'}`,
        quantity: panel.quantity,
        unitPrice: panel.pricePerWatt * panel.wattagePerPanel,
        taxRate: 12, // Panels at 12% GST
        displayOrder: displayOrder++,
      });
    }

    // Add inverter line items
    for (const inverter of calculation.inverters.inverters) {
      lineItems.push({
        productId: inverter.productId,
        itemCategory: ItemCategory.INVERTERS,
        itemName: inverter.name,
        itemDescription: `${inverter.brand} ${inverter.capacityKw}kW Inverter`,
        quantity: inverter.quantity,
        unitPrice: inverter.unitPrice,
        taxRate: 12, // Inverters at 12% GST
        displayOrder: displayOrder++,
      });
    }

    // Add structure line item
    lineItems.push({
      productId: calculation.structure.productId,
      itemCategory: ItemCategory.MOUNTING,
      itemName: calculation.structure.name,
      itemDescription: `${calculation.structure.structureType} mounting structure`,
      quantity: calculation.structure.quantity,
      unitPrice: calculation.structure.unitPrice,
      taxRate: 18, // Structures at 18% GST
      displayOrder: displayOrder++,
    });

    // Add installation line item (as a service)
    lineItems.push({
      itemCategory: ItemCategory.INSTALLATION,
      itemName: 'Installation & Services',
      itemDescription: 'Electrical work, MSEDCL charges, transport, supervision',
      quantity: 1,
      unitPrice: calculation.installation.totalBeforeTax,
      taxRate: 18, // Services at 18% GST
      displayOrder: displayOrder++,
    });

    return lineItems;
  }

  /**
   * Get organization's quote configuration
   */
  @Get('config')
  @ApiOperation({
    summary: 'Get quote configuration',
    description: `
      Returns the active quote configuration for the organization.
      Includes:
      - Default validity days
      - Max versions
      - GST configuration
      - Wattage rounding rules
      - Payment milestones
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quote configuration',
  })
  async getConfig(@OrganizationContext() organizationId: string) {
    return this.quoteConfigRepo.getOrCreateDefault(organizationId);
  }

  /**
   * Get subsidy rules for a project type
   */
  @Get('subsidy-rules')
  @ApiOperation({
    summary: 'Get subsidy rules',
    description: `
      Returns the active subsidy configuration for a project type.
      Includes:
      - Scheme name
      - Max eligible kW
      - DCR requirement
      - Tiered rates
    `,
  })
  @ApiQuery({
    name: 'projectType',
    enum: ProjectType,
    required: true,
    description: 'Project type to get subsidy rules for',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subsidy configuration',
  })
  async getSubsidyRules(
    @OrganizationContext() organizationId: string,
    @Query('projectType') projectType: ProjectType,
  ) {
    return this.subsidyConfigRepo.findActiveByProjectType(organizationId, projectType);
  }

  /**
   * Get all subsidy configurations
   */
  @Get('subsidy-rules/all')
  @ApiOperation({
    summary: 'Get all subsidy rules',
    description: 'Returns all subsidy configurations for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of subsidy configurations',
  })
  async getAllSubsidyRules(@OrganizationContext() organizationId: string) {
    return this.subsidyConfigRepo.findAll(organizationId);
  }

  /**
   * Get installation pricing for a system size
   */
  @Get('installation-pricing')
  @ApiOperation({
    summary: 'Get installation pricing',
    description: `
      Returns installation pricing for a specific system size.
      Includes:
      - Electrical work cost
      - Fixed material cost
      - Floor variable cost
      - MSEDCL charges
      - Transport cost
    `,
  })
  @ApiQuery({
    name: 'systemSizeKw',
    type: Number,
    required: true,
    description: 'System size in kW',
  })
  @ApiQuery({
    name: 'projectType',
    enum: ProjectType,
    required: true,
    description: 'Project type',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Installation pricing',
  })
  async getInstallationPricing(
    @OrganizationContext() organizationId: string,
    @Query('systemSizeKw') systemSizeKw: number,
    @Query('projectType') projectType: ProjectType,
  ) {
    return this.installationPricingRepo.findBySystemSize(organizationId, systemSizeKw, projectType);
  }

  /**
   * Get all installation pricing tiers
   */
  @Get('installation-pricing/all')
  @ApiOperation({
    summary: 'Get all installation pricing tiers',
    description: 'Returns all installation pricing configurations for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of installation pricing tiers',
  })
  async getAllInstallationPricing(@OrganizationContext() organizationId: string) {
    return this.installationPricingRepo.findAll(organizationId);
  }
}
