import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ProjectType,
  PhaseType,
  DcrPreference,
  StructureType,
  CalculatedPanelConfig,
  CalculatedInverterConfig,
  CalculatedInstallationCost,
  CalculatedSubsidy,
  QuoteConfigSnapshot,
  ValidationWarning,
} from '@oneohm-epc/shared-types';

import { InstallationPricing } from '../../master-data/entities/installation-pricing.entity';
import { ProductEntity } from '../../master-data/entities/product.entity';
import { QuoteConfiguration } from '../../master-data/entities/quote-configuration.entity';
import { SubsidyConfiguration } from '../../master-data/entities/subsidy-configuration.entity';
import {
  ProductRepository,
  PricingRuleRepository,
  SubsidyConfigurationRepository,
  InstallationPricingRepository,
  QuoteConfigurationRepository,
} from '../../master-data/repositories';
import { CalculateQuoteDto, CalculateQuoteResponseDto, PanelOverrideDto, InverterOverrideDto } from '../dto/calculator';

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
    private readonly pricingRuleRepo: PricingRuleRepository,
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

    // 3. Determine DCR/Non-DCR split based on subsidy eligibility
    const { dcrSizeKw, nonDcrSizeKw } = await this.calculateSystemSplit(
      organizationId,
      input.systemSizeKw,
      input.projectType,
      input.subsidyApplicable,
      input.dcrPreference || DcrPreference.AUTO_SPLIT,
    );

    // 4. Calculate panel configuration (with override support)
    const panels = await this.calculatePanels(
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

    // Calculate actual wattage from panels
    const actualTotalWattage = panels.reduce((sum, p) => sum + p.totalWattage, 0);
    const actualSystemSizeKw = actualTotalWattage / 1000;

    // 5. Calculate inverter configuration (with override support)
    const inverters = await this.calculateInverters(
      organizationId,
      input.systemSizeKw,
      input.phaseType,
      input.preferredInverterBrand,
      input.projectType,
      input.inverterOverrides,
      warnings,
    );

    // 6. Calculate structure cost (from installation pricing with product multiplier)
    const structure = await this.calculateStructure(
      organizationId,
      input.systemSizeKw,
      input.structureType,
      installationPricing,
    );

    // 7. Calculate installation costs
    const installation = this.calculateInstallationCosts(
      installationPricing,
      input.structureType,
      input.floorNumber || 0,
      input.distanceKm || 0,
    );

    // 8. Calculate subsidy (skip if NON_DCR_ONLY)
    const subsidy = await this.calculateSubsidy(
      organizationId,
      dcrSizeKw,
      input.projectType,
      input.subsidyApplicable,
      input.dcrPreference,
    );

    // 9. Calculate pricing summary
    const pricing = this.calculatePricing(panels, inverters, structure, installation, quoteConfig);

    // 10. Calculate effective price
    const effectivePrice = pricing.finalPrice - subsidy.amount;

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
      hasOverrides: !!(input.panelOverrides?.length || input.inverterOverrides?.length),
      actualTotalWattage,
      actualSystemSizeKw,
      calculatedAt: new Date().toISOString(),
    };
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
      return this.calculatePanelsWithOverrides(
        organizationId,
        projectType,
        overrides,
        warnings,
      );
    }

    // Auto-calculate panels
    const panels: CalculatedPanelConfig[] = [];

    // Calculate DCR panels if needed
    if (dcrSizeKw > 0) {
      const dcrPanel = await this.findPanel(organizationId, true, preferredBrand, preferredTechnology, preferredWattage);
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
      const nonDcrPanel = await this.findPanel(organizationId, false, preferredBrand, preferredTechnology, preferredWattage);
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
    warnings: ValidationWarning[],
  ): Promise<CalculatedPanelConfig[]> {
    const panels: CalculatedPanelConfig[] = [];
    const brands = new Set<string>();

    for (const override of overrides) {
      const panel = await this.productRepo.findById(override.productId, organizationId);
      if (!panel) {
        throw new BadRequestException(`Panel product ${override.productId} not found`);
      }

      const specs = panel.specifications?.panel;
      if (!specs) {
        throw new BadRequestException(`Panel ${panel.name} has invalid specifications`);
      }

      // Track brands for validation
      if (panel.brand) {
        brands.add(panel.brand.toLowerCase());
      }

      // Get pricing with project type context
      const pricingRule = await this.pricingRuleRepo.findByProductIdWithContext(
        organizationId,
        panel.id,
        projectType,
      );

      const pricePerWatt = pricingRule?.formula?.pricePerWatt || 0;
      const gstRate = pricingRule?.formula?.gstRate || 12;

      if (!pricingRule) {
        warnings.push({
          code: 'MISSING_PRICING_RULE',
          message: `No pricing rule found for panel ${panel.name}. Using default price.`,
          severity: 'warning',
        });
      }

      const wattage = specs.wattage || ((specs.minWattage || 0) + (specs.maxWattage || 0)) / 2;
      const totalWattage = override.quantity * wattage;
      const lineTotal = totalWattage * pricePerWatt;
      const gstAmount = (lineTotal * gstRate) / 100;

      panels.push({
        productId: panel.id,
        name: panel.name,
        brand: panel.brand || 'Unknown',
        isDcr: specs.isDcr ?? false,
        technology: specs.technology,
        wattagePerPanel: wattage,
        quantity: override.quantity,
        totalWattage,
        pricePerWatt,
        lineTotal,
        gstAmount,
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
   * Find suitable panel based on DCR requirement, brand, technology and wattage preference
   */
  private async findPanel(
    organizationId: string,
    isDcr: boolean,
    preferredBrand?: string,
    preferredTechnology?: string,
    preferredWattage?: number,
  ): Promise<ProductEntity | null> {
    return this.productRepo.findSolarPanel(organizationId, isDcr, preferredBrand, preferredTechnology, preferredWattage);
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
    const specs = panel.specifications?.panel;
    if (!specs) {
      throw new BadRequestException(`Panel ${panel.name} missing specifications`);
    }

    // Validate panel specs exist
    if (!specs.wattage && (!specs.minWattage || !specs.maxWattage)) {
      throw new BadRequestException(`Panel ${panel.name} missing wattage specifications`);
    }

    // Use nominal wattage if available, otherwise calculate from min/max
    const nominalWattage = specs.wattage ?? ((specs.minWattage ?? 0) + (specs.maxWattage ?? 0)) / 2;
    const roundedWattage = this.roundWattage(nominalWattage, quoteConfig.wattageRounding);

    // Calculate number of panels needed
    const requiredWattage = requiredKw * 1000;
    const panelCount = Math.ceil(requiredWattage / roundedWattage);
    const totalWattage = panelCount * roundedWattage;

    // Get pricing with project type context
    const pricingRule = await this.pricingRuleRepo.findByProductIdWithContext(
      organizationId,
      panel.id,
      projectType,
    );
    const pricePerWatt = pricingRule?.formula?.pricePerWatt || 0;
    const gstRate = pricingRule?.formula?.gstRate || 12;

    const lineTotal = totalWattage * pricePerWatt;
    const gstAmount = (lineTotal * gstRate) / 100;

    return {
      productId: panel.id,
      name: panel.name,
      brand: panel.brand || 'Unknown',
      isDcr: specs.isDcr ?? false,
      technology: specs.technology,
      wattagePerPanel: roundedWattage,
      quantity: panelCount,
      totalWattage,
      pricePerWatt,
      lineTotal,
      gstAmount,
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
  ): Promise<CalculatedInverterConfig> {
    // If overrides provided, validate and use them
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
    const availableInverters = await this.findInverters(organizationId, phaseType, preferredBrand);

    if (availableInverters.length === 0) {
      throw new BadRequestException(
        `No ${phaseType} inverters found${preferredBrand ? ` for brand ${preferredBrand}` : ''}. Please try a different brand or contact administrator.`,
      );
    }

    // Pre-fetch pricing for all available inverters
    const inverterPricing = new Map<string, { basePrice: number; gstRate: number }>();
    await Promise.all(
      availableInverters.map(async (inv) => {
        const pricingRule = await this.pricingRuleRepo.findByProductIdWithContext(
          organizationId,
          inv.id,
          projectType,
        );
        inverterPricing.set(inv.id, {
          basePrice: pricingRule?.formula?.basePrice || 0,
          gstRate: pricingRule?.formula?.gstRate || 5,
        });
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
      const pricing = inverterPricing.get(inverter.id) || { basePrice: 0, gstRate: 5 };
      const lineTotal = pricing.basePrice * quantity;
      const gstAmount = (lineTotal * pricing.gstRate) / 100;

        return {
          productId: inverter.id,
          name: inverter.name,
          brand: inverter.brand || 'Unknown',
          capacityKw: Number(inverter.specifications?.inverter?.capacityKw || 0),
          quantity,
        unitPrice: pricing.basePrice,
          lineTotal,
          gstAmount,
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

    for (const override of overrides) {
      const inverter = await this.productRepo.findById(override.productId, organizationId);
      if (!inverter) {
        throw new BadRequestException(`Inverter product ${override.productId} not found`);
      }

      const specs = inverter.specifications?.inverter;
      if (!specs) {
        throw new BadRequestException(`Inverter ${inverter.name} has invalid specifications`);
      }

      const capacityKw = Number(specs.capacityKw || 0);
      totalCapacityKw += capacityKw * override.quantity;

      // Get pricing with project type context
      const pricingRule = await this.pricingRuleRepo.findByProductIdWithContext(
        organizationId,
        inverter.id,
        projectType,
      );

      const basePrice = pricingRule?.formula?.basePrice || 0;
      const gstRate = pricingRule?.formula?.gstRate || 18;

      if (!pricingRule) {
        warnings.push({
          code: 'MISSING_PRICING_RULE',
          message: `No pricing rule found for inverter ${inverter.name}. Using default price.`,
          severity: 'warning',
        });
      }

      const lineTotal = basePrice * override.quantity;
      const gstAmount = (lineTotal * gstRate) / 100;

      invertersWithPricing.push({
        productId: inverter.id,
        name: inverter.name,
        brand: inverter.brand || 'Unknown',
        capacityKw,
        quantity: override.quantity,
        unitPrice: basePrice,
        lineTotal,
        gstAmount,
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
   * Find available inverters by phase type
   */
  private async findInverters(
    organizationId: string,
    phaseType: PhaseType,
    preferredBrand?: string,
  ): Promise<ProductEntity[]> {
    return this.productRepo.findInvertersByPhase(organizationId, phaseType, preferredBrand);
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
      const capA = Number(a.specifications?.inverter?.capacityKw || 0);
      const capB = Number(b.specifications?.inverter?.capacityKw || 0);
      return capA - capB;
    });

    // Sort by capacity descending for greedy
    const sortedDesc = [...sortedAsc].reverse();

    // 1. Try to find exact match
    const exactMatch = sortedAsc.find(
      (inv) => Number(inv.specifications?.inverter?.capacityKw || 0) === requiredKw,
    );
    if (exactMatch) {
      return [{ inverter: exactMatch, quantity: 1 }];
    }

    // 2. Find smallest single inverter >= required (Option A)
    const singleInverter = sortedAsc.find(
      (inv) => Number(inv.specifications?.inverter?.capacityKw || 0) >= requiredKw,
    );
    const singleCapacity = singleInverter
      ? Number(singleInverter.specifications?.inverter?.capacityKw || 0)
      : Infinity;

    // 3. Build optimal combination (Option B)
    const combination = this.buildOptimalCombination(sortedDesc, sortedAsc, requiredKw);
    const comboCapacity = combination.reduce(
      (sum, c) => sum + Number(c.inverter.specifications?.inverter?.capacityKw || 0) * c.quantity,
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
        (sum, c) => sum + Number(c.inverter.specifications?.inverter?.capacityKw || 0) * c.quantity,
        0,
      );
    };

    let bestCombination: Combination = [];
    let bestOverage = Infinity;

    // Strategy 1: Try each inverter as the "anchor" (starting point)
    for (const anchor of sortedDesc) {
      const anchorCapacity = Number(anchor.specifications?.inverter?.capacityKw || 0);
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
          
          const fillerCapacity = Number(filler.specifications?.inverter?.capacityKw || 0);
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
              inv.id !== anchor.id && 
              Number(inv.specifications?.inverter?.capacityKw || 0) >= remaining,
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
        
        const cap1 = Number(inv1.specifications?.inverter?.capacityKw || 0);
        const cap2 = Number(inv2.specifications?.inverter?.capacityKw || 0);

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
      const capacity = Number(inverter.specifications?.inverter?.capacityKw || 0);
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
        (inv) => Number(inv.specifications?.inverter?.capacityKw || 0) >= remainingKw,
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
      return Number(inv.specifications?.inverter?.capacityKw || 0);
    };

    const getCombinationCost = (combo: Combination): number => {
      return combo.reduce((sum, c) => {
        const price = pricing.get(c.inverter.id)?.basePrice || 0;
        return sum + price * c.quantity;
      }, 0);
    };

    // Note: getCombinationCapacity removed - capacity is calculated inline via getInverterCapacity

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
   * Calculate structure cost from installation pricing by structure type (direct lookup)
   * 
   * Structure types map to cost_components fields:
   * - aluminum_rail -> struct_aluminum_rail
   * - rcc_3x6, elevated_6x9 -> struct_rcc_elevated
   * - super_elevated, ground_mount -> struct_super_ground
   */
  private async calculateStructure(
    organizationId: string,
    systemSizeKw: number,
    structureType: StructureType,
    installationPricing: InstallationPricing,
  ): Promise<{
    productId: string;
    name: string;
    structureType: StructureType;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    gstAmount: number;
  }> {
    // Get structure cost based on structure type (direct lookup)
    const costComponents = installationPricing.costComponents;
    let structureCost = 0;

    // Map structure types to cost component fields
    switch (structureType) {
      case StructureType.ALUMINUM_RAIL:
      case StructureType.FLUSH_MOUNT:
        structureCost = Number(costComponents.struct_aluminum_rail || 0);
        break;
      case StructureType.RCC_3X6:
      case StructureType.ELEVATED_6X9:
      case StructureType.ELEVATED:
      case StructureType.GI_STRUCTURE:
        structureCost = Number(costComponents.struct_rcc_elevated || 0);
        break;
      case StructureType.SUPER_ELEVATED:
      case StructureType.GROUND_MOUNT:
      case StructureType.CARPORT:
        structureCost = Number(costComponents.struct_super_ground || 0);
        break;
    }

    // Find structure product for product info
    let productId = '';
    let productName = `${structureType} Structure`;

    const structureProduct = await this.productRepo.findMountingStructure(organizationId, structureType);
    if (structureProduct) {
      productId = structureProduct.id;
      productName = structureProduct.name;
    }

    const lineTotal = structureCost;
    const gstRate = Number(installationPricing.gstRate || 18);
    const gstAmount = (lineTotal * gstRate) / 100;

    return {
      productId,
      name: productName,
      structureType,
      quantity: 1,
      unitPrice: lineTotal,
      lineTotal,
      gstAmount,
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

    // Build breakdown for detailed display
    const breakdown: Record<string, number> = {};
    for (const [key, value] of Object.entries(costs)) {
      if (typeof value === 'number' && value > 0) {
        breakdown[key] = value;
      }
    }
    breakdown['transport'] = transport;
    if (variableFloor > 0) {
      breakdown['variable_floor_adjusted'] = variableFloor;
    }

    // Total (excluding structure_cost as it's in the structure line item)
    const totalBeforeTax =
      electricalWork + fixedMaterial + variableFloor + installationLabor +
      loadingUnloading + msedclCharges + supervision + transport;

    const gstRate = Number(pricing.gstRate || 18);
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
        const tierAmount = kwInTier * tierRatePerKw;
        totalAmount += tierAmount;
        remainingKw -= kwInTier;

        breakdown.push({
          fromKw: tierFromKw,
          toKw: tierToKw === Infinity ? tierFromKw + kwInTier : tierToKw,
          kw: kwInTier,
          ratePerKw: tierRatePerKw,
          amount: tierAmount,
        });
      }
    }

    // Apply max subsidy amount cap
    const maxSubsidyAmount = Number(subsidyConfig.maxSubsidyAmount) || Infinity;
    const cappedAmount = Math.min(totalAmount, maxSubsidyAmount);

    return {
      isApplicable: true,
      schemeName: subsidyConfig.schemeName,
      eligibleKw: dcrSizeKw,
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
    _quoteConfig: QuoteConfiguration, // Kept for future use, using per-item GST now
  ): {
    basePrice: number;
    gst12Amount: number;
    gst18Amount: number;
    totalGst: number;
    totalPrice: number;
    discountAmount: number;
    finalPrice: number;
  } {
    // Sum all base prices (before tax)
    const panelsTotal = panels.reduce((sum, p) => sum + p.lineTotal, 0);
    const basePrice =
      panelsTotal + inverters.totalCost + structure.lineTotal + installation.totalBeforeTax;

    // Use actual per-item GST amounts instead of composite rate
    // GST at lower rates (5% for solar equipment - panels, inverters)
    const panelsGst = panels.reduce((sum, p) => sum + p.gstAmount, 0);
    const invertersGst = inverters.totalGst;
    const gst5Amount = panelsGst + invertersGst;

    // GST at higher rate (18% for structure and installation services)
    const structureGst = structure.gstAmount;
    const installationGst = installation.gstAmount;
    const gst18Amount = structureGst + installationGst;

    // For backward compatibility, map 5% GST to gst12Amount field
    // (gst12Amount now represents lower-rate GST from equipment)
    const gst12Amount = gst5Amount;
    
    const totalGst = gst12Amount + gst18Amount;
    const totalPrice = basePrice + totalGst;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      gst12Amount: Math.round(gst12Amount * 100) / 100, // Equipment GST (5%)
      gst18Amount: Math.round(gst18Amount * 100) / 100, // Services GST (18%)
      totalGst: Math.round(totalGst * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      discountAmount: 0,
      finalPrice: Math.round(totalPrice * 100) / 100,
    };
  }

  /**
   * Get pricing rule for a product (with project type context)
   */
  private async getPricingRule(
    organizationId: string,
    productId: string,
    projectType?: ProjectType,
  ): Promise<{
    formula: { pricePerWatt?: number; basePrice?: number; pricePerKw?: number; gstRate?: number };
  } | null> {
    return this.pricingRuleRepo.findByProductIdWithContext(organizationId, productId, projectType);
  }

  /**
   * Create configuration snapshot for audit trail
   */
  async createConfigSnapshot(
    organizationId: string,
    panels: CalculatedPanelConfig[],
    inverters: CalculatedInverterConfig,
    structure: { productId: string; name: string; unitPrice: number },
    installation: CalculatedInstallationCost,
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
      })),
      inverters: inverters.inverters.map((inv) => ({
        productId: inv.productId,
        name: inv.name,
        brand: inv.brand,
        capacityKw: inv.capacityKw,
        unitPrice: inv.unitPrice,
      })),
      structure: {
        productId: structure.productId,
        name: structure.name,
        pricePerKw: structure.unitPrice,
      },
      installationPricing: {
        minSystemSizeKw: 0,
        maxSystemSizeKw: null,
        electricalWorkCost: installation.electricalWork,
        fixedMaterialCost: installation.fixedMaterial,
        variableFloorCost: installation.variableFloor,
        msedclCharges: installation.msedclCharges,
        supervisionCharges: installation.supervision,
        floorIncrementPercent: 0,
        transportCostPerKm: 0,
        gstRate: 12,
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
}
