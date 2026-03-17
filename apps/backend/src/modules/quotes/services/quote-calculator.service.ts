import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ProjectType,
  PhaseType,
  DcrPreference,
  StructureType,
  PanelTechnology,
  CalculatedPanelConfig,
  CalculatedInverterConfig,
  CalculatedInstallationCost,
  CalculatedSubsidy,
  QuoteConfigSnapshot,
  ValidationWarning,
} from '@oneohm-epc/shared/types';

import { InstallationPricing } from '../../master-data/entities/installation-pricing.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';
import { QuoteConfiguration } from '../../master-data/entities/quote-configuration.entity';
import { SubsidyConfiguration } from '../../master-data/entities/subsidy-configuration.entity';
import {
  ProductRepository,
  ProductPriceRepository,
  ProductTypeRepository,
  SubsidyConfigurationRepository,
  InstallationPricingRepository,
  QuoteConfigurationRepository,
} from '../../master-data/repositories';
import {
  CalculateQuoteDto,
  CalculateQuoteResponseDto,
  PanelOverrideDto,
  InverterOverrideDto,
} from '../dto/calculator';

/**
 * Quote Calculator Service v2
 *
 * Handles all quote calculation business logic including:
 * - Panel selection and quantity calculation (with override support)
 * - Inverter selection and combination logic (with override support)
 * - DCR/Non-DCR split for subsidy
 * - Installation cost calculation (with per-structure-type costs)
 * - Subsidy calculation with tiered rates and max amount cap
 * - GST calculation (configurable split)
 * - Validation and warnings
 *
 * Key Features:
 * - Project type aware pricing
 * - Override support for panels and inverters
 * - Structure cost from installation pricing (direct lookup by structure type)
 * - Comprehensive validation with warnings
 * - Edge case handling
 */
@Injectable()
export class QuoteCalculatorService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly productPriceRepo: ProductPriceRepository,
    private readonly productTypeRepo: ProductTypeRepository,
    private readonly subsidyConfigRepo: SubsidyConfigurationRepository,
    private readonly installationPricingRepo: InstallationPricingRepository,
    private readonly quoteConfigRepo: QuoteConfigurationRepository,
  ) {}

  /**
   * Main quote calculation method
   * Takes input from sales person and returns complete calculated quote
   */
  async calculateQuote(
    organizationId: string,
    input: CalculateQuoteDto,
  ): Promise<CalculateQuoteResponseDto> {
    const warnings: ValidationWarning[] = [];

    // 0. Validate input for conflicting override types
    this.validateOverrideConflicts(input);
    this.validateDcrPreferenceManualCounts(input);

    // 1. Get organization's quote configuration
    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);

    // 2. Get installation pricing for system size (needed early for structure costs)
    const installationPricing = await this.installationPricingRepo.findBySystemSize(
      organizationId,
      input.systemSizeKw,
      input.projectType,
    );

    if (!installationPricing) {
      throw new BadRequestException(
        `Installation pricing not configured for ${input.systemSizeKw}KW ${input.projectType} systems. Please contact administrator.`,
      );
    }
    this.validateInstallationPricing(installationPricing);

    // 3. Determine DCR/Non-DCR split based on subsidy eligibility
    const { dcrSizeKw, nonDcrSizeKw } = await this.calculateSystemSplit(
      organizationId,
      input.systemSizeKw,
      input.projectType,
      input.subsidyApplicable,
      input.dcrPreference || DcrPreference.AUTO_SPLIT,
    );

    // 4. Calculate panel configuration
    // Supports: auto-calculation, panelOverrides (specific products), or manual counts (quantity constraint)
    let panels: CalculatedPanelConfig[];
    let actualDcrSizeKw = dcrSizeKw;
    let actualNonDcrSizeKw = nonDcrSizeKw;

    if (input.manualDcrPanelCount !== undefined || input.manualNonDcrPanelCount !== undefined) {
      // Use quantity-constrained calculation
      const panelResult = await this.calculatePanelsWithQuantityConstraint(
        organizationId,
        input.dcrPreference || DcrPreference.AUTO_SPLIT,
        input.manualDcrPanelCount,
        input.manualNonDcrPanelCount,
        dcrSizeKw,
        nonDcrSizeKw,
        input.preferredPanelBrand,
        input.preferredPanelTechnology,
        input.projectType,
        quoteConfig,
        warnings,
        input.subsidyApplicable,
      );

      // Check if error was returned
      if ('error' in panelResult) {
        throw new BadRequestException({
          message: panelResult.error,
          errorCode: panelResult.errorCode,
          suggestion: panelResult.suggestion,
        });
      }

      panels = panelResult.panels;
      actualDcrSizeKw = panelResult.actualDcrSizeKw;
      actualNonDcrSizeKw = panelResult.actualNonDcrSizeKw;
    } else {
      // Use standard calculation (auto or with overrides)
      panels = await this.calculatePanels(
        organizationId,
        dcrSizeKw,
        nonDcrSizeKw,
        input.preferredPanelBrand,
        input.preferredPanelTechnology,
        input.preferredPanelWattage,
        input.projectType,
        quoteConfig,
        input.panelOverrides,
        warnings,
      );

      // Calculate actual DCR/Non-DCR sizes from panels
      const dcrPanel = panels.find((p) => p.isDcr);
      const nonDcrPanel = panels.find((p) => !p.isDcr);
      actualDcrSizeKw = dcrPanel ? dcrPanel.totalWattage / 1000 : 0;
      actualNonDcrSizeKw = nonDcrPanel ? nonDcrPanel.totalWattage / 1000 : 0;
    }

    // Calculate actual wattage from panels
    const actualTotalWattage = panels.reduce((sum, p) => sum + p.totalWattage, 0);
    const actualSystemSizeKw = actualTotalWattage / 1000;

    // 5. Calculate inverter configuration
    // Supports: auto-calculation, inverterOverrides (specific products), or manual count (quantity constraint)
    let inverters: CalculatedInverterConfig;

    if (input.manualInverterCount !== undefined) {
      // Use quantity-constrained calculation
      const inverterResult = await this.calculateInvertersWithQuantityConstraint(
        organizationId,
        input.systemSizeKw,
        input.phaseType,
        input.manualInverterCount,
        input.preferredInverterBrand,
        input.projectType,
        warnings,
      );

      // Check if error was returned
      if ('error' in inverterResult) {
        throw new BadRequestException({
          message: inverterResult.error,
          errorCode: inverterResult.errorCode,
          suggestion: inverterResult.suggestion,
        });
      }

      inverters = inverterResult;
    } else {
      // Use standard calculation (auto or with overrides)
      inverters = await this.calculateInverters(
        organizationId,
        input.systemSizeKw,
        input.phaseType,
        input.preferredInverterBrand,
        input.projectType,
        input.inverterOverrides,
        warnings,
        input.preferredInverterCapacityKw,
      );
    }

    // 6. Calculate structure cost (from pricing rules with basePrice × multiplier × systemSizeKw)
    const structure = await this.calculateStructure(
      organizationId,
      input.systemSizeKw,
      input.structureType,
      input.projectType,
    );

    // 7. Calculate installation costs
    const installation = this.calculateInstallationCosts(
      installationPricing,
      input.structureType,
      input.floorNumber || 0,
      input.distanceKm || 0,
    );

    // 8. Calculate subsidy using ACTUAL DCR size (important for manual count scenarios)
    // This ensures subsidy is calculated correctly when user changes panel counts
    const subsidy = await this.calculateSubsidy(
      organizationId,
      actualDcrSizeKw, // Use actual, not requested
      input.projectType,
      input.subsidyApplicable,
      input.dcrPreference,
    );

    // 9. Resolve margin percentage before pricing so it can be applied pre-tax
    const profitabilityPercent = Number(
      installationPricing.costComponents?.profitability_percent || 0,
    );

    // 10. Calculate pricing summary – margin is applied to raw base BEFORE GST
    //     so that tax is computed on the full pre-tax value (components + margin)
    const { profitabilityAmount, ...pricing } = this.calculatePricing(
      panels,
      inverters,
      structure,
      installation,
      quoteConfig,
      profitabilityPercent,
    );

    // 11. Calculate effective price (final price with margin already included, minus subsidy)
    const effectivePrice = pricing.finalPrice - subsidy.amount;

    // Determine if any overrides or manual counts were used
    const hasOverrides = !!(
      input.panelOverrides?.length ||
      input.inverterOverrides?.length ||
      input.manualDcrPanelCount !== undefined ||
      input.manualNonDcrPanelCount !== undefined ||
      input.manualInverterCount !== undefined
    );

    return {
      systemConfig: {
        totalSystemSizeKw: input.systemSizeKw,
        dcrSizeKw,
        nonDcrSizeKw,
        phaseType: input.phaseType,
      },
      panels,
      inverters,
      structure,
      installation,
      pricing,
      subsidy,
      effectivePrice,
      completionWeeks: quoteConfig.defaultCompletionWeeks,
      warnings: warnings.length > 0 ? warnings : undefined,
      hasOverrides,
      actualTotalWattage,
      actualSystemSizeKw,
      actualDcrSizeKw,
      actualNonDcrSizeKw,
      profitabilityPercent,
      profitabilityAmount,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create configuration snapshot for audit trail
   */
  async createConfigSnapshot(
    organizationId: string,
    panels: CalculatedPanelConfig[],
    inverters: CalculatedInverterConfig,
    structure: {
      productId: string;
      name: string;
      unitPrice: number;
      gstRate?: number;
      structureType?: string;
    },
    installation: CalculatedInstallationCost,
    installationPricing: InstallationPricing,
    subsidyConfig: SubsidyConfiguration | null,
    quoteConfig: QuoteConfiguration,
  ): Promise<QuoteConfigSnapshot> {
    return {
      panels: panels.map((p) => ({
        productId: p.productId,
        name: p.name,
        brand: p.brand,
        pricePerWatt: p.pricePerWatt,
        isDcr: p.isDcr,
        technology: p.technology,
        gstRate: p.gstRate,
        wattage: p.wattagePerPanel,
      })),
      inverters: inverters.inverters.map((inv) => ({
        productId: inv.productId,
        name: inv.name,
        brand: inv.brand,
        capacityKw: inv.capacityKw,
        unitPrice: inv.unitPrice,
        gstRate: inv.gstRate,
      })),
      structure: {
        productId: structure.productId,
        name: structure.name,
        pricePerKw: structure.unitPrice,
        gstRate: structure.gstRate,
        structureType: structure.structureType,
      },
      installationPricing: {
        minSystemSizeKw: Number(installationPricing.minSystemSizeKw),
        maxSystemSizeKw:
          installationPricing.maxSystemSizeKw != null
            ? Number(installationPricing.maxSystemSizeKw)
            : null,
        electricalWorkCost: installation.electricalWork,
        fixedMaterialCost: installation.fixedMaterial,
        variableFloorCost: installation.variableFloor,
        msedclCharges: installation.msedclCharges,
        supervisionCharges: installation.supervision,
        floorIncrementPercent: Number(installationPricing.floorIncrementPercent),
        transportCostPerKm: Number(installationPricing.transportRatePerKm),
        gstRate: installation.gstRate,
      },
      subsidyConfig: subsidyConfig
        ? {
            schemeName: subsidyConfig.schemeName,
            schemeType: subsidyConfig.schemeType,
            projectType: subsidyConfig.projectType,
            maxSubsidyKw: Number(subsidyConfig.maxSubsidyKw),
            requiresDcr: subsidyConfig.requiresDcr,
            autoSplitEnabled: subsidyConfig.autoSplitEnabled,
            tiers: subsidyConfig.tiers,
            isActive: subsidyConfig.isActive,
          }
        : null,
      quoteConfig: {
        defaultValidityDays: quoteConfig.defaultValidityDays,
        maxVersions: quoteConfig.maxVersions,
        defaultCompletionWeeks: quoteConfig.defaultCompletionWeeks,
        gstConfig: quoteConfig.gstConfig,
        wattageRounding: quoteConfig.wattageRounding,
        paymentMilestones: quoteConfig.paymentMilestones,
        showInventoryStock: quoteConfig.showInventoryStock,
      },
      snapshotAt: new Date().toISOString(),
    };
  }

  /**
   * Validate that override types don't conflict
   * panelOverrides and manual panel counts cannot be used together
   * inverterOverrides and manual inverter count cannot be used together
   */
  private validateOverrideConflicts(input: CalculateQuoteDto): void {
    // Check panel override conflicts
    if (
      input.panelOverrides?.length &&
      (input.manualDcrPanelCount !== undefined || input.manualNonDcrPanelCount !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot use both panelOverrides and manual panel counts. ' +
          'Use panelOverrides to specify exact products, or manual counts to let the system find optimal products.',
      );
    }

    // Check inverter override conflicts
    if (input.inverterOverrides?.length && input.manualInverterCount !== undefined) {
      throw new BadRequestException(
        'Cannot use both inverterOverrides and manual inverter count. ' +
          'Use inverterOverrides to specify exact products, or manual count to let the system find optimal combination.',
      );
    }
  }

  /**
   * Validate that manual panel counts match the DCR preference
   * - DCR_ONLY: Only manualDcrPanelCount is valid
   * - NON_DCR_ONLY: Only manualNonDcrPanelCount is valid
   * - AUTO_SPLIT: Both are valid
   */
  private validateDcrPreferenceManualCounts(input: CalculateQuoteDto): void {
    const dcrPreference = input.dcrPreference || DcrPreference.AUTO_SPLIT;

    if (dcrPreference === DcrPreference.DCR_ONLY && input.manualNonDcrPanelCount !== undefined) {
      throw new BadRequestException(
        'Cannot set Non-DCR panel count when DCR preference is DCR_ONLY. ' +
          'Remove manualNonDcrPanelCount or change dcrPreference.',
      );
    }

    if (dcrPreference === DcrPreference.NON_DCR_ONLY && input.manualDcrPanelCount !== undefined) {
      throw new BadRequestException(
        'Cannot set DCR panel count when DCR preference is NON_DCR_ONLY. ' +
          'Remove manualDcrPanelCount or change dcrPreference.',
      );
    }
  }

  /**
   * Calculate DCR/Non-DCR system split based on subsidy eligibility
   */
  private async calculateSystemSplit(
    organizationId: string,
    systemSizeKw: number,
    projectType: ProjectType,
    subsidyApplicable: boolean,
    dcrPreference: DcrPreference,
  ): Promise<{ dcrSizeKw: number; nonDcrSizeKw: number }> {
    // If customer explicitly wants only DCR
    if (dcrPreference === DcrPreference.DCR_ONLY) {
      return { dcrSizeKw: systemSizeKw, nonDcrSizeKw: 0 };
    }

    // If customer explicitly wants only Non-DCR - skip subsidy entirely
    if (dcrPreference === DcrPreference.NON_DCR_ONLY) {
      return { dcrSizeKw: 0, nonDcrSizeKw: systemSizeKw };
    }

    // If no subsidy, default to non-DCR (usually cheaper)
    if (!subsidyApplicable) {
      return { dcrSizeKw: 0, nonDcrSizeKw: systemSizeKw };
    }

    // Get subsidy configuration to determine max eligible kW
    const subsidyConfig = await this.subsidyConfigRepo.findActiveByProjectType(
      organizationId,
      projectType,
    );

    if (!subsidyConfig?.autoSplitEnabled) {
      // No auto-split, use all DCR if subsidy applicable
      return { dcrSizeKw: systemSizeKw, nonDcrSizeKw: 0 };
    }

    // Auto-split: DCR up to max subsidy, rest Non-DCR
    const maxSubsidyKw = Number(subsidyConfig.maxSubsidyKw);
    if (systemSizeKw <= maxSubsidyKw) {
      return { dcrSizeKw: systemSizeKw, nonDcrSizeKw: 0 };
    }

    return {
      dcrSizeKw: maxSubsidyKw,
      nonDcrSizeKw: systemSizeKw - maxSubsidyKw,
    };
  }

  /**
   * Calculate panels needed for DCR and Non-DCR portions
   * Supports user overrides for custom panel selection
   */
  private async calculatePanels(
    organizationId: string,
    dcrSizeKw: number,
    nonDcrSizeKw: number,
    preferredBrand: string | undefined,
    preferredTechnology: string | undefined,
    preferredWattage: number | undefined,
    projectType: ProjectType,
    quoteConfig: QuoteConfiguration,
    overrides: PanelOverrideDto[] | undefined,
    warnings: ValidationWarning[],
  ): Promise<CalculatedPanelConfig[]> {
    // If overrides provided, validate and use them
    if (overrides && overrides.length > 0) {
      return this.calculatePanelsWithOverrides(organizationId, projectType, overrides, warnings);
    }

    // Auto-calculate panels
    const panels: CalculatedPanelConfig[] = [];

    // Calculate DCR panels if needed
    if (dcrSizeKw > 0) {
      const dcrPanel = await this.findPanel(
        organizationId,
        true,
        preferredBrand,
        preferredTechnology,
        preferredWattage,
      );
      if (!dcrPanel) {
        throw new BadRequestException(
          `No DCR panel found${preferredBrand ? ` for brand ${preferredBrand}` : ''}${preferredTechnology ? ` with ${preferredTechnology} technology` : ''}. Please try different options or contact administrator.`,
        );
      }
      const dcrConfig = await this.calculatePanelQuantity(
        dcrPanel,
        dcrSizeKw,
        organizationId,
        projectType,
        quoteConfig,
      );
      panels.push(dcrConfig);
    }

    // Calculate Non-DCR panels if needed
    if (nonDcrSizeKw > 0) {
      const nonDcrPanel = await this.findPanel(
        organizationId,
        false,
        preferredBrand,
        preferredTechnology,
        preferredWattage,
      );
      if (!nonDcrPanel) {
        throw new BadRequestException(
          `No Non-DCR panel found${preferredBrand ? ` for brand ${preferredBrand}` : ''}${preferredTechnology ? ` with ${preferredTechnology} technology` : ''}. Please try different options or contact administrator.`,
        );
      }
      const nonDcrConfig = await this.calculatePanelQuantity(
        nonDcrPanel,
        nonDcrSizeKw,
        organizationId,
        projectType,
        quoteConfig,
      );
      panels.push(nonDcrConfig);
    }

    return panels;
  }

  /**
   * Calculate panels with user-provided overrides
   */
  private async calculatePanelsWithOverrides(
    organizationId: string,
    projectType: ProjectType,
    overrides: PanelOverrideDto[],
    _warnings: ValidationWarning[],
  ): Promise<CalculatedPanelConfig[]> {
    const panels: CalculatedPanelConfig[] = [];
    const brands = new Set<string>();

    // Batch query for all product prices to avoid N+1 queries
    const productIds = overrides.map((o) => o.productId);
    const productPricesMap = await this.productPriceRepo.findActiveForProducts(
      organizationId,
      productIds,
      projectType,
    );

    for (const override of overrides) {
      const panel = await this.productRepo.findById(override.productId, organizationId);
      if (!panel) {
        throw new BadRequestException(`Panel product ${override.productId} not found`);
      }

      const specs = panel.specifications;
      if (!specs) {
        throw new BadRequestException(`Panel ${panel.name} has invalid specifications`);
      }

      // Track brands for validation
      if (panel.brand?.name) {
        brands.add(panel.brand.name.toLowerCase());
      }

      // Get pricing from batch-fetched data
      const productPrice = productPricesMap.get(panel.id);
      const { pricePerWatt, gstRate } = this.validatePanelPricing(productPrice, panel.name);

      const wattage =
        Number(specs.wattage || 0) ||
        (Number(specs.min_wattage || 0) + Number(specs.max_wattage || 0)) / 2;
      const totalWattage = override.quantity * wattage;
      const lineTotal = totalWattage * pricePerWatt;
      const gstAmount = (lineTotal * gstRate) / 100;

      panels.push({
        productId: panel.id,
        name: panel.name,
        brand: panel.brand?.name || 'Unknown',
        isDcr: specs.is_dcr === true || specs.is_dcr === 'true',
        technology: specs.technology as PanelTechnology | undefined,
        wattagePerPanel: wattage,
        quantity: override.quantity,
        totalWattage,
        pricePerWatt,
        lineTotal,
        gstAmount,
        gstRate,
        productWarrantyYears: panel.productWarrantyYears,
        performanceWarrantyYears: panel.performanceWarrantyYears,
      });
    }

    // Validate no brand mixing
    if (brands.size > 1) {
      throw new BadRequestException(
        `Brand mixing not allowed. Found brands: ${Array.from(brands).join(', ')}. Please select panels from the same brand.`,
      );
    }

    return panels;
  }

  /**
   * Calculate panels with quantity constraints
   *
   * User specifies exactly how many panels they want (DCR and/or Non-DCR).
   * Backend finds suitable panel wattage so that: count * wattage >= required capacity.
   * System size MUST be met or exceeded (never below).
   *
   * @returns Object with panels and actual capacities, or error with suggestions
   */
  private async calculatePanelsWithQuantityConstraint(
    organizationId: string,
    dcrPreference: DcrPreference,
    targetDcrCount: number | undefined,
    targetNonDcrCount: number | undefined,
    originalDcrSizeKw: number,
    originalNonDcrSizeKw: number,
    preferredBrand: string | undefined,
    preferredTechnology: string | undefined,
    projectType: ProjectType,
    quoteConfig: QuoteConfiguration,
    warnings: ValidationWarning[],
    subsidyApplicable: boolean,
  ): Promise<
    | {
        panels: CalculatedPanelConfig[];
        actualDcrSizeKw: number;
        actualNonDcrSizeKw: number;
      }
    | { error: string; errorCode: string; suggestion: { dcr?: number; nonDcr?: number } }
  > {
    const panels: CalculatedPanelConfig[] = [];
    let actualDcrSizeKw = 0;
    let actualNonDcrSizeKw = 0;

    // Compute DCR floor: min(maxSubsidyKw, originalDcrSizeKw) when subsidy applies
    let minDcrCapacityKw = 0;
    if (subsidyApplicable && originalDcrSizeKw > 0) {
      const subsidyConfig = await this.subsidyConfigRepo.findActiveByProjectType(
        organizationId,
        projectType,
      );
      if (subsidyConfig) {
        const maxSubsidyKw = Number(subsidyConfig.maxSubsidyKw);
        minDcrCapacityKw = Math.min(maxSubsidyKw, originalDcrSizeKw);
      }
    }

    // Handle DCR panels
    if (originalDcrSizeKw > 0 && targetDcrCount !== undefined) {
      const dcrResult = await this.findPanelForCount(
        organizationId,
        true,
        targetDcrCount,
        originalDcrSizeKw,
        minDcrCapacityKw,
        preferredBrand,
        preferredTechnology,
        projectType,
        quoteConfig,
        warnings,
      );

      if ('error' in dcrResult) {
        return {
          error: dcrResult.error,
          errorCode: 'INVALID_DCR_PANEL_QUANTITY',
          suggestion: { dcr: dcrResult.suggestion },
        };
      }

      panels.push(dcrResult.panel);
      actualDcrSizeKw = dcrResult.actualSizeKw;
    } else if (originalDcrSizeKw > 0) {
      // No manual count specified, use auto-calculation
      const dcrPanel = await this.findPanel(
        organizationId,
        true,
        preferredBrand,
        preferredTechnology,
      );
      if (!dcrPanel) {
        throw new BadRequestException(
          `No DCR panel found${preferredBrand ? ` for brand ${preferredBrand}` : ''}. Please try different options.`,
        );
      }
      const dcrConfig = await this.calculatePanelQuantity(
        dcrPanel,
        originalDcrSizeKw,
        organizationId,
        projectType,
        quoteConfig,
      );
      panels.push(dcrConfig);
      actualDcrSizeKw = dcrConfig.totalWattage / 1000;
    }

    // Handle Non-DCR panels (floor is always 0 — no subsidy constraint)
    if (originalNonDcrSizeKw > 0 && targetNonDcrCount !== undefined) {
      const nonDcrResult = await this.findPanelForCount(
        organizationId,
        false,
        targetNonDcrCount,
        originalNonDcrSizeKw,
        0,
        preferredBrand,
        preferredTechnology,
        projectType,
        quoteConfig,
        warnings,
      );

      if ('error' in nonDcrResult) {
        return {
          error: nonDcrResult.error,
          errorCode: 'INVALID_NON_DCR_PANEL_QUANTITY',
          suggestion: { nonDcr: nonDcrResult.suggestion },
        };
      }

      panels.push(nonDcrResult.panel);
      actualNonDcrSizeKw = nonDcrResult.actualSizeKw;
    } else if (originalNonDcrSizeKw > 0) {
      // No manual count specified, use auto-calculation
      const nonDcrPanel = await this.findPanel(
        organizationId,
        false,
        preferredBrand,
        preferredTechnology,
      );
      if (!nonDcrPanel) {
        throw new BadRequestException(
          `No Non-DCR panel found${preferredBrand ? ` for brand ${preferredBrand}` : ''}. Please try different options.`,
        );
      }
      const nonDcrConfig = await this.calculatePanelQuantity(
        nonDcrPanel,
        originalNonDcrSizeKw,
        organizationId,
        projectType,
        quoteConfig,
      );
      panels.push(nonDcrConfig);
      actualNonDcrSizeKw = nonDcrConfig.totalWattage / 1000;
    }

    return { panels, actualDcrSizeKw, actualNonDcrSizeKw };
  }

  /**
   * Find suitable panel for a specific count that meets capacity requirement
   *
   * The logic:
   * 1. Calculate required wattage per panel: requiredKw * 1000 / targetCount
   * 2. Find panels with wattage >= required wattage per panel
   * 3. Pick the one with minimum overage (smallest wattage that still works)
   * 4. If no panel can meet the requirement:
   *    a. If capacity < minCapacityKw (subsidy floor) -> hard error with suggestion
   *    b. If capacity >= minCapacityKw -> allow undersized with warning
   */
  private async findPanelForCount(
    organizationId: string,
    isDcr: boolean,
    targetCount: number,
    requiredSizeKw: number,
    minCapacityKw: number,
    preferredBrand: string | undefined,
    preferredTechnology: string | undefined,
    projectType: ProjectType,
    quoteConfig: QuoteConfiguration,
    warnings: ValidationWarning[],
  ): Promise<
    { panel: CalculatedPanelConfig; actualSizeKw: number } | { error: string; suggestion: number }
  > {
    // Calculate required wattage per panel to meet capacity with target count
    // Math.ceil ensures we find panels that can actually meet the capacity requirement
    const requiredWattagePerPanel = Math.ceil((requiredSizeKw * 1000) / targetCount);

    // Find all panels with wattage >= required
    const productTypeId = await this.getProductTypeId(organizationId, 'solar_panel');
    const suitablePanels = await this.productRepo.findAllSolarPanels(
      organizationId,
      isDcr,
      productTypeId,
      preferredBrand,
      preferredTechnology,
      requiredWattagePerPanel, // minWattage filter
    );

    if (suitablePanels.length === 0) {
      const bestPanel = await this.productRepo.findSolarPanel(
        organizationId,
        isDcr,
        productTypeId,
        preferredBrand,
        preferredTechnology,
      );

      if (!bestPanel) {
        throw new BadRequestException(
          `No ${isDcr ? 'DCR' : 'Non-DCR'} panel found${preferredBrand ? ` for brand ${preferredBrand}` : ''}. Please try different options.`,
        );
      }

      const specs = bestPanel.specifications as Record<string, unknown> | undefined;
      const bestWattage =
        Number(specs?.wattage || 0) ||
        (Number(specs?.min_wattage || 0) + Number(specs?.max_wattage || 0)) / 2;
      const roundedWattage = this.roundWattage(bestWattage, quoteConfig.wattageRounding);
      const actualCapacityKw = (targetCount * roundedWattage) / 1000;

      if (minCapacityKw > 0 && actualCapacityKw < minCapacityKw) {
        const suggestedCount = Math.ceil((minCapacityKw * 1000) / roundedWattage);
        return {
          error:
            `Cannot reduce ${isDcr ? 'DCR' : 'Non-DCR'} panels below subsidy limit. ` +
            `${targetCount} panels at ${roundedWattage}W would provide ${actualCapacityKw.toFixed(2)}kW, ` +
            `but minimum ${minCapacityKw}kW is required for subsidy eligibility. ` +
            `Minimum ${suggestedCount} panels needed.`,
          suggestion: suggestedCount,
        };
      }

      if (!specs) {
        throw new BadRequestException(`Panel ${bestPanel.name} missing specifications`);
      }

      const productPrice = await this.getProductPrice(organizationId, bestPanel.id, projectType);
      const { pricePerWatt, gstRate } = this.validatePanelPricing(productPrice, bestPanel.name);
      const totalWattage = targetCount * roundedWattage;
      const lineTotal = totalWattage * pricePerWatt;
      const gstAmount = (lineTotal * gstRate) / 100;

      warnings.push({
        code: 'PANEL_CAPACITY_UNDERSIZED',
        message:
          `${isDcr ? 'DCR' : 'Non-DCR'} panel capacity (${actualCapacityKw.toFixed(2)}kW) is less than ` +
          `the required ${requiredSizeKw}kW. The system will be undersized.`,
        severity: 'warning',
      });

      const panelConfig: CalculatedPanelConfig = {
        productId: bestPanel.id,
        name: bestPanel.name,
        brand: bestPanel.brand?.name || 'Unknown',
        isDcr: specs.is_dcr === true || specs.is_dcr === 'true',
        technology: specs.technology as PanelTechnology | undefined,
        wattagePerPanel: roundedWattage,
        quantity: targetCount,
        totalWattage,
        pricePerWatt,
        lineTotal,
        gstAmount,
        gstRate,
        productWarrantyYears: bestPanel.productWarrantyYears,
        performanceWarrantyYears: bestPanel.performanceWarrantyYears,
      };

      return { panel: panelConfig, actualSizeKw: actualCapacityKw };
    }

    // Pick panel with minimum wattage (least overage) - sorted ascending by findAllSolarPanels
    const selectedPanel = suitablePanels[0]!;
    const specs = selectedPanel.specifications;

    if (!specs) {
      throw new BadRequestException(`Panel ${selectedPanel.name} missing specifications`);
    }

    const nominalWattage =
      Number(specs.wattage ?? 0) ||
      (Number(specs.min_wattage ?? 0) + Number(specs.max_wattage ?? 0)) / 2;
    const roundedWattage = this.roundWattage(nominalWattage, quoteConfig.wattageRounding);
    const totalWattage = targetCount * roundedWattage;
    const actualSizeKw = totalWattage / 1000;

    // Get pricing
    const productPrice = await this.getProductPrice(organizationId, selectedPanel.id, projectType);
    const { pricePerWatt, gstRate } = this.validatePanelPricing(productPrice, selectedPanel.name);

    const lineTotal = totalWattage * pricePerWatt;
    const gstAmount = (lineTotal * gstRate) / 100;

    // Add info warning if capacity significantly exceeds required
    if (actualSizeKw > requiredSizeKw * 1.25) {
      warnings.push({
        code: 'PANEL_CAPACITY_OVERSIZED',
        message: `${isDcr ? 'DCR' : 'Non-DCR'} panel capacity (${actualSizeKw.toFixed(2)}kW) is significantly more than required (${requiredSizeKw}kW) to meet the quantity constraint.`,
        severity: 'info',
      });
    }

    const panelConfig: CalculatedPanelConfig = {
      productId: selectedPanel.id,
      name: selectedPanel.name,
      brand: selectedPanel.brand?.name || 'Unknown',
      isDcr: specs.is_dcr === true || specs.is_dcr === 'true',
      technology: specs.technology as PanelTechnology | undefined,
      wattagePerPanel: roundedWattage,
      quantity: targetCount,
      totalWattage,
      pricePerWatt,
      lineTotal,
      gstAmount,
      gstRate,
      productWarrantyYears: selectedPanel.productWarrantyYears,
      performanceWarrantyYears: selectedPanel.performanceWarrantyYears,
    };

    return { panel: panelConfig, actualSizeKw };
  }

  /**
   * Find suitable panel based on DCR requirement, brand, technology and wattage preference
   */
  private async findPanel(
    organizationId: string,
    isDcr: boolean,
    preferredBrand?: string,
    preferredTechnology?: string,
    preferredWattage?: number,
  ): Promise<ProductEntity | null> {
    const productTypeId = await this.getProductTypeId(organizationId, 'solar_panel');
    return this.productRepo.findSolarPanel(
      organizationId,
      isDcr,
      productTypeId,
      preferredBrand,
      preferredTechnology,
      preferredWattage,
    );
  }

  /**
   * Calculate number of panels needed and pricing
   */
  private async calculatePanelQuantity(
    panel: ProductEntity,
    requiredKw: number,
    organizationId: string,
    projectType: ProjectType,
    quoteConfig: QuoteConfiguration,
  ): Promise<CalculatedPanelConfig> {
    const specs = panel.specifications;
    if (!specs) {
      throw new BadRequestException(`Panel ${panel.name} missing specifications`);
    }

    // Validate panel specs exist
    if (!specs.wattage && (!specs.min_wattage || !specs.max_wattage)) {
      throw new BadRequestException(`Panel ${panel.name} missing wattage specifications`);
    }

    // Use nominal wattage if available, otherwise calculate from min/max
    const nominalWattage =
      Number(specs.wattage ?? 0) ||
      (Number(specs.min_wattage ?? 0) + Number(specs.max_wattage ?? 0)) / 2;
    const roundedWattage = this.roundWattage(nominalWattage, quoteConfig.wattageRounding);

    // Calculate number of panels needed
    const requiredWattage = requiredKw * 1000;
    const panelCount = Math.ceil(requiredWattage / roundedWattage);
    const totalWattage = panelCount * roundedWattage;

    // Get pricing with project type context
    const productPrice = await this.getProductPrice(organizationId, panel.id, projectType);
    const { pricePerWatt, gstRate } = this.validatePanelPricing(productPrice, panel.name);

    const lineTotal = totalWattage * pricePerWatt;
    const gstAmount = (lineTotal * gstRate) / 100;

    return {
      productId: panel.id,
      name: panel.name,
      brand: panel.brand?.name || 'Unknown',
      isDcr: specs.is_dcr === true || specs.is_dcr === 'true',
      technology: specs.technology as PanelTechnology | undefined,
      wattagePerPanel: roundedWattage,
      quantity: panelCount,
      totalWattage,
      pricePerWatt,
      lineTotal,
      gstAmount,
      gstRate,
      productWarrantyYears: panel.productWarrantyYears,
      performanceWarrantyYears: panel.performanceWarrantyYears,
    };
  }

  /**
   * Round wattage according to configuration
   */
  private roundWattage(
    wattage: number,
    config: { roundTo: number; roundUpThreshold: number },
  ): number {
    const { roundTo, roundUpThreshold } = config;
    const remainder = wattage % roundTo;

    if (remainder >= roundUpThreshold) {
      return wattage - remainder + roundTo;
    }
    return wattage - remainder;
  }

  /**
   * Calculate inverter configuration with combination logic
   * Supports user overrides for custom inverter selection
   *
   * OPTIMIZATION PRIORITY:
   * 1. Minimum COST (primary factor)
   * 2. Minimum inverter count (tie-breaker)
   * 3. Minimum capacity overage (secondary tie-breaker)
   */
  private async calculateInverters(
    organizationId: string,
    systemSizeKw: number,
    phaseType: PhaseType,
    preferredBrand: string | undefined,
    projectType: ProjectType,
    overrides: InverterOverrideDto[] | undefined,
    warnings: ValidationWarning[],
    preferredCapacityKw?: number,
  ): Promise<CalculatedInverterConfig> {
    // If overrides provided, validate and use them (capacity filter is NOT applied -- overrides specify exact products)
    if (overrides && overrides.length > 0) {
      return this.calculateInvertersWithOverrides(
        organizationId,
        systemSizeKw,
        projectType,
        overrides,
        warnings,
      );
    }

    // Auto-calculate inverters
    const availableInverters = await this.findInverters(
      organizationId,
      phaseType,
      preferredBrand,
      preferredCapacityKw,
    );

    if (availableInverters.length === 0) {
      throw new BadRequestException(
        `No ${phaseType} inverters found${preferredBrand ? ` for brand ${preferredBrand}` : ''}${preferredCapacityKw ? ` with ${preferredCapacityKw}kW capacity` : ''}. Please try different options or contact administrator.`,
      );
    }

    // Pre-fetch pricing for all available inverters
    const inverterPricing = new Map<string, { basePrice: number; gstRate: number }>();
    await Promise.all(
      availableInverters.map(async (inv) => {
        const productPrice = await this.getProductPrice(organizationId, inv.id, projectType);
        const validated = this.validateInverterPricing(productPrice, inv.name);
        inverterPricing.set(inv.id, validated);
      }),
    );

    // Find optimal combination based on COST
    const combination = this.findCostOptimalInverterCombination(
      availableInverters,
      systemSizeKw,
      inverterPricing,
    );

    // Build result with pricing
    const invertersWithPricing = combination.map(({ inverter, quantity }) => {
      const pricing = inverterPricing.get(inverter.id)!;
      const lineTotal = pricing.basePrice * quantity;
      const gstAmount = (lineTotal * pricing.gstRate) / 100;

      return {
        productId: inverter.id,
        name: inverter.name,
        brand: inverter.brand?.name || 'Unknown',
        capacityKw: Number(inverter.specifications?.capacity_kw || 0),
        quantity,
        unitPrice: pricing.basePrice,
        lineTotal,
        gstAmount,
        gstRate: pricing.gstRate,
        productWarrantyYears: inverter.productWarrantyYears,
      };
    });

    const totalCapacityKw = invertersWithPricing.reduce(
      (sum, inv) => sum + inv.capacityKw * inv.quantity,
      0,
    );
    const totalCost = invertersWithPricing.reduce((sum, inv) => sum + inv.lineTotal, 0);
    const totalGst = invertersWithPricing.reduce((sum, inv) => sum + inv.gstAmount, 0);

    return {
      inverters: invertersWithPricing,
      totalCapacityKw,
      totalCost,
      totalGst,
    };
  }

  /**
   * Calculate inverters with user-provided overrides
   */
  private async calculateInvertersWithOverrides(
    organizationId: string,
    systemSizeKw: number,
    projectType: ProjectType,
    overrides: InverterOverrideDto[],
    warnings: ValidationWarning[],
  ): Promise<CalculatedInverterConfig> {
    const invertersWithPricing: CalculatedInverterConfig['inverters'] = [];
    let totalCapacityKw = 0;

    // Batch query for all product prices to avoid N+1 queries
    const productIds = overrides.map((o) => o.productId);
    const productPricesMap = await this.productPriceRepo.findActiveForProducts(
      organizationId,
      productIds,
      projectType,
    );

    for (const override of overrides) {
      const inverter = await this.productRepo.findById(override.productId, organizationId);
      if (!inverter) {
        throw new BadRequestException(`Inverter product ${override.productId} not found`);
      }

      const specs = inverter.specifications;
      if (!specs) {
        throw new BadRequestException(`Inverter ${inverter.name} has invalid specifications`);
      }

      const capacityKw = Number(specs.capacity_kw || 0);
      totalCapacityKw += capacityKw * override.quantity;

      // Get pricing from batch-fetched data
      const productPrice = productPricesMap.get(inverter.id);
      const { basePrice, gstRate } = this.validateInverterPricing(productPrice, inverter.name);

      const lineTotal = basePrice * override.quantity;
      const gstAmount = (lineTotal * gstRate) / 100;

      invertersWithPricing.push({
        productId: inverter.id,
        name: inverter.name,
        brand: inverter.brand?.name || 'Unknown',
        capacityKw,
        quantity: override.quantity,
        unitPrice: basePrice,
        lineTotal,
        gstAmount,
        gstRate,
        productWarrantyYears: inverter.productWarrantyYears,
      });
    }

    // Validate total capacity
    if (totalCapacityKw < systemSizeKw) {
      warnings.push({
        code: 'INVERTER_CAPACITY_INSUFFICIENT',
        message: `Total inverter capacity (${totalCapacityKw}KW) is less than system size (${systemSizeKw}KW). This may affect system performance.`,
        severity: 'warning',
      });
    } else if (totalCapacityKw > systemSizeKw * 1.2) {
      warnings.push({
        code: 'INVERTER_CAPACITY_OVERSIZED',
        message: `Total inverter capacity (${totalCapacityKw}KW) is significantly more than system size (${systemSizeKw}KW). Consider reducing inverter capacity.`,
        severity: 'info',
      });
    }

    const totalCost = invertersWithPricing.reduce((sum, inv) => sum + inv.lineTotal, 0);
    const totalGst = invertersWithPricing.reduce((sum, inv) => sum + inv.gstAmount, 0);

    return {
      inverters: invertersWithPricing,
      totalCapacityKw,
      totalCost,
      totalGst,
    };
  }

  /**
   * Calculate inverters with a quantity constraint
   *
   * User specifies exactly how many inverter units they want.
   * Backend finds the optimal combination of inverters that:
   * 1. Uses exactly the target number of total units
   * 2. Meets or exceeds the required system size (must not go below)
   * 3. Minimizes capacity overage
   *
   * @param targetQuantity - Exact number of inverter units user wants
   * @returns Either a valid configuration or an error with suggested valid quantities
   */
  private async calculateInvertersWithQuantityConstraint(
    organizationId: string,
    systemSizeKw: number,
    phaseType: PhaseType,
    targetQuantity: number,
    preferredBrand: string | undefined,
    projectType: ProjectType,
    warnings: ValidationWarning[],
  ): Promise<
    CalculatedInverterConfig | { error: string; errorCode: string; suggestion: number[] }
  > {
    // Get available inverters — capacity filter is intentionally dropped so the
    // algorithm can search ALL sizes and find the combination with minimum overage
    // (mirrors how findPanelForCount already works for panels).
    const availableInverters = await this.findInverters(organizationId, phaseType, preferredBrand);

    if (availableInverters.length === 0) {
      throw new BadRequestException(
        `No ${phaseType} inverters found${preferredBrand ? ` for brand ${preferredBrand}` : ''}. Please try different options or contact administrator.`,
      );
    }

    // Pre-fetch pricing for all available inverters in a single batch query (N+1 optimization)
    const productIds = availableInverters.map((inv) => inv.id);
    const productPricesMap = await this.productPriceRepo.findActiveForProducts(
      organizationId,
      productIds,
      projectType,
    );

    const inverterPricing = new Map<string, { basePrice: number; gstRate: number }>();
    for (const inv of availableInverters) {
      const productPrice = productPricesMap.get(inv.id) ?? null;
      const validated = this.validateInverterPricing(productPrice, inv.name);
      inverterPricing.set(inv.id, validated);
    }

    // Find combination with exactly targetQuantity units that meets capacity requirement
    const combination = this.findCombinationWithQuantity(
      availableInverters,
      systemSizeKw,
      targetQuantity,
    );

    // If no valid combination found, suggest closest valid quantities
    if (!combination) {
      const validQuantities = this.findValidInverterQuantities(
        availableInverters,
        systemSizeKw,
        targetQuantity,
      );
      return {
        error:
          `Cannot form ${systemSizeKw}kW system with exactly ${targetQuantity} inverter(s). ` +
          `The available inverters cannot be combined to meet the required capacity with this quantity.`,
        errorCode: 'INVALID_INVERTER_QUANTITY',
        suggestion: validQuantities,
      };
    }

    // Build result with pricing
    const invertersWithPricing = combination.map(({ inverter, quantity }) => {
      const pricing = inverterPricing.get(inverter.id)!;
      const lineTotal = pricing.basePrice * quantity;
      const gstAmount = (lineTotal * pricing.gstRate) / 100;

      return {
        productId: inverter.id,
        name: inverter.name,
        brand: inverter.brand?.name || 'Unknown',
        capacityKw: Number(inverter.specifications?.capacity_kw || 0),
        quantity,
        unitPrice: pricing.basePrice,
        lineTotal,
        gstAmount,
        gstRate: pricing.gstRate,
        productWarrantyYears: inverter.productWarrantyYears,
      };
    });

    const totalCapacityKw = invertersWithPricing.reduce(
      (sum, inv) => sum + inv.capacityKw * inv.quantity,
      0,
    );
    const totalCost = invertersWithPricing.reduce((sum, inv) => sum + inv.lineTotal, 0);
    const totalGst = invertersWithPricing.reduce((sum, inv) => sum + inv.gstAmount, 0);

    // Add info warning if capacity significantly exceeds required
    if (totalCapacityKw > systemSizeKw * 1.2) {
      warnings.push({
        code: 'INVERTER_CAPACITY_OVERSIZED',
        message: `Total inverter capacity (${totalCapacityKw}kW) is significantly more than system size (${systemSizeKw}kW) to meet the quantity constraint.`,
        severity: 'info',
      });
    }

    return {
      inverters: invertersWithPricing,
      totalCapacityKw,
      totalCost,
      totalGst,
    };
  }

  /**
   * Find inverter combination with exactly targetCount units that meets capacity requirement
   *
   * Uses backtracking to find all valid combinations and picks the one with minimum overage.
   *
   * @param inverters - Available inverter products
   * @param requiredKw - Minimum capacity required
   * @param targetCount - Exact number of inverter units
   * @returns Best combination or null if not possible
   */
  private findCombinationWithQuantity(
    inverters: ProductEntity[],
    requiredKw: number,
    targetCount: number,
  ): Array<{ inverter: ProductEntity; quantity: number }> | null {
    type Combination = Array<{ inverter: ProductEntity; quantity: number }>;

    const getInverterCapacity = (inv: ProductEntity): number => {
      return Number(inv.specifications?.capacity_kw || 0);
    };

    // Sort by capacity descending for more efficient search
    const sortedInverters = [...inverters]
      .filter((inv) => getInverterCapacity(inv) > 0)
      .sort((a, b) => getInverterCapacity(b) - getInverterCapacity(a));

    if (sortedInverters.length === 0) return null;

    let bestCombination: Combination | null = null;
    let bestOverage = Infinity;

    // Safety limit to prevent runaway recursion in edge cases
    const MAX_ITERATIONS = 10000;
    let iterations = 0;

    // Recursive backtracking
    const backtrack = (
      index: number,
      currentCombo: Combination,
      currentCount: number,
      currentCapacity: number,
    ): void => {
      // Safety guard: stop if too many iterations
      if (++iterations > MAX_ITERATIONS) return;

      // Prune: already exceeded target count
      if (currentCount > targetCount) return;

      // Check if we've reached target count
      if (currentCount === targetCount) {
        if (currentCapacity >= requiredKw) {
          const overage = currentCapacity - requiredKw;
          if (overage < bestOverage) {
            bestOverage = overage;
            bestCombination = currentCombo.map((c) => ({ ...c }));
          }
        }
        return;
      }

      // Prune: can't possibly reach target count with remaining inverters
      const remainingCount = targetCount - currentCount;
      if (index >= sortedInverters.length) return;

      // For each inverter starting from current index
      for (let i = index; i < sortedInverters.length; i++) {
        const inv = sortedInverters[i];
        if (!inv) continue;
        const capacity = getInverterCapacity(inv);

        // Try different quantities of this inverter
        for (let qty = 1; qty <= remainingCount; qty++) {
          const newCapacity = currentCapacity + capacity * qty;
          const newCount = currentCount + qty;

          // Early termination: if we've reached target count and meet capacity
          if (newCount === targetCount && newCapacity >= requiredKw) {
            const overage = newCapacity - requiredKw;
            if (overage < bestOverage) {
              bestOverage = overage;
              bestCombination = [...currentCombo, { inverter: inv, quantity: qty }];
            }
            // Continue to find potentially better combinations
          }

          // Recurse with next inverter
          if (newCount < targetCount) {
            currentCombo.push({ inverter: inv, quantity: qty });
            backtrack(i + 1, currentCombo, newCount, newCapacity);
            currentCombo.pop();
          }
        }
      }
    };

    backtrack(0, [], 0, 0);
    return bestCombination;
  }

  /**
   * Find valid inverter quantities close to the target that can meet capacity requirement
   *
   * @returns Array of up to 3 valid quantities, sorted by closeness to target
   */
  private findValidInverterQuantities(
    inverters: ProductEntity[],
    requiredKw: number,
    targetCount: number,
  ): number[] {
    const validQuantities: number[] = [];
    const maxSearch = Math.max(10, targetCount + 5);

    // Search around the target quantity
    for (let qty = 1; qty <= maxSearch; qty++) {
      const combination = this.findCombinationWithQuantity(inverters, requiredKw, qty);
      if (combination) {
        validQuantities.push(qty);
      }
    }

    // Sort by closeness to target and return top 3
    return validQuantities
      .sort((a, b) => Math.abs(a - targetCount) - Math.abs(b - targetCount))
      .slice(0, 3);
  }

  /**
   * Find available inverters by phase type
   */
  private async findInverters(
    organizationId: string,
    phaseType: PhaseType,
    preferredBrand?: string,
    preferredCapacityKw?: number,
  ): Promise<ProductEntity[]> {
    const productTypeId = await this.getProductTypeId(organizationId, 'inverter');
    return this.productRepo.findInvertersByPhase(
      organizationId,
      phaseType,
      productTypeId,
      preferredBrand,
      preferredCapacityKw,
    );
  }

  /**
   * Find optimal inverter combination with minimal overage
   *
   * Algorithm:
   * 1. Try exact match first
   * 2. Find smallest single inverter >= required (single option)
   * 3. Find optimal combination using multiple inverters (combo option)
   * 4. Compare and pick the one with least overage
   *
   * Examples:
   * - 10KW 1-phase: 6KW + 4KW = 10KW (exact) or 5KW + 5KW = 10KW
   * - 13.5KW 3-phase: 15KW single (better than 12KW + 8KW = 20KW)
   * - 25KW 3-phase: 20KW + 8KW = 28KW or 33KW single (33KW better? no, 28KW better)
   */
  private findOptimalInverterCombination(
    inverters: ProductEntity[],
    requiredKw: number,
  ): Array<{ inverter: ProductEntity; quantity: number }> {
    // Sort by capacity ascending for easier processing
    const sortedAsc = [...inverters].sort((a, b) => {
      const capA = Number(a.specifications?.capacity_kw || 0);
      const capB = Number(b.specifications?.capacity_kw || 0);
      return capA - capB;
    });

    // Sort by capacity descending for greedy
    const sortedDesc = [...sortedAsc].reverse();

    // 1. Try to find exact match
    const exactMatch = sortedAsc.find(
      (inv) => Number(inv.specifications?.capacity_kw || 0) === requiredKw,
    );
    if (exactMatch) {
      return [{ inverter: exactMatch, quantity: 1 }];
    }

    // 2. Find smallest single inverter >= required (Option A)
    const singleInverter = sortedAsc.find(
      (inv) => Number(inv.specifications?.capacity_kw || 0) >= requiredKw,
    );
    const singleCapacity = singleInverter
      ? Number(singleInverter.specifications?.capacity_kw || 0)
      : Infinity;

    // 3. Build optimal combination (Option B)
    const combination = this.buildOptimalCombination(sortedDesc, sortedAsc, requiredKw);
    const comboCapacity = combination.reduce(
      (sum, c) => sum + Number(c.inverter.specifications?.capacity_kw || 0) * c.quantity,
      0,
    );

    // 4. Compare and pick better option (less overage)
    // If single inverter has less or equal total capacity, prefer it (simpler installation)
    if (singleInverter && singleCapacity <= comboCapacity) {
      return [{ inverter: singleInverter, quantity: 1 }];
    }

    // If combination has less capacity, use it
    if (comboCapacity >= requiredKw && comboCapacity < singleCapacity) {
      return combination;
    }

    // Fallback to single inverter if available
    if (singleInverter) {
      return [{ inverter: singleInverter, quantity: 1 }];
    }

    // Fallback to combination
    return combination;
  }

  /**
   * Build optimal combination with MINIMUM OVERAGE
   *
   * Algorithm: Explore multiple starting points and pick the combination with least overage.
   *
   * For 26KW with options [8, 10, 15, 20, 25, 36]:
   * - Try starting with 25: 25 + 8 = 33KW (7 over) ← old greedy picked this
   * - Try starting with 20: 20 + 8 = 28KW (2 over) ← BETTER!
   * - Try starting with 15: 15 + 15 = 30KW (4 over) or 15 + 10 + 8 = 33KW
   *
   * The key insight: starting with a smaller "anchor" inverter can lead to better totals.
   */
  private buildOptimalCombination(
    sortedDesc: ProductEntity[],
    sortedAsc: ProductEntity[],
    requiredKw: number,
  ): Array<{ inverter: ProductEntity; quantity: number }> {
    type Combination = Array<{ inverter: ProductEntity; quantity: number }>;

    const getCombinationTotal = (combo: Combination): number => {
      return combo.reduce(
        (sum, c) => sum + Number(c.inverter.specifications?.capacity_kw || 0) * c.quantity,
        0,
      );
    };

    let bestCombination: Combination = [];
    let bestOverage = Infinity;

    // Strategy 1: Try each inverter as the "anchor" (starting point)
    for (const anchor of sortedDesc) {
      const anchorCapacity = Number(anchor.specifications?.capacity_kw || 0);
      if (anchorCapacity <= 0) continue;

      // Try 1, 2, or more of this anchor (up to what makes sense)
      const maxAnchorCount = Math.ceil(requiredKw / anchorCapacity);

      for (let anchorCount = 1; anchorCount <= maxAnchorCount && anchorCount <= 3; anchorCount++) {
        const combination: Combination = [{ inverter: anchor, quantity: anchorCount }];
        let remaining = requiredKw - anchorCapacity * anchorCount;

        // If we already meet/exceed requirement, check overage
        if (remaining <= 0) {
          const overage = -remaining;
          if (overage < bestOverage) {
            bestOverage = overage;
            bestCombination = [...combination];
          }
          continue;
        }

        // Fill remaining with smallest suitable inverters
        for (const filler of sortedAsc) {
          if (filler.id === anchor.id) continue; // Already used as anchor

          const fillerCapacity = Number(filler.specifications?.capacity_kw || 0);
          if (fillerCapacity <= 0) continue;

          if (fillerCapacity >= remaining) {
            // This filler completes the combination
            combination.push({ inverter: filler, quantity: 1 });
            remaining = 0;
            break;
          } else {
            // Use multiples of this filler if it helps
            const fillerCount = Math.floor(remaining / fillerCapacity);
            if (fillerCount > 0) {
              combination.push({ inverter: filler, quantity: fillerCount });
              remaining -= fillerCapacity * fillerCount;
            }
          }
        }

        // If still remaining, add smallest >= remaining
        if (remaining > 0) {
          const smallestSuitable = sortedAsc.find(
            (inv) =>
              inv.id !== anchor.id && Number(inv.specifications?.capacity_kw || 0) >= remaining,
          );
          if (smallestSuitable) {
            const existing = combination.find((c) => c.inverter.id === smallestSuitable.id);
            if (existing) {
              existing.quantity += 1;
            } else {
              combination.push({ inverter: smallestSuitable, quantity: 1 });
            }
          }
        }

        const total = getCombinationTotal(combination);
        if (total >= requiredKw) {
          const overage = total - requiredKw;
          if (overage < bestOverage) {
            bestOverage = overage;
            bestCombination = [...combination];
          }
        }
      }
    }

    // Strategy 2: Try pairs of different inverters
    for (let i = 0; i < sortedDesc.length; i++) {
      for (let j = i + 1; j < sortedDesc.length; j++) {
        const inv1 = sortedDesc[i];
        const inv2 = sortedDesc[j];
        if (!inv1 || !inv2) continue;

        const cap1 = Number(inv1.specifications?.capacity_kw || 0);
        const cap2 = Number(inv2.specifications?.capacity_kw || 0);

        // Try 1 of each
        const total = cap1 + cap2;
        if (total >= requiredKw) {
          const overage = total - requiredKw;
          if (overage < bestOverage) {
            bestOverage = overage;
            bestCombination = [
              { inverter: inv1, quantity: 1 },
              { inverter: inv2, quantity: 1 },
            ];
          }
        }
      }
    }

    // Fallback: use original greedy if nothing found
    if (bestCombination.length === 0) {
      return this.greedyCombination(sortedDesc, sortedAsc, requiredKw);
    }

    return bestCombination;
  }

  /**
   * Original greedy algorithm as fallback
   */
  private greedyCombination(
    sortedDesc: ProductEntity[],
    sortedAsc: ProductEntity[],
    requiredKw: number,
  ): Array<{ inverter: ProductEntity; quantity: number }> {
    let remainingKw = requiredKw;
    const combination: Array<{ inverter: ProductEntity; quantity: number }> = [];

    for (const inverter of sortedDesc) {
      const capacity = Number(inverter.specifications?.capacity_kw || 0);
      if (capacity <= 0) continue;

      const count = Math.floor(remainingKw / capacity);
      if (count > 0) {
        combination.push({ inverter, quantity: count });
        remainingKw -= count * capacity;
      }

      if (remainingKw <= 0) break;
    }

    if (remainingKw > 0) {
      const smallestSuitable = sortedAsc.find(
        (inv) => Number(inv.specifications?.capacity_kw || 0) >= remainingKw,
      );

      if (smallestSuitable) {
        const existing = combination.find((c) => c.inverter.id === smallestSuitable.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          combination.push({ inverter: smallestSuitable, quantity: 1 });
        }
      } else if (sortedDesc.length > 0 && sortedDesc[0]) {
        const largest = sortedDesc[0];
        const existing = combination.find((c) => c.inverter.id === largest.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          combination.push({ inverter: largest, quantity: 1 });
        }
      }
    }

    return combination;
  }

  /**
   * Find COST-OPTIMAL inverter combination
   *
   * PRIORITY:
   * 1. Minimum TOTAL COST (primary)
   * 2. Minimum inverter count (tie-breaker)
   * 3. Minimum capacity overage (secondary tie-breaker)
   *
   * This method explores all valid combinations and picks the cheapest one.
   */
  private findCostOptimalInverterCombination(
    inverters: ProductEntity[],
    requiredKw: number,
    pricing: Map<string, { basePrice: number; gstRate: number }>,
  ): Array<{ inverter: ProductEntity; quantity: number }> {
    type Combination = Array<{ inverter: ProductEntity; quantity: number }>;

    const getInverterCapacity = (inv: ProductEntity): number => {
      return Number(inv.specifications?.capacity_kw || 0);
    };

    const getCombinationCost = (combo: Combination): number => {
      return combo.reduce((sum, c) => {
        const price = pricing.get(c.inverter.id)!.basePrice;
        return sum + price * c.quantity;
      }, 0);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- helper used for sorting, not direct computation
    const getCombinationCapacity = (combo: Combination): number => {
      return combo.reduce((sum, c) => sum + getInverterCapacity(c.inverter) * c.quantity, 0);
    };

    const getInverterCount = (combo: Combination): number => {
      return combo.reduce((sum, c) => sum + c.quantity, 0);
    };

    // Sort inverters by capacity
    const sortedAsc = [...inverters].sort(
      (a, b) => getInverterCapacity(a) - getInverterCapacity(b),
    );
    const sortedDesc = [...sortedAsc].reverse();

    // Collect all valid combinations (capacity >= required)
    const validCombinations: Array<{
      combo: Combination;
      cost: number;
      count: number;
      capacity: number;
    }> = [];

    // Strategy 1: Single inverters that meet requirement
    for (const inv of sortedAsc) {
      const capacity = getInverterCapacity(inv);
      if (capacity >= requiredKw) {
        const combo: Combination = [{ inverter: inv, quantity: 1 }];
        validCombinations.push({
          combo,
          cost: getCombinationCost(combo),
          count: 1,
          capacity,
        });
      }
    }

    // Strategy 2: Pairs of different inverters
    for (let i = 0; i < sortedDesc.length; i++) {
      for (let j = i; j < sortedDesc.length; j++) {
        const inv1 = sortedDesc[i];
        const inv2 = sortedDesc[j];
        if (!inv1 || !inv2) continue;

        const cap1 = getInverterCapacity(inv1);
        const cap2 = getInverterCapacity(inv2);

        // Try 1 of each (or 2 of same)
        const capacity = cap1 + cap2;
        if (capacity >= requiredKw) {
          const combo: Combination =
            inv1.id === inv2.id
              ? [{ inverter: inv1, quantity: 2 }]
              : [
                  { inverter: inv1, quantity: 1 },
                  { inverter: inv2, quantity: 1 },
                ];
          validCombinations.push({
            combo,
            cost: getCombinationCost(combo),
            count: getInverterCount(combo),
            capacity,
          });
        }
      }
    }

    // Strategy 3: Triple combinations (for larger systems)
    for (let i = 0; i < sortedDesc.length; i++) {
      for (let j = i; j < sortedDesc.length; j++) {
        for (let k = j; k < sortedDesc.length; k++) {
          const inv1 = sortedDesc[i];
          const inv2 = sortedDesc[j];
          const inv3 = sortedDesc[k];
          if (!inv1 || !inv2 || !inv3) continue;

          const cap1 = getInverterCapacity(inv1);
          const cap2 = getInverterCapacity(inv2);
          const cap3 = getInverterCapacity(inv3);

          const capacity = cap1 + cap2 + cap3;
          if (capacity >= requiredKw && capacity <= requiredKw * 1.5) {
            // Build combination with proper quantities
            const comboMap = new Map<string, { inverter: ProductEntity; quantity: number }>();
            [inv1, inv2, inv3].forEach((inv) => {
              const existing = comboMap.get(inv.id);
              if (existing) {
                existing.quantity += 1;
              } else {
                comboMap.set(inv.id, { inverter: inv, quantity: 1 });
              }
            });
            const combo = Array.from(comboMap.values());
            validCombinations.push({
              combo,
              cost: getCombinationCost(combo),
              count: getInverterCount(combo),
              capacity,
            });
          }
        }
      }
    }

    // Strategy 4: Multiples of same inverter
    for (const inv of sortedDesc) {
      const capacity = getInverterCapacity(inv);
      if (capacity <= 0) continue;

      const minCount = Math.ceil(requiredKw / capacity);
      for (let count = minCount; count <= minCount + 1 && count <= 5; count++) {
        const totalCapacity = capacity * count;
        if (totalCapacity >= requiredKw) {
          const combo: Combination = [{ inverter: inv, quantity: count }];
          validCombinations.push({
            combo,
            cost: getCombinationCost(combo),
            count,
            capacity: totalCapacity,
          });
        }
      }
    }

    // Sort by: 1. Cost (asc), 2. Count (asc), 3. Capacity (asc)
    validCombinations.sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost; // Primary: minimum cost
      if (a.count !== b.count) return a.count - b.count; // Secondary: fewer inverters
      return a.capacity - b.capacity; // Tertiary: less overage
    });

    // Return the best combination
    if (validCombinations.length > 0 && validCombinations[0]) {
      return validCombinations[0].combo;
    }

    // Fallback to overage-based algorithm if no valid combination found
    return this.buildOptimalCombination(sortedDesc, sortedAsc, requiredKw);
  }

  /**
   * Calculate structure cost from pricing rules
   *
   * Formula: basePrice × multiplier × systemSizeKw
   *
   * Multipliers by structure type:
   * - ALUMINUM_RAIL: 1.0
   * - RCC_3X6: 2.2
   * - ELEVATED_6X9: 2.5
   * - SUPER_ELEVATED: 3.2
   * - GROUND_MOUNT: 3.5
   */
  private async calculateStructure(
    organizationId: string,
    systemSizeKw: number,
    structureType: StructureType,
    projectType: ProjectType,
  ): Promise<{
    productId: string;
    name: string;
    structureType: StructureType;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    gstAmount: number;
    gstRate: number;
  }> {
    // 1. Find structure product
    const productTypeId = await this.getProductTypeId(organizationId, 'mounting_structure');
    const structureProduct = await this.productRepo.findMountingStructure(
      organizationId,
      productTypeId,
      structureType,
    );

    if (!structureProduct) {
      throw new BadRequestException(`Mounting structure not found for type: ${structureType}`);
    }

    // 2. Get pricing rule and validate
    const productPrice = await this.getProductPrice(
      organizationId,
      structureProduct.id,
      projectType,
    );
    const { basePrice, gstRate, multiplier } = this.validateStructurePricing(
      productPrice,
      structureProduct.name,
    );

    const structureCost = basePrice * multiplier * systemSizeKw;
    const gstAmount = (structureCost * gstRate) / 100;

    return {
      productId: structureProduct.id,
      name: structureProduct.name,
      structureType,
      quantity: 1,
      unitPrice: structureCost,
      lineTotal: structureCost,
      gstAmount,
      gstRate,
    };
  }

  /**
   * Calculate installation costs from installation pricing
   */
  private calculateInstallationCosts(
    pricing: InstallationPricing,
    structureType: StructureType,
    floorNumber: number,
    distanceKm: number,
  ): CalculatedInstallationCost {
    const costs = pricing.costComponents || {};

    // Extract all cost components
    const electricalWork = Number(costs.electrical_work || 0);
    const fixedMaterial = Number(costs.fixed_material || 0);
    const installationLabor = Number(costs.installation_labor || 0);
    const loadingUnloading = Number(costs.loading_unloading || 0);
    const msedclCharges = Number(costs.msedcl_charges || 0);
    const supervision = Number(costs.supervision || 0);
    const transport = distanceKm * Number(pricing.transportRatePerKm || 0);

    // Calculate floor-based variable cost
    let variableFloor = 0;
    if (floorNumber > 0) {
      const baseFloorCost = Number(costs.variable_floor || 0);
      const incrementPercent = Number(pricing.floorIncrementPercent || 0);
      variableFloor = baseFloorCost * (1 + (incrementPercent * floorNumber) / 100);
    }

    // Structure cost is calculated separately in calculateStructure based on structureType
    // Using per-structure-type costs: struct_aluminum_rail, struct_rcc_elevated, struct_super_ground
    // Setting to 0 here as it's handled in the structure line item
    const structureCost = 0;

    const NON_COST_KEYS = new Set(['profitability_percent', 'variable_floor']);
    const breakdown: Record<string, number> = {};
    for (const [key, value] of Object.entries(costs)) {
      if (typeof value === 'number' && value > 0 && !NON_COST_KEYS.has(key)) {
        breakdown[key] = value;
      }
    }
    breakdown['transport'] = transport;
    if (variableFloor > 0) {
      breakdown['variable_floor_adjusted'] = variableFloor;
    }

    // Total (excluding structure_cost as it's in the structure line item)
    const totalBeforeTax =
      electricalWork +
      fixedMaterial +
      variableFloor +
      installationLabor +
      loadingUnloading +
      msedclCharges +
      supervision +
      transport;

    const gstRate = Number(pricing.gstRate);
    const gstAmount = (totalBeforeTax * gstRate) / 100;

    return {
      electricalWork,
      fixedMaterial,
      variableFloor,
      structureCost,
      installationLabor,
      loadingUnloading,
      msedclCharges,
      supervision,
      transport,
      totalBeforeTax,
      gstAmount,
      gstRate,
      totalWithGst: totalBeforeTax + gstAmount,
      breakdown,
    };
  }

  /**
   * Calculate subsidy with tiered rates and max amount cap
   * Skips calculation entirely for NON_DCR_ONLY preference
   */
  private async calculateSubsidy(
    organizationId: string,
    dcrSizeKw: number,
    projectType: ProjectType,
    subsidyApplicable: boolean,
    dcrPreference?: DcrPreference,
  ): Promise<CalculatedSubsidy> {
    // Skip subsidy entirely for NON_DCR_ONLY
    if (dcrPreference === DcrPreference.NON_DCR_ONLY) {
      return {
        isApplicable: false,
        amount: 0,
      };
    }

    if (!subsidyApplicable || dcrSizeKw <= 0) {
      return {
        isApplicable: false,
        amount: 0,
      };
    }

    const subsidyConfig = await this.subsidyConfigRepo.findActiveByProjectType(
      organizationId,
      projectType,
    );

    if (!subsidyConfig) {
      return {
        isApplicable: false,
        amount: 0,
      };
    }

    // Calculate tiered subsidy
    const breakdown: CalculatedSubsidy['breakdown'] = [];
    let totalAmount = 0;
    let remainingKw = Math.min(dcrSizeKw, Number(subsidyConfig.maxSubsidyKw));

    // Sort tiers by fromKw
    const sortedTiers = [...(subsidyConfig.tiers || [])].sort((a, b) => a.fromKw - b.fromKw);

    for (const tier of sortedTiers) {
      if (remainingKw <= 0) break;

      const tierFromKw = tier.fromKw;
      const tierToKw = tier.toKw !== null ? tier.toKw : Infinity;
      const tierRatePerKw = tier.ratePerKw;

      // Calculate kW in this tier
      const tierMaxKw = tierToKw - tierFromKw;
      const kwInTier = Math.min(remainingKw, tierMaxKw);

      if (kwInTier > 0) {
        const tierAmount = Math.round(kwInTier * tierRatePerKw * 100) / 100;
        totalAmount += tierAmount;
        remainingKw -= kwInTier;

        breakdown.push({
          fromKw: tierFromKw,
          toKw: tierToKw === Infinity ? tierFromKw + kwInTier : tierToKw,
          kw: Math.round(kwInTier * 100) / 100,
          ratePerKw: tierRatePerKw,
          amount: tierAmount,
        });
      }
    }

    // Apply max subsidy amount cap
    const maxSubsidyAmount = Number(subsidyConfig.maxSubsidyAmount) || Infinity;
    const cappedAmount = Math.round(Math.min(totalAmount, maxSubsidyAmount) * 100) / 100;

    return {
      isApplicable: true,
      schemeName: subsidyConfig.schemeName,
      eligibleKw: Math.round(dcrSizeKw * 100) / 100,
      amount: cappedAmount,
      breakdown,
    };
  }

  /**
   * Calculate final pricing using actual per-item GST rates
   *
   * GST Rates (as per product pricing rules):
   * - Panels: 5% GST (solar equipment)
   * - Inverters: 5% GST (solar equipment)
   * - Structure: 18% GST (from installation pricing)
   * - Installation: 18% GST (services)
   */
  private calculatePricing(
    panels: CalculatedPanelConfig[],
    inverters: CalculatedInverterConfig,
    structure: { lineTotal: number; gstAmount: number },
    installation: CalculatedInstallationCost,
    quoteConfig: QuoteConfiguration,
    profitabilityPercent: number,
  ): {
    basePrice: number;
    gst5Amount: number;
    gst18Amount: number;
    totalGst: number;
    totalPrice: number;
    discountAmount: number;
    finalPrice: number;
    profitabilityAmount: number;
  } {
    const panelsTotal = panels.reduce((sum, p) => sum + p.lineTotal, 0);
    const rawBasePrice =
      panelsTotal + inverters.totalCost + structure.lineTotal + installation.totalBeforeTax;

    const profitabilityAmount = Math.round((rawBasePrice * profitabilityPercent) / 100);
    const basePrice = rawBasePrice + profitabilityAmount;

    const { rate1, rate1Percentage, rate2, rate2Percentage } = quoteConfig.gstConfig;
    const portion1 = (basePrice * rate1Percentage) / 100;
    const portion2 = (basePrice * rate2Percentage) / 100;

    const gst5Amount = (portion1 * rate1) / 100;
    const gst18Amount = (portion2 * rate2) / 100;

    const totalGst = gst5Amount + gst18Amount;
    const totalPrice = basePrice + totalGst;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      gst5Amount: Math.round(gst5Amount * 100) / 100,
      gst18Amount: Math.round(gst18Amount * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      discountAmount: 0,
      finalPrice: Math.round(totalPrice * 100) / 100,
      profitabilityAmount: Math.round(profitabilityAmount * 100) / 100,
    };
  }

  private async getProductTypeId(organizationId: string, code: string): Promise<string> {
    const pt = await this.productTypeRepo.findByCode(code, organizationId);
    if (!pt) throw new BadRequestException(`Product type '${code}' not configured.`);
    return pt.id;
  }

  private async getProductPrice(
    organizationId: string,
    productId: string,
    projectType?: string,
  ): Promise<{ unitPrice: number; gstRate: number; costMultiplier: number } | null> {
    return this.productPriceRepo.findActiveForProduct(organizationId, productId, projectType);
  }

  private validatePanelPricing(
    productPrice: { unitPrice: number; gstRate: number } | null | undefined,
    productName: string,
  ): { pricePerWatt: number; gstRate: number } {
    if (!productPrice) {
      throw new BadRequestException(
        `Pricing not found for product '${productName}'. Please configure pricing in master data.`,
      );
    }
    if (productPrice.gstRate == null) {
      throw new BadRequestException(
        `GST rate not configured for product '${productName}'. Please update the pricing.`,
      );
    }
    if (productPrice.unitPrice == null) {
      throw new BadRequestException(
        `Price per watt not configured for product '${productName}'. Please update the pricing.`,
      );
    }
    return {
      pricePerWatt: Number(productPrice.unitPrice),
      gstRate: Number(productPrice.gstRate),
    };
  }

  private validateInverterPricing(
    productPrice: { unitPrice: number; gstRate: number } | null | undefined,
    productName: string,
  ): { basePrice: number; gstRate: number } {
    if (!productPrice) {
      throw new BadRequestException(
        `Pricing not found for product '${productName}'. Please configure pricing in master data.`,
      );
    }
    if (productPrice.gstRate == null) {
      throw new BadRequestException(
        `GST rate not configured for product '${productName}'. Please update the pricing.`,
      );
    }
    if (productPrice.unitPrice == null) {
      throw new BadRequestException(
        `Base price not configured for product '${productName}'. Please update the pricing.`,
      );
    }
    return {
      basePrice: Number(productPrice.unitPrice),
      gstRate: Number(productPrice.gstRate),
    };
  }

  private validateStructurePricing(
    productPrice: { unitPrice: number; gstRate: number; costMultiplier: number } | null | undefined,
    productName: string,
  ): { basePrice: number; gstRate: number; multiplier: number } {
    if (!productPrice) {
      throw new BadRequestException(
        `Pricing not found for product '${productName}'. Please configure pricing in master data.`,
      );
    }
    if (Number(productPrice.unitPrice) <= 0) {
      throw new BadRequestException(
        `Base price not configured for structure '${productName}'. Please update the pricing.`,
      );
    }
    if (productPrice.gstRate == null) {
      throw new BadRequestException(
        `GST rate not configured for product '${productName}'. Please update the pricing.`,
      );
    }
    if (productPrice.costMultiplier == null) {
      throw new BadRequestException(
        `Multiplier not configured for structure '${productName}'. Please update the pricing.`,
      );
    }
    return {
      basePrice: Number(productPrice.unitPrice),
      gstRate: Number(productPrice.gstRate),
      multiplier: Number(productPrice.costMultiplier),
    };
  }

  /**
   * Validate installation pricing has required fields.
   * Throws BadRequestException if gstRate is missing.
   */
  private validateInstallationPricing(pricing: InstallationPricing): void {
    const label = pricing.getDisplayLabel();
    if (pricing.gstRate == null) {
      throw new BadRequestException(
        `GST rate not configured for installation pricing '${label}'. Please update the installation pricing configuration.`,
      );
    }
    if (pricing.costComponents == null) {
      throw new BadRequestException(
        `Cost components not configured for installation pricing '${label}'. Please update the installation pricing configuration.`,
      );
    }
  }
}
