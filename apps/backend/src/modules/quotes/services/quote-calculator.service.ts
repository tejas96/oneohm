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

import { ProductEntity } from '../../master-data/entities/product.entity';
import { QuoteConfiguration } from '../../master-data/entities/quote-configuration.entity';
import { SubsidyConfiguration } from '../../master-data/entities/subsidy-configuration.entity';
import { InstallationPricing } from '../../master-data/entities/installation-pricing.entity';
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
 * - Installation cost calculation (with structure multiplier)
 * - Subsidy calculation with tiered rates and max amount cap
 * - GST calculation (configurable split)
 * - Validation and warnings
 * 
 * Key Features:
 * - Project type aware pricing
 * - Override support for panels and inverters
 * - Structure cost from installation pricing with product multiplier
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
      const dcrPanel = await this.findPanel(organizationId, true, preferredBrand);
      if (!dcrPanel) {
        throw new BadRequestException(
          `No DCR panel found${preferredBrand ? ` for brand ${preferredBrand}` : ''}. Please try a different brand or contact administrator.`,
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
      const nonDcrPanel = await this.findPanel(organizationId, false, preferredBrand);
      if (!nonDcrPanel) {
        throw new BadRequestException(
          `No Non-DCR panel found${preferredBrand ? ` for brand ${preferredBrand}` : ''}. Please try a different brand or contact administrator.`,
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
   * Find suitable panel based on DCR requirement and brand preference
   */
  private async findPanel(
    organizationId: string,
    isDcr: boolean,
    preferredBrand?: string,
  ): Promise<ProductEntity | null> {
    return this.productRepo.findSolarPanel(organizationId, isDcr, preferredBrand);
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

    // Find optimal combination
    const combination = this.findOptimalInverterCombination(availableInverters, systemSizeKw);

    // Calculate pricing for each inverter
    const invertersWithPricing = await Promise.all(
      combination.map(async ({ inverter, quantity }) => {
        const pricingRule = await this.pricingRuleRepo.findByProductIdWithContext(
          organizationId,
          inverter.id,
          projectType,
        );
        const basePrice = pricingRule?.formula?.basePrice || 0;
        const gstRate = pricingRule?.formula?.gstRate || 18;
        const lineTotal = basePrice * quantity;
        const gstAmount = (lineTotal * gstRate) / 100;

        return {
          productId: inverter.id,
          name: inverter.name,
          brand: inverter.brand || 'Unknown',
          capacityKw: Number(inverter.specifications?.inverter?.capacityKw || 0),
          quantity,
          unitPrice: basePrice,
          lineTotal,
          gstAmount,
        };
      }),
    );

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
   * Find optimal inverter combination using greedy algorithm
   */
  private findOptimalInverterCombination(
    inverters: ProductEntity[],
    requiredKw: number,
  ): Array<{ inverter: ProductEntity; quantity: number }> {
    // Sort by capacity descending
    const sortedInverters = [...inverters].sort((a, b) => {
      const capA = Number(a.specifications?.inverter?.capacityKw || 0);
      const capB = Number(b.specifications?.inverter?.capacityKw || 0);
      return capB - capA;
    });

    let remainingKw = requiredKw;
    const combination: Array<{ inverter: ProductEntity; quantity: number }> = [];

    // First, try to find exact match
    const exactMatch = sortedInverters.find(
      (inv) => Number(inv.specifications?.inverter?.capacityKw || 0) === requiredKw,
    );
    if (exactMatch) {
      return [{ inverter: exactMatch, quantity: 1 }];
    }

    // Greedy approach: use largest inverters first
    for (const inverter of sortedInverters) {
      const capacity = Number(inverter.specifications?.inverter?.capacityKw || 0);
      if (capacity <= 0) continue;

      const count = Math.floor(remainingKw / capacity);
      if (count > 0) {
        combination.push({ inverter, quantity: count });
        remainingKw -= count * capacity;
      }

      if (remainingKw <= 0) break;
    }

    // If we still have remaining capacity, add the smallest suitable inverter
    if (remainingKw > 0) {
      const smallestFirst = [...sortedInverters].reverse();
      const smallestSuitable = smallestFirst.find(
        (inv) => Number(inv.specifications?.inverter?.capacityKw || 0) >= remainingKw,
      );

      if (smallestSuitable) {
        const existing = combination.find((c) => c.inverter.id === smallestSuitable.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          combination.push({ inverter: smallestSuitable, quantity: 1 });
        }
      } else {
        // If no single inverter is big enough, add the largest available
        const largest = sortedInverters[0];
        if (largest) {
          const existing = combination.find((c) => c.inverter.id === largest.id);
          if (existing) {
            existing.quantity += 1;
          } else {
            combination.push({ inverter: largest, quantity: 1 });
          }
        }
      }
    }

    return combination;
  }

  /**
   * Calculate structure cost from installation pricing with product multiplier
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
    // Get base structure cost from installation pricing
    const baseStructureCost = Number(installationPricing.costComponents.structure_cost || 0);

    // Find structure product to get multiplier
    let multiplier = 1.0;
    let productId = '';
    let productName = `${structureType} Structure`;

    const structureProduct = await this.productRepo.findMountingStructure(organizationId, structureType);
    if (structureProduct) {
      productId = structureProduct.id;
      productName = structureProduct.name;
      // Get multiplier from product specifications
      multiplier = Number(structureProduct.specifications?.structure?.costMultiplier || 1.0);
    }

    const lineTotal = baseStructureCost * multiplier;
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

    // Structure cost is calculated separately in calculateStructure
    // But we still include it in the breakdown for completeness
    const structureCost = Number(costs.structure_cost || 0);

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
   * Calculate final pricing with GST split
   */
  private calculatePricing(
    panels: CalculatedPanelConfig[],
    inverters: CalculatedInverterConfig,
    structure: { lineTotal: number; gstAmount: number },
    installation: CalculatedInstallationCost,
    quoteConfig: QuoteConfiguration,
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

    // Apply GST split from configuration
    const { rate1, rate1Percentage, rate2, rate2Percentage } = quoteConfig.gstConfig;

    const civilBase = basePrice * (rate1Percentage / 100);
    const electricalBase = basePrice * (rate2Percentage / 100);

    const gst12Amount = (civilBase * rate1) / 100;
    const gst18Amount = (electricalBase * rate2) / 100;
    const totalGst = gst12Amount + gst18Amount;

    const totalPrice = basePrice + totalGst;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      gst12Amount: Math.round(gst12Amount * 100) / 100,
      gst18Amount: Math.round(gst18Amount * 100) / 100,
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
