import { Test, TestingModule } from '@nestjs/testing';
import {
  ProjectType,
  PhaseType,
  DcrPreference,
  PanelTechnology,
  StructureType,
  ProductStatus,
  SubsidySchemeType,
} from '@tejas96/shared/types';

import { QuoteCalculatorService } from './quote-calculator.service';
import { ProductEntity } from '../../master-data/entities/product.entity';
import {
  ProductRepository,
  ProductPriceRepository,
  ProductTypeRepository,
  SubsidyConfigurationRepository,
  InstallationPricingRepository,
  QuoteConfigurationRepository,
} from '../../master-data/repositories';
import { PricingService } from '../../master-data/services/pricing.service';
import { CalculateQuoteDto } from '../dto/calculator';

describe('QuoteCalculatorService', () => {
  let service: QuoteCalculatorService;
  let productRepo: ProductRepository;
  let productPriceRepo: ProductPriceRepository;
  let subsidyConfigRepo: SubsidyConfigurationRepository;
  let installationPricingRepo: InstallationPricingRepository;
  let quoteConfigRepo: QuoteConfigurationRepository;

  // Mock data
  const mockProductType = { id: 'pt-solar-panel', code: 'solar_panel', name: 'Solar Panel' };
  const mockInverterType = { id: 'pt-inverter', code: 'inverter', name: 'Inverter' };
  const mockStructureType = {
    id: 'pt-structure',
    code: 'mounting_structure',
    name: 'Mounting Structure',
  };

  const mockDcrPanel: Partial<ProductEntity> = {
    id: 'panel-dcr-001',
    name: 'Adani PERC DCR 540W',
    productTypeId: mockProductType.id,
    brandId: 'brand-adani',
    brand: { id: 'brand-adani', name: 'Adani' } as any,
    status: ProductStatus.ACTIVE,
    specifications: {
      is_dcr: true,
      technology: PanelTechnology.PERC,
      wattage: 540,
      min_wattage: 530,
      max_wattage: 550,
    },
  };

  const mockNonDcrPanel: Partial<ProductEntity> = {
    id: 'panel-nondcr-001',
    name: 'Adani PERC Non-DCR 540W',
    productTypeId: mockProductType.id,
    brandId: 'brand-adani',
    brand: { id: 'brand-adani', name: 'Adani' } as any,
    status: ProductStatus.ACTIVE,
    specifications: {
      is_dcr: false,
      technology: PanelTechnology.PERC,
      wattage: 540,
      min_wattage: 530,
      max_wattage: 550,
    },
  };

  const mockInverter5kw: Partial<ProductEntity> = {
    id: 'inv-5kw-001',
    name: 'Sungrow 5KW 1-Phase',
    productTypeId: mockInverterType.id,
    brandId: 'brand-sungrow',
    brand: { id: 'brand-sungrow', name: 'Sungrow' } as any,
    status: ProductStatus.ACTIVE,
    specifications: {
      capacity_kw: 5,
      phase_type: PhaseType.SINGLE_PHASE,
      min_system_size_kw: 4,
      max_system_size_kw: 7,
    },
  };

  const mockStructure: Partial<ProductEntity> = {
    id: 'struct-001',
    name: 'Aluminum Rail Mount',
    productTypeId: mockStructureType.id,
    brandId: 'brand-generic',
    brand: { id: 'brand-generic', name: 'Generic' } as any,
    status: ProductStatus.ACTIVE,
    specifications: {
      structure_type: StructureType.ALUMINUM_RAIL,
      material: 'Aluminum',
    },
  };

  const mockProductPrice = {
    id: 'price-001',
    productId: 'panel-dcr-001',
    unitPrice: 24,
    gstRate: 12,
    costMultiplier: 1,
    isActive: true,
  };

  const mockSubsidyConfig = {
    id: 'subsidy-001',
    schemeName: 'PM Surya Ghar',
    schemeType: SubsidySchemeType.PM_SURYA_GHAR,
    projectType: ProjectType.RESIDENTIAL,
    maxSubsidyKw: 3,
    requiresDcr: true,
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
    transportRatePerKm: 35,
    gstRate: 18,
    costComponents: {
      fixed_material: 8500,
      msedcl_charges: 2000,
      variable_floor: 1516,
      electrical_work: 6500,
      loading_unloading: 2000,
      installation_labor: 3500,
      struct_rcc_elevated: 7000,
      struct_super_ground: 12500,
      struct_aluminum_rail: 3500,
      transport: 35,
    },
    getDisplayLabel: () => '3-5KW',
    getFixedCostsTotal: () => 28000,
    getVariableFloorBase: () => 1516,
    getCostComponentKeys: () => Object.keys(mockInstallationPricing.costComponents),
  };

  const mockQuoteConfig = {
    id: 'config-001',
    defaultValidityDays: 30,
    maxVersions: 3,
    defaultCompletionWeeks: 4,
    gstConfig: {
      rate1: 5,
      rate1Percentage: 70,
      rate2: 18,
      rate2Percentage: 30,
    },
    paymentMilestones: [],
    showInventoryStock: true,
    profitMarginTiers: [],
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
          provide: ProductPriceRepository,
          useValue: {
            findActiveForProduct: jest.fn(),
            findActiveForProducts: jest.fn(),
          },
        },
        {
          provide: ProductTypeRepository,
          useValue: {
            findByCode: jest.fn().mockImplementation((code: string) => {
              if (code === 'solar_panel') return Promise.resolve(mockProductType);
              if (code === 'inverter') return Promise.resolve(mockInverterType);
              if (code === 'mounting_structure') return Promise.resolve(mockStructureType);
              return Promise.resolve(null);
            }),
          },
        },
        {
          provide: SubsidyConfigurationRepository,
          useValue: {
            findAllActiveByProjectType: jest.fn(),
            findByIds: jest.fn(),
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
        {
          // Adapter mock: forwards to ProductPriceRepository mock so legacy
          // tests that mockResolvedValue on findActiveForProduct keep working.
          // Returned shape matches the resolver contract; the calculator's
          // internal helpers translate it back to { unitPrice, gstRate,
          // costMultiplier } byte-identical to the pre-refactor path.
          provide: PricingService,
          useFactory: (priceRepo: ProductPriceRepository) => ({
            getEffectiveUnitPrice: async (
              productId: string,
              opts: { projectType?: string } = {},
            ) => {
              const price: any = await priceRepo.findActiveForProduct(productId, opts.projectType);
              if (!price) {
                return {
                  productId,
                  unitPricePerPiece: null,
                  basePrice: null,
                  costMultiplier: null,
                  currency: 'INR',
                  basis: 'per_unit',
                  source: 'none',
                };
              }
              return {
                productId,
                unitPricePerPiece: Number(price.unitPrice),
                basePrice: Number(price.unitPrice),
                costMultiplier: Number(price.costMultiplier ?? 1),
                gstRate: price.gstRate != null ? Number(price.gstRate) : undefined,
                currency: 'INR',
                basis: 'per_unit',
                source: 'product_prices',
              };
            },
            getEffectiveUnitPrices: async (
              productIds: string[],
              opts: { projectType?: string } = {},
            ) => {
              const map: Map<string, any> = await priceRepo.findActiveForProducts(
                productIds,
                opts.projectType,
              );
              const out = new Map<string, any>();
              for (const id of productIds) {
                const price: any = map?.get?.(id);
                if (!price) {
                  out.set(id, {
                    productId: id,
                    unitPricePerPiece: null,
                    basePrice: null,
                    costMultiplier: null,
                    currency: 'INR',
                    basis: 'per_unit',
                    source: 'none',
                  });
                  continue;
                }
                out.set(id, {
                  productId: id,
                  unitPricePerPiece: Number(price.unitPrice),
                  basePrice: Number(price.unitPrice),
                  costMultiplier: Number(price.costMultiplier ?? 1),
                  gstRate: price.gstRate != null ? Number(price.gstRate) : undefined,
                  currency: 'INR',
                  basis: 'per_unit',
                  source: 'product_prices',
                });
              }
              return out;
            },
          }),
          inject: [ProductPriceRepository],
        },
      ],
    }).compile();

    service = module.get<QuoteCalculatorService>(QuoteCalculatorService);
    productRepo = module.get<ProductRepository>(ProductRepository);
    productPriceRepo = module.get<ProductPriceRepository>(ProductPriceRepository);
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
        .spyOn(subsidyConfigRepo, 'findAllActiveByProjectType')
        .mockResolvedValue([mockSubsidyConfig] as any);
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

      // Mock product price - use findActiveForProduct
      jest
        .spyOn(productPriceRepo, 'findActiveForProduct')
        .mockResolvedValue(mockProductPrice as any);

      const input: CalculateQuoteDto = {
        customerId: 'customer-001',
        projectType: ProjectType.RESIDENTIAL,
        systemSizeKw: 5,
        phaseType: PhaseType.SINGLE_PHASE,
        subsidyApplicable: true,
        dcrPreference: DcrPreference.DCR_ONLY,
        structureType: StructureType.ALUMINUM_RAIL,
        floorNumber: 0,
        distanceKm: 30,
      };

      const result = await service.calculateQuote(input);

      // Verify system is all DCR (no split)
      expect(result.systemConfig.totalSystemSizeKw).toBe(5);
      expect(result.systemConfig.dcrSizeKw).toBe(5);
      expect(result.systemConfig.nonDcrSizeKw).toBe(0);

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
        .spyOn(subsidyConfigRepo, 'findAllActiveByProjectType')
        .mockResolvedValue([mockSubsidyConfig] as any);
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

      // Mock product price
      jest
        .spyOn(productPriceRepo, 'findActiveForProduct')
        .mockResolvedValue(mockProductPrice as any);

      const input: CalculateQuoteDto = {
        customerId: 'customer-001',
        projectType: ProjectType.RESIDENTIAL,
        systemSizeKw: 5,
        phaseType: PhaseType.SINGLE_PHASE,
        subsidyApplicable: true,
        dcrPreference: DcrPreference.DCR_ONLY,
        structureType: StructureType.ALUMINUM_RAIL,
      };

      const result = await service.calculateQuote(input);

      // All DCR, no Non-DCR
      expect(result.systemConfig.dcrSizeKw).toBe(5);
      expect(result.systemConfig.nonDcrSizeKw).toBe(0);
    });

    it('should use Non-DCR panels when NON_DCR_ONLY preference is set', async () => {
      jest.spyOn(quoteConfigRepo, 'getOrCreateDefault').mockResolvedValue(mockQuoteConfig as any);
      jest.spyOn(subsidyConfigRepo, 'findAllActiveByProjectType').mockResolvedValue([]);
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

      // Mock product price
      jest
        .spyOn(productPriceRepo, 'findActiveForProduct')
        .mockResolvedValue(mockProductPrice as any);

      const input: CalculateQuoteDto = {
        customerId: 'customer-001',
        projectType: ProjectType.RESIDENTIAL,
        systemSizeKw: 5,
        phaseType: PhaseType.SINGLE_PHASE,
        subsidyApplicable: false,
        dcrPreference: DcrPreference.NON_DCR_ONLY,
        structureType: StructureType.ALUMINUM_RAIL,
      };

      const result = await service.calculateQuote(input);

      // All Non-DCR when NON_DCR_ONLY preference is set
      expect(result.systemConfig.dcrSizeKw).toBe(0);
      expect(result.systemConfig.nonDcrSizeKw).toBe(5);
      expect(result.subsidy.isApplicable).toBe(false);
      expect(result.subsidy.amount).toBe(0);
    });
  });

  describe('subsidy calculation', () => {
    it('should calculate tiered subsidy correctly for 3KW', () => {
      // Call the private method directly with the mock config
      const result = (service as any).calculateSubsidyFromConfigs(
        [mockSubsidyConfig],
        3, // dcrSizeKw
        3, // totalSystemSizeKw
        true, // subsidyApplicable
      );

      // Tier 1: 0-2KW @ 30000 = 60000
      // Tier 2: 2-3KW @ 18000 = 18000
      // Total: 78000
      expect(result.isApplicable).toBe(true);
      expect(result.amount).toBe(78000);
      expect(result.schemes[0].breakdown?.length).toBe(2);
    });

    it('should calculate partial tier subsidy for 2.5KW', () => {
      const result = (service as any).calculateSubsidyFromConfigs(
        [mockSubsidyConfig],
        2.5, // dcrSizeKw
        2.5, // totalSystemSizeKw
        true, // subsidyApplicable
      );

      // Tier 1: 0-2KW @ 30000 = 60000
      // Tier 2: 2-2.5KW @ 18000 = 9000 (0.5KW only)
      // Total: 69000
      expect(result.isApplicable).toBe(true);
      expect(result.amount).toBe(69000);
      expect(result.schemes[0].breakdown?.length).toBe(2);
      expect(result.schemes[0].breakdown?.[0].kw).toBe(2);
      expect(result.schemes[0].breakdown?.[0].amount).toBe(60000);
      expect(result.schemes[0].breakdown?.[1].kw).toBe(0.5);
      expect(result.schemes[0].breakdown?.[1].amount).toBe(9000);
    });

    it('should return zero subsidy when not applicable', () => {
      const result = (service as any).calculateSubsidyFromConfigs(
        [mockSubsidyConfig],
        5, // dcrSizeKw
        5, // totalSystemSizeKw
        false, // subsidyApplicable = false
      );

      expect(result.isApplicable).toBe(false);
      expect(result.amount).toBe(0);
    });
  });

  // TODO: Update tests to match new calculateInstallationCosts signature
  describe.skip('floor cost calculation', () => {
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
        5,
        ProjectType.RESIDENTIAL,
        1, // floor 1
        0,
      );
      expect(floor1Result.variableFloor).toBeCloseTo(1575, 2);

      // Floor 2: 1500 * (1 + 0.10) = 1650
      const floor2Result = await (service as any).calculateInstallation(
        5,
        ProjectType.RESIDENTIAL,
        2, // floor 2
        0,
      );
      expect(floor2Result.variableFloor).toBeCloseTo(1650, 2);

      // Floor 3: 1500 * (1 + 0.15) = 1725
      const floor3Result = await (service as any).calculateInstallation(
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
        { id: 'inv-50', specifications: { capacity_kw: 50 } },
        { id: 'inv-30', specifications: { capacity_kw: 30 } },
        { id: 'inv-20', specifications: { capacity_kw: 20 } },
        { id: 'inv-10', specifications: { capacity_kw: 10 } },
      ] as ProductEntity[];

      const result = (service as any).findOptimalInverterCombination(mockInverters, 60);

      expect(result.length).toBe(2);
      const totalCapacity = result.reduce(
        (sum: number, item: { inverter: ProductEntity; quantity: number }) =>
          sum + Number(item.inverter.specifications?.capacity_kw || 0) * item.quantity,
        0,
      );
      expect(totalCapacity).toBeGreaterThanOrEqual(60);
    });

    it('should handle exact capacity match', () => {
      const mockInverters = [
        { id: 'inv-10', specifications: { capacity_kw: 10 } },
        { id: 'inv-5', specifications: { capacity_kw: 5 } },
      ] as ProductEntity[];

      const result = (service as any).findOptimalInverterCombination(mockInverters, 10);

      expect(result.length).toBe(1);
      expect(result[0].inverter.id).toBe('inv-10');
      expect(result[0].quantity).toBe(1);
    });

    it('should handle multiple same-capacity inverters', () => {
      const mockInverters = [
        { id: 'inv-10', specifications: { capacity_kw: 10 } },
      ] as ProductEntity[];

      // 30KW system: should use 3x 10KW
      const result = (service as any).findOptimalInverterCombination(mockInverters, 30);

      expect(result.length).toBe(1);
      expect(result[0].inverter.id).toBe('inv-10');
      expect(result[0].quantity).toBe(3);
    });
  });

  // TODO: Update tests to match new calculatePanelQuantity signature
  describe.skip('panel wattage calculation', () => {
    it('should use nominal wattage when available', async () => {
      const panelWithNominal = {
        ...mockDcrPanel,
        specifications: {
          is_dcr: true,
          technology: PanelTechnology.PERC,
          wattage: 545,
          min_wattage: 530,
          max_wattage: 560,
        },
      };

      jest
        .spyOn(productRepo, 'findSolarPanel')
        .mockResolvedValue(panelWithNominal as ProductEntity);
      jest
        .spyOn(productPriceRepo, 'findActiveForProduct')
        .mockResolvedValue(mockProductPrice as any);

      const result = await (service as any).calculatePanelQuantity(
        panelWithNominal,
        3, // 3KW
        ProjectType.RESIDENTIAL,
      );

      expect(result.wattagePerPanel).toBe(545);
    });
  });
});
