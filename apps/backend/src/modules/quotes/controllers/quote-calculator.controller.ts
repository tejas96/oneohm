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
  type CalculatorInputs,
  DcrPreference,
  type PricingBreakdown,
  ProjectType,
  QuoteCalculationMode,
  SystemType,
} from '@oneohm-epc/shared/types';
import { applyPreGstDiscount, GstSplitPercentagesInvalidError } from '@oneohm-epc/shared/utils';
import { plainToInstance } from 'class-transformer';

import { OrganizationContext } from '../../../common/decorators';
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
  InstallationPricingQueryDto,
} from '../dto';
import { QuoteRepository } from '../repositories';
import { QuoteCalculatorService } from '../services/quote-calculator.service';
import { QuoteService } from '../services/quote.service';

const REVISION_NOTE_CALCULATOR = 'Revised via calculator';

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
      - Panel quantity calculation
      - Inverter combination logic (e.g., 60KW → 50KW + 10KW)
      - Installation cost calculation with dynamic cost components
      - Multi-scheme tiered subsidy calculation
      - Configurable GST split
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
    let discounted: ReturnType<typeof applyPreGstDiscount>;
    try {
      discounted = applyPreGstDiscount(
        calculation.pricing.basePrice,
        discountAmount,
        quoteConfig.gstConfig,
      );
    } catch (err: unknown) {
      if (err instanceof GstSplitPercentagesInvalidError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
    const finalPrice = discounted.grossTotal;
    const effectivePrice = Math.max(0, finalPrice - calculation.subsidy.amount);

    const systemType = input.systemType ?? SystemType.ON_GRID;

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
      selectedSubsidyIds: input.selectedSubsidyIds,
      manualDcrPanelCount: input.manualDcrPanelCount,
      manualNonDcrPanelCount: input.manualNonDcrPanelCount,
      manualInverterCount: input.manualInverterCount,
      systemSizeKw: input.systemSizeKw,
      projectType: input.projectType,
      actualSystemSizeKw: calculation.actualTotalWattage / 1000,
      actualDcrSizeKw: calculation.systemConfig.dcrSizeKw,
      actualNonDcrSizeKw: calculation.systemConfig.nonDcrSizeKw,
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
          systemType,
          systemSizeKw: calculation.systemConfig.totalSystemSizeKw,
          totalWattageWp: calculation.actualTotalWattage,
          projectType: input.projectType,
          calculatorInputs,
          pricingBreakdown,
          finalPrice,
          effectivePrice,
          internalNotes: input.internalNotes,
          customerNotes: input.customerNotes,
          projectCompletionWeeks: calculation.completionWeeks,
          paymentMilestones: input.paymentMilestones,
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
      systemType,
      systemSizeKw: calculation.systemConfig.totalSystemSizeKw,
      totalWattageWp: calculation.actualTotalWattage,
      projectType: input.projectType,
      validUntil: validUntil.toISOString().split('T')[0] as string,
      calculatorInputs,
      pricingBreakdown,
      finalPrice,
      effectivePrice,
      discountAmount,
      internalNotes: input.internalNotes,
      customerNotes: input.customerNotes,
      projectCompletionWeeks: calculation.completionWeeks,
      paymentMilestones: input.paymentMilestones,
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
  ): Promise<SubsidyConfigurationResponseDto | null> {
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
  async getAllSubsidyRules(
    @OrganizationContext() organizationId: string,
  ): Promise<SubsidyConfigurationResponseDto[]> {
    const configs = await this.subsidyConfigRepo.findAll(organizationId, { isActive: true });
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
      Includes all cost components, transport rate, floor increment, and GST rate.
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Installation pricing',
  })
  async getInstallationPricing(
    @OrganizationContext() organizationId: string,
    @Query() query: InstallationPricingQueryDto,
  ): Promise<InstallationPricingResponseDto | null> {
    const pricing = await this.installationPricingRepo.findBySystemSize(
      organizationId,
      query.systemSizeKw,
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
  async getAllInstallationPricing(
    @OrganizationContext() organizationId: string,
  ): Promise<InstallationPricingResponseDto[]> {
    const result = await this.installationPricingRepo.findAll(organizationId, {
      isActive: true,
    });
    return plainToInstance(InstallationPricingResponseDto, result.data, {
      excludeExtraneousValues: true,
    });
  }
}
