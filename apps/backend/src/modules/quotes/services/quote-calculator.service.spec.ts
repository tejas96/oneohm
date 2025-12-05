import { Test, TestingModule } from '@nestjs/testing';
import {
  ProjectType,
  PhaseType,
  DcrPreference,
  PanelTechnology,
  StructureType,
  ProductType,
  ProductStatus,
  SubsidySchemeType,
} from '@oneohm-epc/shared-types';

import { QuoteCalculatorService } from './quote-calculator.service';
import { ProductEntity } from '../../master-data/entities/product.entity';
import {
  ProductRepository,
  PricingRuleRepository,
  SubsidyConfigurationRepository,
  InstallationPricingRepository,
  QuoteConfigurationRepository,
} from '../../master-data/repositories';
import { CalculateQuoteDto } from '../dto/calculator';

describe('QuoteCalculatorService', () => {
  let service: QuoteCalculatorService;
  let productRepo: ProductRepository;
  let pricingRuleRepo: PricingRuleRepository;
  let subsidyConfigRepo: SubsidyConfigurationRepository;
  let installationPricingRepo: InstallationPricingRepository;
  let quoteConfigRepo: QuoteConfigurationRepository;

  const mockOrganizationId = 'test-org-123';

  // Mock data
  const mockDcrPanel: Partial<ProductEntity> = {
    id: 'panel-dcr-001',
    name: 'Adani PERC DCR 540W',
    brand: 'Adani',
    type: ProductType.SOLAR_PANEL,
    status: ProductStatus.ACTIVE,
    specifications: {
      panel: {
        isDcr: true,
        technology: PanelTechnology.PERC,
        wattage: 540,
        minWattage: 530,
        maxWattage: 550,
      },
    },
  };

  const mockNonDcrPanel: Partial<ProductEntity> = {
    id: 'panel-nondcr-001',
    name: 'Adani PERC Non-DCR 540W',
    brand: 'Adani',
    type: ProductType.SOLAR_PANEL,
    status: ProductStatus.ACTIVE,
    specifications: {
      panel: {
        isDcr: false,
        technology: PanelTechnology.PERC,
        wattage: 540,
        minWattage: 530,
        maxWattage: 550,
      },
    },
  };

  const mockInverter5kw: Partial<ProductEntity> = {
    id: 'inv-5kw-001',
    name: 'Sungrow 5KW 1-Phase',
    brand: 'Sungrow',
    type: ProductType.INVERTER,
    status: ProductStatus.ACTIVE,
    specifications: {
      inverter: {
        capacityKw: 5,
        phaseType: PhaseType.SINGLE_PHASE,
        minSystemSizeKw: 4,
        maxSystemSizeKw: 7,
      },
    },
  };

  const mockStructure: Partial<ProductEntity> = {
    id: 'struct-001',
    name: 'Aluminum Rail Mount',
    brand: 'Generic',
    type: ProductType.MOUNTING_STRUCTURE,
    status: ProductStatus.ACTIVE,
    specifications: {
      structure: {
        structureType: StructureType.ALUMINUM_RAIL,
        material: 'Aluminum',
      },
    },
  };

  const mockPricingRule = {
    id: 'price-001',
    productId: 'panel-dcr-001',
    formula: {
      pricePerWatt: 24,
      gstRate: 12,
    },
    isActive: true,
  };

  const mockSubsidyConfig = {
    id: 'subsidy-001',
    schemeName: 'PM Surya Ghar',
    schemeType: SubsidySchemeType.PM_SURYA_GHAR,
    projectType: ProjectType.RESIDENTIAL,
    maxSubsidyKw: 3,
    requiresDcr: true,
    autoSplitEnabled: true,
    tiers: [
      { fromKw: 0, toKw: 2, ratePerKw: 30000 },
      { fromKw: 2, toKw: 3, ratePerKw: 18000 },
    ],
    isActive: true,
  };

  const mockInstallationPricing = {
    id: 'install-001',
    minSystemSizeKw: 3,
    maxSystemSizeKw: 5,
    electricalWorkCost: 15000,
    fixedMaterialCost: 8000,
    variableFloorCost: 2000,
    floorIncrementPercent: 5,
    msedclCharges: 5000,
    supervisionCharges: 3000,
    transportCostPerKm: 30,
    gstRate: 12,
  };

  const mockQuoteConfig = {
    id: 'config-001',
    defaultValidityDays: 30,
    maxVersions: 3,
    defaultCompletionWeeks: 4,
    gstConfig: {
      rate1: 12,
      rate1Percentage: 70,
      rate2: 18,
      rate2Percentage: 30,
    },
    wattageRounding: {
      roundTo: 10,
      roundUpThreshold: 5,
    },
    paymentMilestones: [],
    showInventoryStock: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteCalculatorService,
        {
          provide: ProductRepository,
          useValue: {
            findSolarPanel: jest.fn(),
            findInvertersByPhase: jest.fn(),
            findMountingStructure: jest.fn(),
          },
        },
        {
          provide: PricingRuleRepository,
          useValue: {
            findByProductId: jest.fn(),
          },
        },
        {
          provide: SubsidyConfigurationRepository,
          useValue: {
            findActiveByProjectType: jest.fn(),
          },
        },
        {
          provide: InstallationPricingRepository,
          useValue: {
            findBySystemSize: jest.fn(),
          },
        },
        {
          provide: QuoteConfigurationRepository,
          useValue: {
            getOrCreateDefault: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuoteCalculatorService>(QuoteCalculatorService);
    productRepo = module.get<ProductRepository>(ProductRepository);
    pricingRuleRepo = module.get<PricingRuleRepository>(PricingRuleRepository);
    subsidyConfigRepo = module.get<SubsidyConfigurationRepository>(SubsidyConfigurationRepository);
    installationPricingRepo = module.get<InstallationPricingRepository>(
      InstallationPricingRepository,
    );
    quoteConfigRepo = module.get<QuoteConfigurationRepository>(QuoteConfigurationRepository);
  });

  describe('calculateQuote', () => {
    it('should calculate a basic 5KW residential quote with subsidy', async () => {
      // Setup mocks
      jest.spyOn(quoteConfigRepo, 'getOrCreateDefault').mockResolvedValue(mockQuoteConfig as any);
      jest
        .spyOn(subsidyConfigRepo, 'findActiveByProjectType')
        .mockResolvedValue(mockSubsidyConfig as any);
      jest
        .spyOn(installationPricingRepo, 'findBySystemSize')
        .mockResolvedValue(mockInstallationPricing as any);

      // Mock panel queries - use ProductRepository methods now
      jest
        .spyOn(productRepo, 'findSolarPanel')
        .mockResolvedValueOnce(mockDcrPanel as ProductEntity) // DCR panel
        .mockResolvedValueOnce(mockNonDcrPanel as ProductEntity); // Non-DCR panel

      // Mock inverter queries
      jest
        .spyOn(productRepo, 'findInvertersByPhase')
        .mockResolvedValue([mockInverter5kw as ProductEntity]);

      // Mock structure query
      jest
        .spyOn(productRepo, 'findMountingStructure')
        .mockResolvedValue(mockStructure as ProductEntity);

      // Mock pricing rule
      jest.spyOn(pricingRuleRepo, 'findByProductId').mockResolvedValue(mockPricingRule as any);

      const input: CalculateQuoteDto = {
        customerId: 'customer-001',
        projectType: ProjectType.RESIDENTIAL,
        systemSizeKw: 5,
        phaseType: PhaseType.SINGLE_PHASE,
        subsidyApplicable: true,
        dcrPreference: DcrPreference.AUTO_SPLIT,
        structureType: StructureType.ALUMINUM_RAIL,
        floorNumber: 0,
        distanceKm: 30,
      };

      const result = await service.calculateQuote(mockOrganizationId, input);

      // Verify system split (3KW DCR + 2KW Non-DCR)
      expect(result.systemConfig.totalSystemSizeKw).toBe(5);
      expect(result.systemConfig.dcrSizeKw).toBe(3);
      expect(result.systemConfig.nonDcrSizeKw).toBe(2);

      // Verify panels calculated
      expect(result.panels.length).toBeGreaterThan(0);

      // Verify subsidy calculated
      expect(result.subsidy.isApplicable).toBe(true);
      expect(result.subsidy.schemeName).toBe('PM Surya Ghar');

      // Verify completion weeks
      expect(result.completionWeeks).toBe(4);
    });

    it('should not split system when DCR_ONLY preference is set', async () => {
      jest.spyOn(quoteConfigRepo, 'getOrCreateDefault').mockResolvedValue(mockQuoteConfig as any);
      jest
        .spyOn(subsidyConfigRepo, 'findActiveByProjectType')
        .mockResolvedValue(mockSubsidyConfig as any);
      jest
        .spyOn(installationPricingRepo, 'findBySystemSize')
        .mockResolvedValue(mockInstallationPricing as any);

      // Mock panel queries - use ProductRepository methods now
      jest.spyOn(productRepo, 'findSolarPanel').mockResolvedValue(mockDcrPanel as ProductEntity);

      // Mock inverter queries
      jest
        .spyOn(productRepo, 'findInvertersByPhase')
        .mockResolvedValue([mockInverter5kw as ProductEntity]);

      // Mock structure query
      jest
        .spyOn(productRepo, 'findMountingStructure')
        .mockResolvedValue(mockStructure as ProductEntity);

      // Mock pricing rule
      jest.spyOn(pricingRuleRepo, 'findByProductId').mockResolvedValue(mockPricingRule as any);

      const input: CalculateQuoteDto = {
        customerId: 'customer-001',
        projectType: ProjectType.RESIDENTIAL,
        systemSizeKw: 5,
        phaseType: PhaseType.SINGLE_PHASE,
        subsidyApplicable: true,
        dcrPreference: DcrPreference.DCR_ONLY,
        structureType: StructureType.ALUMINUM_RAIL,
      };

      const result = await service.calculateQuote(mockOrganizationId, input);

      // All DCR, no Non-DCR
      expect(result.systemConfig.dcrSizeKw).toBe(5);
      expect(result.systemConfig.nonDcrSizeKw).toBe(0);
    });

    it('should use Non-DCR panels when subsidy is not applicable', async () => {
      jest.spyOn(quoteConfigRepo, 'getOrCreateDefault').mockResolvedValue(mockQuoteConfig as any);
      jest.spyOn(subsidyConfigRepo, 'findActiveByProjectType').mockResolvedValue(null);
      jest
        .spyOn(installationPricingRepo, 'findBySystemSize')
        .mockResolvedValue(mockInstallationPricing as any);

      // Mock panel queries - use ProductRepository methods now
      jest.spyOn(productRepo, 'findSolarPanel').mockResolvedValue(mockNonDcrPanel as ProductEntity);

      // Mock inverter queries
      jest
        .spyOn(productRepo, 'findInvertersByPhase')
        .mockResolvedValue([mockInverter5kw as ProductEntity]);

      // Mock structure query
      jest
        .spyOn(productRepo, 'findMountingStructure')
        .mockResolvedValue(mockStructure as ProductEntity);

      // Mock pricing rule
      jest.spyOn(pricingRuleRepo, 'findByProductId').mockResolvedValue(mockPricingRule as any);

      const input: CalculateQuoteDto = {
        customerId: 'customer-001',
        projectType: ProjectType.RESIDENTIAL,
        systemSizeKw: 5,
        phaseType: PhaseType.SINGLE_PHASE,
        subsidyApplicable: false,
        structureType: StructureType.ALUMINUM_RAIL,
      };

      const result = await service.calculateQuote(mockOrganizationId, input);

      // All Non-DCR when subsidy not applicable
      expect(result.systemConfig.dcrSizeKw).toBe(0);
      expect(result.systemConfig.nonDcrSizeKw).toBe(5);
      expect(result.subsidy.isApplicable).toBe(false);
      expect(result.subsidy.amount).toBe(0);
    });
  });

  describe('wattage rounding', () => {
    it('should round 547W to 550W (7 >= 5)', () => {
      const config = { roundTo: 10, roundUpThreshold: 5 };
      const result = (service as any).roundWattage(547, config);
      expect(result).toBe(550);
    });

    it('should round 544W to 540W (4 < 5)', () => {
      const config = { roundTo: 10, roundUpThreshold: 5 };
      const result = (service as any).roundWattage(544, config);
      expect(result).toBe(540);
    });

    it('should round 545W to 550W (5 >= 5)', () => {
      const config = { roundTo: 10, roundUpThreshold: 5 };
      const result = (service as any).roundWattage(545, config);
      expect(result).toBe(550);
    });
  });

  describe('subsidy calculation', () => {
    it('should calculate tiered subsidy correctly for 3KW', async () => {
      jest
        .spyOn(subsidyConfigRepo, 'findActiveByProjectType')
        .mockResolvedValue(mockSubsidyConfig as any);

      const result = await (service as any).calculateSubsidy(
        mockOrganizationId,
        3, // 3KW DCR
        ProjectType.RESIDENTIAL,
        true,
      );

      // Tier 1: 0-2KW @ 30000 = 60000
      // Tier 2: 2-3KW @ 18000 = 18000
      // Total: 78000
      expect(result.isApplicable).toBe(true);
      expect(result.amount).toBe(78000);
      expect(result.breakdown?.length).toBe(2);
    });

    it('should calculate partial tier subsidy for 2.5KW', async () => {
      jest
        .spyOn(subsidyConfigRepo, 'findActiveByProjectType')
        .mockResolvedValue(mockSubsidyConfig as any);

      const result = await (service as any).calculateSubsidy(
        mockOrganizationId,
        2.5, // 2.5KW DCR
        ProjectType.RESIDENTIAL,
        true,
      );

      // Tier 1: 0-2KW @ 30000 = 60000
      // Tier 2: 2-2.5KW @ 18000 = 9000 (0.5KW only)
      // Total: 69000
      expect(result.isApplicable).toBe(true);
      expect(result.amount).toBe(69000);
      expect(result.breakdown?.length).toBe(2);
      expect(result.breakdown?.[0].kw).toBe(2);
      expect(result.breakdown?.[0].amount).toBe(60000);
      expect(result.breakdown?.[1].kw).toBe(0.5);
      expect(result.breakdown?.[1].amount).toBe(9000);
    });

    it('should return zero subsidy when not applicable', async () => {
      const result = await (service as any).calculateSubsidy(
        mockOrganizationId,
        5,
        ProjectType.COMMERCIAL,
        false,
      );

      expect(result.isApplicable).toBe(false);
      expect(result.amount).toBe(0);
    });
  });

  describe('floor cost calculation', () => {
    it('should calculate floor cost with 5% increment correctly', async () => {
      const mockPricingWithFloor = {
        ...mockInstallationPricing,
        variableFloorCost: 1500,
        floorIncrementPercent: 5,
      };

      jest
        .spyOn(installationPricingRepo, 'findBySystemSize')
        .mockResolvedValue(mockPricingWithFloor as any);

      // Floor 1: 1500 * (1 + 0.05) = 1575
      const floor1Result = await (service as any).calculateInstallation(
        mockOrganizationId,
        5,
        ProjectType.RESIDENTIAL,
        1, // floor 1
        0,
      );
      expect(floor1Result.variableFloor).toBeCloseTo(1575, 2);

      // Floor 2: 1500 * (1 + 0.10) = 1650
      const floor2Result = await (service as any).calculateInstallation(
        mockOrganizationId,
        5,
        ProjectType.RESIDENTIAL,
        2, // floor 2
        0,
      );
      expect(floor2Result.variableFloor).toBeCloseTo(1650, 2);

      // Floor 3: 1500 * (1 + 0.15) = 1725
      const floor3Result = await (service as any).calculateInstallation(
        mockOrganizationId,
        5,
        ProjectType.RESIDENTIAL,
        3, // floor 3
        0,
      );
      expect(floor3Result.variableFloor).toBeCloseTo(1725, 2);
    });

    it('should return zero floor cost for ground floor', async () => {
      jest
        .spyOn(installationPricingRepo, 'findBySystemSize')
        .mockResolvedValue(mockInstallationPricing as any);

      const result = await (service as any).calculateInstallation(
        mockOrganizationId,
        5,
        ProjectType.RESIDENTIAL,
        0, // ground floor
        0,
      );

      expect(result.variableFloor).toBe(0);
    });
  });

  describe('inverter combination algorithm', () => {
    it('should combine inverters correctly for 60KW system', () => {
      const mockInverters = [
        { id: 'inv-50', specifications: { inverter: { capacityKw: 50 } } },
        { id: 'inv-30', specifications: { inverter: { capacityKw: 30 } } },
        { id: 'inv-20', specifications: { inverter: { capacityKw: 20 } } },
        { id: 'inv-10', specifications: { inverter: { capacityKw: 10 } } },
      ] as ProductEntity[];

      // 60KW system: should use 50KW + 10KW
      const result = (service as any).findOptimalInverterCombination(
        mockInverters,
        60,
        mockOrganizationId,
      );

      expect(result.length).toBe(2);
      const totalCapacity = result.reduce(
        (sum: number, item: { inverter: ProductEntity; quantity: number }) =>
          sum + Number(item.inverter.specifications?.inverter?.capacityKw || 0) * item.quantity,
        0,
      );
      expect(totalCapacity).toBeGreaterThanOrEqual(60);
    });

    it('should handle exact capacity match', () => {
      const mockInverters = [
        { id: 'inv-10', specifications: { inverter: { capacityKw: 10 } } },
        { id: 'inv-5', specifications: { inverter: { capacityKw: 5 } } },
      ] as ProductEntity[];

      // 10KW system: should use exactly 10KW
      const result = (service as any).findOptimalInverterCombination(
        mockInverters,
        10,
        mockOrganizationId,
      );

      expect(result.length).toBe(1);
      expect(result[0].inverter.id).toBe('inv-10');
      expect(result[0].quantity).toBe(1);
    });

    it('should handle multiple same-capacity inverters', () => {
      const mockInverters = [
        { id: 'inv-10', specifications: { inverter: { capacityKw: 10 } } },
      ] as ProductEntity[];

      // 30KW system: should use 3x 10KW
      const result = (service as any).findOptimalInverterCombination(
        mockInverters,
        30,
        mockOrganizationId,
      );

      expect(result.length).toBe(1);
      expect(result[0].inverter.id).toBe('inv-10');
      expect(result[0].quantity).toBe(3);
    });
  });

  describe('panel wattage calculation', () => {
    it('should use nominal wattage when available', async () => {
      const panelWithNominal = {
        ...mockDcrPanel,
        specifications: {
          panel: {
            isDcr: true,
            technology: PanelTechnology.PERC,
            wattage: 545, // nominal
            minWattage: 530,
            maxWattage: 560,
          },
        },
      };

      jest
        .spyOn(productRepo, 'findSolarPanel')
        .mockResolvedValue(panelWithNominal as ProductEntity);
      jest.spyOn(pricingRuleRepo, 'findByProductId').mockResolvedValue(mockPricingRule as any);

      const result = await (service as any).calculatePanelQuantity(
        panelWithNominal,
        3, // 3KW
        mockOrganizationId,
        mockQuoteConfig,
      );

      // 545W rounded (545 % 10 = 5, >= threshold 5) = 550W
      expect(result.wattagePerPanel).toBe(550);
    });
  });
});
