import type {
  ProjectType,
  PhaseType,
  DcrPreference,
  StructureType,
  PanelTechnology,
  PaymentMilestone as SharedPaymentMilestone,
} from '@oneohm-epc/shared-types';

// ============================================================================
// Request Types (mirrors backend CalculateQuoteDto)
// ============================================================================

export interface PanelOverride {
  productId: string;
  quantity: number;
}

export interface InverterOverride {
  productId: string;
  quantity: number;
}

export interface CalculateQuoteRequest {
  customerId: string;
  propertyId?: string;
  projectType: ProjectType;
  systemSizeKw: number;
  phaseType: PhaseType;
  subsidyApplicable: boolean;
  dcrPreference?: DcrPreference;
  preferredPanelBrand?: string;
  preferredPanelTechnology?: PanelTechnology;
  preferredPanelWattage?: number;
  preferredInverterBrand?: string;
  structureType: StructureType;
  floorNumber?: number;
  distanceKm?: number;
  panelOverrides?: PanelOverride[];
  inverterOverrides?: InverterOverride[];
  manualInverterCount?: number;
  manualDcrPanelCount?: number;
  manualNonDcrPanelCount?: number;
}

/**
 * Extends CalculateQuoteRequest with save-only fields
 * Mirrors backend CreateQuoteFromCalculationDto
 */
export interface CreateFromCalculationRequest extends CalculateQuoteRequest {
  discountAmount?: number;
  internalNotes?: string;
  customerNotes?: string;
  salesPersonId?: string;
  resellerId?: string;
  paymentMilestones?: SharedPaymentMilestone[];
}

// ============================================================================
// Response Types (mirrors backend CalculateQuoteResponseDto)
// ============================================================================

export interface SystemConfig {
  totalSystemSizeKw: number;
  dcrSizeKw: number;
  nonDcrSizeKw: number;
  phaseType: PhaseType;
}

export interface CalculatedPanel {
  productId: string;
  name: string;
  brand: string;
  isDcr: boolean;
  technology?: PanelTechnology;
  wattagePerPanel: number;
  quantity: number;
  totalWattage: number;
  pricePerWatt: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
  productWarrantyYears?: number;
  performanceWarrantyYears?: number;
}

export interface InverterItem {
  productId: string;
  name: string;
  brand: string;
  capacityKw: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
  productWarrantyYears?: number;
}

export interface CalculatedInverter {
  inverters: InverterItem[];
  totalCapacityKw: number;
  totalCost: number;
  totalGst: number;
}

export interface CalculatedStructure {
  productId: string;
  name: string;
  structureType: StructureType;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
}

export interface CalculatedInstallation {
  electricalWork: number;
  fixedMaterial: number;
  variableFloor: number;
  structureCost: number;
  installationLabor: number;
  loadingUnloading: number;
  msedclCharges: number;
  supervision: number;
  transport: number;
  totalBeforeTax: number;
  gstAmount: number;
  gstRate?: number;
  totalWithGst: number;
  breakdown?: Record<string, number>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SubsidyBreakdown {
  fromKw: number;
  toKw: number;
  kw: number;
  ratePerKw: number;
  amount: number;
}

export interface CalculatedSubsidy {
  isApplicable: boolean;
  schemeName?: string;
  eligibleKw?: number;
  amount: number;
  breakdown?: SubsidyBreakdown[];
}

export interface PricingSummary {
  basePrice: number;
  gst5Amount: number;
  gst18Amount: number;
  totalGst: number;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface InventoryStatus {
  productId: string;
  productName: string;
  requiredQuantity: number;
  availableStock: number;
  isSufficient: boolean;
}

export interface CalculateQuoteResponse {
  systemConfig: SystemConfig;
  panels: CalculatedPanel[];
  inverters: CalculatedInverter;
  structure: CalculatedStructure;
  installation: CalculatedInstallation;
  pricing: PricingSummary;
  subsidy: CalculatedSubsidy;
  effectivePrice: number;
  completionWeeks: number;
  inventoryStatus?: InventoryStatus[];
  warnings?: ValidationWarning[];
  hasOverrides: boolean;
  actualTotalWattage: number;
  actualSystemSizeKw: number;
  actualDcrSizeKw: number;
  actualNonDcrSizeKw: number;
  profitabilityPercent: number;
  profitabilityAmount: number;
  calculatedAt: string;
}

export interface SaveQuoteResponse {
  quoteId: string;
  quoteNumber: string;
  finalPrice: number;
  effectivePrice: number;
  discountAmount: number;
  subsidyAmount: number;
  calculation: CalculateQuoteResponse;
}

// ============================================================================
// Config Response Types
// ============================================================================

export interface PaymentMilestone {
  stage: string;
  name: string;
  description?: string;
  percentage: number;
  color?: string;
  amount?: number;
}

export interface QuoteConfigResponse {
  defaultValidityDays: number;
  maxVersions: number;
  gstConfig: {
    equipmentGstPercent: number;
    serviceGstPercent: number;
    equipmentRatio: number;
    serviceRatio: number;
  };
  wattageRounding: string;
  paymentMilestones: PaymentMilestone[];
}

export interface SubsidyTier {
  fromKw: number;
  toKw: number;
  ratePerKw: number;
}

export interface SubsidyConfigResponse {
  id: string;
  schemeName: string;
  projectType: ProjectType;
  maxSubsidyKw: number;
  requiresDcr: boolean;
  tiers: SubsidyTier[];
  isActive: boolean;
}

// ============================================================================
// PDF Data Types
// ============================================================================

export interface QuoteCustomerInfo {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  consumerNumber?: string;
  consumerName?: string;
}

export interface QuotePropertyInfo {
  propertyName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  propertyType?: string;
}

export interface QuotePdfData {
  calculation: CalculateQuoteResponse;
  customer: QuoteCustomerInfo;
  property: QuotePropertyInfo;
  quoteNumber?: string;
  validityDays: number;
  paymentMilestones?: PaymentMilestone[];
  showPriceBreakdown?: boolean;
  discountAmount?: number;
}
