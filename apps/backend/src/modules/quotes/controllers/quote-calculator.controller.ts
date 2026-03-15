import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  applyPreGstDiscount,
  type CalculatorInputs,
  DcrPreference,
  ItemCategory,
  type PricingBreakdown,
  ProjectType,
  type QuoteConfigSnapshot,
  QuoteCalculationMode,
  SystemType,
} from '@oneohm-epc/shared-types';
import { OrganizationContext } from '@oneohm-epc/shared-utils';
import { plainToInstance } from 'class-transformer';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import type { CurrentUserType } from '../../auth/types';
import {
  InstallationPricingResponseDto,
  QuoteConfigurationResponseDto,
  SubsidyConfigurationResponseDto,
} from '../../master-data/dto';
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
  UpdateQuoteDto,
} from '../dto';
import { QuoteRepository } from '../repositories';
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
    private readonly quoteRepository: QuoteRepository,
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
      - GST split (70% @ 5%, 30% @ 18%)
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
    const result = await this.calculatorService.calculateQuote(organizationId, input);
    return result;
  }

  /**
   * Create or revise a quote from calculated result.
   * When `quoteId` is omitted a brand-new quote (version 1) is created.
   * When `quoteId` is provided the existing quote gets a new version.
   */
  @Post('create-from-calculation')
  @ApiOperation({
    summary: 'Create or revise quote from calculation',
    description: `
      Calculates a quote and saves it.
      - Without quoteId: creates a new quote (version 1).
      - With quoteId: creates a new version of the existing quote.
    `,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quote created / revised successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or missing products/pricing',
  })
  async createFromCalculation(
    @OrganizationContext() organizationId: string,
    @CurrentUser() currentUser: CurrentUserType,
    @Body() input: CreateQuoteFromCalculationDto,
  ): Promise<{
    quoteId: string;
    quoteNumber: string;
    currentVersion: number;
    maxVersions: number | null;
    finalPrice: number;
    effectivePrice: number;
    discountAmount: number;
    subsidyAmount: number;
    calculation: CalculateQuoteResponseDto;
  }> {
    const calculation = await this.calculatorService.calculateQuote(organizationId, input);

    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + quoteConfig.defaultValidityDays);

    const lineItems = this.buildLineItemsFromCalculation(calculation);

    if (!input.customerId) {
      throw new BadRequestException('Customer ID is required to save a quote');
    }

    if (input.paymentMilestones && input.paymentMilestones.length > 0) {
      const totalPercent = input.paymentMilestones.reduce((sum, m) => sum + m.percentage, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new BadRequestException(
          `Payment milestone percentages must total 100% (currently ${totalPercent}%)`,
        );
      }
    }

    const discountAmount = input.discountAmount || 0;
    const discounted = applyPreGstDiscount(
      calculation.pricing.basePrice,
      discountAmount,
      quoteConfig.gstConfig,
    );
    const finalPrice = discounted.grossTotal;
    const effectivePrice = Math.max(0, finalPrice - calculation.subsidy.amount);

    const calculatorInputs: CalculatorInputs = {
      phaseType: input.phaseType,
      dcrPreference: input.dcrPreference ?? DcrPreference.AUTO_SPLIT,
      calculationMode: QuoteCalculationMode.AUTO,
      dcrSystemSizeKw: calculation.systemConfig.dcrSizeKw,
      nonDcrSystemSizeKw: calculation.systemConfig.nonDcrSizeKw,
      floorNumber: input.floorNumber ?? 0,
      distanceKm: input.distanceKm,
      structureType: input.structureType,
      preferredPanelBrand: input.preferredPanelBrand,
      preferredPanelTechnology: input.preferredPanelTechnology,
      preferredPanelWattage: input.preferredPanelWattage,
      preferredInverterBrand: input.preferredInverterBrand,
      preferredInverterCapacityKw: input.preferredInverterCapacityKw,
      subsidyApplicable: input.subsidyApplicable,
    };

    const pricingBreakdown: PricingBreakdown = {
      basePrice: calculation.pricing.basePrice,
      discountedBasePrice: discounted.discountedBase,
      gst5OnEquipment: discounted.gst5,
      gst18OnServices: discounted.gst18,
      totalGst: discounted.totalGst,
      totalPrice: discounted.grossTotal,
      discountAmount,
      subsidyAmount: calculation.subsidy.amount,
      isSubsidyApplicable: calculation.subsidy.isApplicable,
    };

    const configSnapshot: QuoteConfigSnapshot = {
      panels: calculation.panels.map((p) => ({
        productId: p.productId,
        name: p.name,
        brand: p.brand,
        pricePerWatt: p.pricePerWatt,
        isDcr: p.isDcr,
        technology: p.technology,
        gstRate: p.gstRate,
        wattage: p.wattagePerPanel,
      })),
      inverters: calculation.inverters.inverters.map((inv) => ({
        productId: inv.productId,
        name: inv.name,
        brand: inv.brand,
        capacityKw: inv.capacityKw,
        unitPrice: inv.unitPrice,
        gstRate: inv.gstRate,
      })),
      structure: {
        productId: calculation.structure.productId,
        name: calculation.structure.name,
        pricePerKw: calculation.structure.unitPrice,
        gstRate: calculation.structure.gstRate,
        structureType: calculation.structure.structureType,
      },
      installationPricing:
        calculation.installation as unknown as QuoteConfigSnapshot['installationPricing'],
      subsidyConfig: null,
      quoteConfig: quoteConfig as QuoteConfigSnapshot['quoteConfig'],
      snapshotAt: new Date().toISOString(),
    };

    // ── Determine if this is a revision or a new quote ──
    // If quoteId is explicitly provided, verify it still has version capacity.
    // If maxed out, throw MAX_VERSIONS_REACHED so the user can choose to archive.
    let existingQuoteId: string | null = null;

    if (input.quoteId) {
      const explicit = await this.quoteRepository.findById(input.quoteId, organizationId);
      const hasCapacity =
        !quoteConfig.maxVersions || explicit.currentVersion < quoteConfig.maxVersions;
      if (!hasCapacity) {
        const allRevisable = await this.quoteRepository.findAllRevisableQuotes(
          organizationId,
          input.customerId,
          input.propertyId,
        );
        throw new ConflictException({
          error: 'MAX_VERSIONS_REACHED',
          message: `The revision limit (${quoteConfig.maxVersions}) has been reached. Archive a quote to create a new one.`,
          maxVersions: quoteConfig.maxVersions,
          quotes: allRevisable.map((q) => ({
            quoteId: q.id,
            quoteNumber: q.quoteNumber,
            currentVersion: q.currentVersion,
            status: q.status,
            createdAt: q.createdAt,
            updatedAt: q.updatedAt,
          })),
        });
      }
      existingQuoteId = explicit.id;
    }

    if (!existingQuoteId) {
      existingQuoteId =
        (
          await this.quoteRepository.findRevisableQuote(
            organizationId,
            input.customerId,
            input.propertyId,
            quoteConfig.maxVersions,
          )
        )?.id ?? null;
    }

    if (existingQuoteId) {
      try {
        const updateDto: UpdateQuoteDto = {
          salesPersonId: input.salesPersonId,
          resellerId: input.resellerId,
          validUntil: validUntil.toISOString().split('T')[0],
          systemType: SystemType.ON_GRID,
          systemSizeKw: calculation.systemConfig.totalSystemSizeKw,
          totalWattageWp: calculation.actualTotalWattage,
          projectType: input.projectType,
          calculatorInputs,
          pricingBreakdown,
          internalNotes: input.internalNotes,
          customerNotes: input.customerNotes,
          projectCompletionWeeks: calculation.completionWeeks,
          paymentMilestones: input.paymentMilestones,
          lineItems,
          changeSummary: 'Revised via calculator',
        };

        const quote = await this.quoteService.update(
          existingQuoteId,
          organizationId,
          updateDto,
          currentUser.id,
        );

        return {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          currentVersion: quote.currentVersion,
          maxVersions: quoteConfig.maxVersions ?? null,
          finalPrice,
          effectivePrice,
          discountAmount,
          subsidyAmount: calculation.subsidy.amount,
          calculation,
        };
      } catch (err) {
        if (
          err instanceof BadRequestException &&
          String(err.message).includes('Maximum number of versions')
        ) {
          // Only happens when input.quoteId was explicitly provided for a maxed quote
          const allRevisable = await this.quoteRepository.findAllRevisableQuotes(
            organizationId,
            input.customerId,
            input.propertyId,
          );
          throw new ConflictException({
            error: 'MAX_VERSIONS_REACHED',
            message: `The revision limit (${quoteConfig.maxVersions}) has been reached. Archive a quote to create a new one.`,
            maxVersions: quoteConfig.maxVersions ?? null,
            quotes: allRevisable.map((q) => ({
              quoteId: q.id,
              quoteNumber: q.quoteNumber,
              currentVersion: q.currentVersion,
              status: q.status,
              createdAt: q.createdAt,
              updatedAt: q.updatedAt,
            })),
          });
        }
        throw err;
      }
    }

    // ── Create brand-new quote (version 1) ──
    const createDto: CreateQuoteDto = {
      customerId: input.customerId,
      propertyId: input.propertyId,
      salesPersonId: input.salesPersonId,
      resellerId: input.resellerId,
      systemType: SystemType.ON_GRID,
      systemSizeKw: calculation.systemConfig.totalSystemSizeKw,
      totalWattageWp: calculation.actualTotalWattage,
      projectType: input.projectType,
      validUntil: validUntil.toISOString().split('T')[0] as string,
      calculatorInputs,
      pricingBreakdown,
      configSnapshot,
      finalPrice,
      effectivePrice,
      discountAmount,
      internalNotes: input.internalNotes,
      customerNotes: input.customerNotes,
      projectCompletionWeeks: calculation.completionWeeks,
      paymentMilestones: input.paymentMilestones,
      lineItems,
    };

    const quote = await this.quoteService.create(organizationId, createDto, currentUser.id);

    return {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      currentVersion: quote.currentVersion,
      maxVersions: quoteConfig.maxVersions ?? null,
      finalPrice,
      effectivePrice,
      discountAmount,
      subsidyAmount: calculation.subsidy.amount,
      calculation,
    };
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
    const config = await this.quoteConfigRepo.getOrCreateDefault(organizationId);
    return plainToInstance(QuoteConfigurationResponseDto, config, {
      excludeExtraneousValues: true,
    });
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
    const config = await this.subsidyConfigRepo.findActiveByProjectType(
      organizationId,
      projectType,
    );
    if (!config) return null;
    return plainToInstance(SubsidyConfigurationResponseDto, config, {
      excludeExtraneousValues: true,
    });
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
    const configs = await this.subsidyConfigRepo.findAll(organizationId);
    return plainToInstance(SubsidyConfigurationResponseDto, configs, {
      excludeExtraneousValues: true,
    });
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
    const pricing = await this.installationPricingRepo.findBySystemSize(
      organizationId,
      systemSizeKw,
      projectType,
    );
    if (!pricing) return null;
    return plainToInstance(InstallationPricingResponseDto, pricing, {
      excludeExtraneousValues: true,
    });
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
    const pricingList = await this.installationPricingRepo.findAll(organizationId);
    return plainToInstance(InstallationPricingResponseDto, pricingList, {
      excludeExtraneousValues: true,
    });
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
        taxRate: panel.gstRate,
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
        taxRate: inverter.gstRate,
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
      taxRate: calculation.structure.gstRate,
      displayOrder: displayOrder++,
    });

    // Add installation line item (as a service)
    lineItems.push({
      itemCategory: ItemCategory.INSTALLATION,
      itemName: 'Installation & Services',
      itemDescription: 'Electrical work, MSEDCL charges, transport, supervision',
      quantity: 1,
      unitPrice: calculation.installation.totalBeforeTax,
      taxRate: calculation.installation.gstRate,
      displayOrder: displayOrder++,
    });

    return lineItems;
  }
}
