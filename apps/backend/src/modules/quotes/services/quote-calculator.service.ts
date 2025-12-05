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
} from '@oneohm-epc/shared-types';

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
import { CalculateQuoteDto, CalculateQuoteResponseDto } from '../dto/calculator';

/**
 * Quote Calculator Service
 * Handles all quote calculation business logic including:
 * - Panel selection and quantity calculation
 * - Inverter selection and combination logic
 * - DCR/Non-DCR split for subsidy
 * - Installation cost calculation
 * - Subsidy calculation with tiered rates
 * - GST calculation (70% @ 12%, 30% @ 18%)
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
    // 1. Get organization's quote configuration
    const quoteConfig = await this.quoteConfigRepo.getOrCreateDefault(organizationId);

    // 2. Determine DCR/Non-DCR split based on subsidy eligibility
    const { dcrSizeKw, nonDcrSizeKw } = await this.calculateSystemSplit(
      organizationId,
      input.systemSizeKw,
      input.projectType,
      input.subsidyApplicable,
      input.dcrPreference || DcrPreference.AUTO_SPLIT,
    );

    // 3. Calculate panel configuration
    const panels = await this.calculatePanels(
      organizationId,
      dcrSizeKw,
      nonDcrSizeKw,
      input.preferredPanelBrand,
      quoteConfig,
    );

    // 4. Calculate inverter configuration (with combination logic)
    const inverters = await this.calculateInverters(
      organizationId,
      input.systemSizeKw,
      input.phaseType,
      input.preferredInverterBrand,
    );

    // 5. Calculate structure
    const structure = await this.calculateStructure(
      organizationId,
      input.systemSizeKw,
      input.structureType,
    );

    // 6. Calculate installation costs
    const installation = await this.calculateInstallation(
      organizationId,
      input.systemSizeKw,
      input.projectType,
      input.floorNumber || 0,
      input.distanceKm || 0,
    );

    // 7. Calculate subsidy
    const subsidy = await this.calculateSubsidy(
      organizationId,
      dcrSizeKw,
      input.projectType,
      input.subsidyApplicable,
    );

    // 8. Calculate pricing summary
    const pricing = this.calculatePricing(panels, inverters, structure, installation, quoteConfig);

    // 9. Calculate effective price
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
    // If customer explicitly wants only DCR or only Non-DCR
    if (dcrPreference === DcrPreference.DCR_ONLY) {
      return { dcrSizeKw: systemSizeKw, nonDcrSizeKw: 0 };
    }
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
   */
  private async calculatePanels(
    organizationId: string,
    dcrSizeKw: number,
    nonDcrSizeKw: number,
    preferredBrand: string | undefined,
    quoteConfig: QuoteConfiguration,
  ): Promise<CalculatedPanelConfig[]> {
    const panels: CalculatedPanelConfig[] = [];

    // Calculate DCR panels if needed
    if (dcrSizeKw > 0) {
      const dcrPanel = await this.findPanel(organizationId, true, preferredBrand);
      if (!dcrPanel) {
        throw new BadRequestException('No DCR panel found matching criteria');
      }
      const dcrConfig = await this.calculatePanelQuantity(
        dcrPanel,
        dcrSizeKw,
        organizationId,
        quoteConfig,
      );
      panels.push(dcrConfig);
    }

    // Calculate Non-DCR panels if needed
    if (nonDcrSizeKw > 0) {
      const nonDcrPanel = await this.findPanel(organizationId, false, preferredBrand);
      if (!nonDcrPanel) {
        throw new BadRequestException('No Non-DCR panel found matching criteria');
      }
      const nonDcrConfig = await this.calculatePanelQuantity(
        nonDcrPanel,
        nonDcrSizeKw,
        organizationId,
        quoteConfig,
      );
      panels.push(nonDcrConfig);
    }

    return panels;
  }

  /**
   * Find suitable panel based on DCR requirement and brand preference
   * Delegates to ProductRepository
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
    // Then apply wattage rounding configuration
    const nominalWattage = specs.wattage || (specs.minWattage + specs.maxWattage) / 2;
    const roundedWattage = this.roundWattage(nominalWattage, quoteConfig.wattageRounding);

    // Calculate number of panels needed
    const requiredWattage = requiredKw * 1000; // Convert to watts
    const panelCount = Math.ceil(requiredWattage / roundedWattage);
    const totalWattage = panelCount * roundedWattage;

    // Get pricing
    const pricingRule = await this.getPricingRule(organizationId, panel.id);
    const pricePerWatt = pricingRule?.formula?.pricePerWatt || 0;
    const gstRate = pricingRule?.formula?.gstRate || 12;

    const lineTotal = totalWattage * pricePerWatt;
    // Note: This per-item GST is for itemized display only
    // Final quote uses 70/30 GST split (see calculatePricing)
    const gstAmount = (lineTotal * gstRate) / 100;

    return {
      productId: panel.id,
      name: panel.name,
      brand: panel.brand || 'Unknown',
      isDcr: specs.isDcr,
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
   * Example: 547 → 550 (if 7 >= 5), 544 → 540 (if 4 < 5)
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
   * Handles cases like 60KW → 50KW + 10KW
   */
  private async calculateInverters(
    organizationId: string,
    systemSizeKw: number,
    phaseType: PhaseType,
    preferredBrand?: string,
  ): Promise<CalculatedInverterConfig> {
    // Get all available inverters for this phase type
    const availableInverters = await this.findInverters(organizationId, phaseType, preferredBrand);

    if (availableInverters.length === 0) {
      throw new BadRequestException(
        `No ${phaseType} inverters found${preferredBrand ? ` for brand ${preferredBrand}` : ''}`,
      );
    }

    // Find optimal combination
    const combination = this.findOptimalInverterCombination(
      availableInverters,
      systemSizeKw,
      organizationId,
    );

    // Calculate pricing for each inverter in combination
    const invertersWithPricing = await Promise.all(
      combination.map(async ({ inverter, quantity }) => {
        const pricingRule = await this.getPricingRule(organizationId, inverter.id);
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
   * Find available inverters
   * Delegates to ProductRepository
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
   * Prefers minimum number of inverters
   *
   * Algorithm:
   * 1. Sort inverters by capacity (largest first)
   * 2. Use greedy approach to fill required capacity
   * 3. If remaining capacity, find smallest suitable inverter
   */
  private findOptimalInverterCombination(
    inverters: ProductEntity[],
    requiredKw: number,
    _organizationId: string,
  ): Array<{ inverter: ProductEntity; quantity: number }> {
    // Sort by capacity descending (largest first)
    const sortedInverters = [...inverters].sort((a, b) => {
      const capA = Number(a.specifications?.inverter?.capacityKw || 0);
      const capB = Number(b.specifications?.inverter?.capacityKw || 0);
      return capB - capA;
    });

    let remainingKw = requiredKw;
    const combination: Array<{ inverter: ProductEntity; quantity: number }> = [];

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
      // Create a reversed copy (smallest first) - don't mutate original!
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
   * Calculate structure cost
   * Delegates product lookup to ProductRepository
   */
  private async calculateStructure(
    organizationId: string,
    systemSizeKw: number,
    structureType: StructureType,
  ): Promise<{
    productId: string;
    name: string;
    structureType: StructureType;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    gstAmount: number;
  }> {
    // Find structure product using repository - prefer matching structure type
    let structure = await this.productRepo.findMountingStructure(organizationId, structureType);

    // Fallback to any available structure if specific type not found
    if (!structure) {
      structure = await this.productRepo.findMountingStructure(organizationId);
    }

    if (!structure) {
      throw new BadRequestException(
        `No mounting structure found${structureType ? ` for type ${structureType}` : ''}`,
      );
    }

    // Get pricing using repository
    const pricingRule = await this.getPricingRule(organizationId, structure.id);
    const pricePerKw = pricingRule?.formula?.pricePerKw || 0;
    const gstRate = pricingRule?.formula?.gstRate || 18;

    const lineTotal = systemSizeKw * pricePerKw;
    const gstAmount = (lineTotal * gstRate) / 100;

    return {
      productId: structure.id,
      name: structure.name,
      structureType,
      quantity: systemSizeKw,
      unitPrice: pricePerKw,
      lineTotal,
      gstAmount,
    };
  }

  /**
   * Calculate installation costs
   */
  private async calculateInstallation(
    organizationId: string,
    systemSizeKw: number,
    projectType: ProjectType,
    floorNumber: number,
    distanceKm: number,
  ): Promise<CalculatedInstallationCost> {
    // Get installation pricing for this system size
    const pricing = await this.installationPricingRepo.findBySystemSize(
      organizationId,
      systemSizeKw,
      projectType,
    );

    if (!pricing) {
      // Return zero if no pricing configured
      return {
        electricalWork: 0,
        fixedMaterial: 0,
        variableFloor: 0,
        msedclCharges: 0,
        supervision: 0,
        transport: 0,
        totalBeforeTax: 0,
        gstAmount: 0,
        totalWithGst: 0,
      };
    }

    const electricalWork = Number(pricing.electricalWorkCost);
    const fixedMaterial = Number(pricing.fixedMaterialCost);
    const msedclCharges = Number(pricing.msedclCharges);
    const supervision = Number(pricing.supervisionCharges);
    const transport = distanceKm * Number(pricing.transportCostPerKm);

    // Calculate floor-based variable cost
    // Formula: baseFloorCost * (1 + incrementPercent * floorNumber / 100)
    // Example: Floor 3 with 5% increment: baseFloorCost * (1 + 0.15) = baseFloorCost * 1.15
    let variableFloor = 0;
    if (floorNumber > 0) {
      const baseFloorCost = Number(pricing.variableFloorCost);
      const incrementPercent = Number(pricing.floorIncrementPercent);
      // Total increment = incrementPercent * floorNumber
      // e.g., Floor 3 @ 5% = 15% increment
      variableFloor = baseFloorCost * (1 + (incrementPercent * floorNumber) / 100);
    }

    const totalBeforeTax =
      electricalWork + fixedMaterial + variableFloor + msedclCharges + supervision + transport;
    const gstRate = Number(pricing.gstRate);
    const gstAmount = (totalBeforeTax * gstRate) / 100;

    return {
      electricalWork,
      fixedMaterial,
      variableFloor,
      msedclCharges,
      supervision,
      transport,
      totalBeforeTax,
      gstAmount,
      totalWithGst: totalBeforeTax + gstAmount,
    };
  }

  /**
   * Calculate subsidy with tiered rates
   */
  private async calculateSubsidy(
    organizationId: string,
    dcrSizeKw: number,
    projectType: ProjectType,
    subsidyApplicable: boolean,
  ): Promise<CalculatedSubsidy> {
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

    return {
      isApplicable: true,
      schemeName: subsidyConfig.schemeName,
      eligibleKw: dcrSizeKw,
      amount: totalAmount,
      breakdown,
    };
  }

  /**
   * Calculate final pricing with GST split
   *
   * GST CALCULATION APPROACH:
   * - Individual components show their own GST for itemized display
   * - Final quote GST is calculated using configurable split (default: 70% @ 12%, 30% @ 18%)
   * - This split is used because solar projects have mixed components:
   *   - Civil/Installation work: 12% GST (70% of project typically)
   *   - Electrical components: 18% GST (30% of project typically)
   * - The split percentages are configurable per organization
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
    // rate1 = 12% GST rate, rate1Percentage = 70% of base (civil/installation)
    // rate2 = 18% GST rate, rate2Percentage = 30% of base (electrical)
    const { rate1, rate1Percentage, rate2, rate2Percentage } = quoteConfig.gstConfig;

    const civilBase = basePrice * (rate1Percentage / 100);
    const electricalBase = basePrice * (rate2Percentage / 100);

    const gst12Amount = (civilBase * rate1) / 100;
    const gst18Amount = (electricalBase * rate2) / 100;
    const totalGst = gst12Amount + gst18Amount;

    const totalPrice = basePrice + totalGst;

    return {
      basePrice,
      gst12Amount,
      gst18Amount,
      totalGst,
      totalPrice,
      discountAmount: 0, // Discount applied later by sales
      finalPrice: totalPrice,
    };
  }

  /**
   * Get pricing rule for a product
   * Delegates to PricingRuleRepository
   */
  private async getPricingRule(
    organizationId: string,
    productId: string,
  ): Promise<{
    formula: { pricePerWatt?: number; basePrice?: number; pricePerKw?: number; gstRate?: number };
  } | null> {
    return this.pricingRuleRepo.findByProductId(organizationId, productId);
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
