import type {
  ProjectType,
  DcrPreference,
  CalculatorInputs,
  PricingBreakdown,
  PaymentMilestone as SharedPaymentMilestone,
  ProfitMarginTier,
  SubsidyTier as SharedSubsidyTier,
  SubsidySchemeResult as SharedSubsidySchemeResult,
  CalculatedSubsidy as SharedCalculatedSubsidy,
  ValidationWarning as SharedValidationWarning,
  CalculatedPanelConfig,
  CalculatedInstallationCost,
  GstConfig,
} from '@tejas96/shared/types';

// Re-export shared types that consumers already reference by local names
export type { ProfitMarginTier } from '@tejas96/shared/types';
export type ValidationWarning = SharedValidationWarning;
export type SubsidySchemeResult = SharedSubsidySchemeResult;
export type SubsidyTier = SharedSubsidyTier;

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
  phaseType: string;
  subsidyApplicable: boolean;
  dcrPreference?: DcrPreference;
  preferredPanelBrand?: string;
  preferredPanelTechnology?: string;
  preferredPanelWattage?: number;
  preferredInverterBrand?: string;
  preferredInverterCapacityKw?: number;
  structureType: string;
  floorNumber?: number;
  distanceKm?: number;
  panelOverrides?: PanelOverride[];
  inverterOverrides?: InverterOverride[];
  manualInverterCount?: number;
  manualDcrPanelCount?: number;
  manualNonDcrPanelCount?: number;
  selectedSubsidyIds?: string[];
}

export interface CreateFromCalculationRequest extends CalculateQuoteRequest {
  propertyId: string;
  discountAmount?: number;
  internalNotes?: string;
  customerNotes?: string;
  salesPersonId?: string;
  resellerId?: string;
  paymentMilestones?: SharedPaymentMilestone[];
}

// ============================================================================
// Response Types (mirrors backend CalculateQuoteResponseDto)
// Re-uses shared types but adds frontend-specific shapes where the API
// response differs slightly from the canonical shared interface.
// ============================================================================

export interface SystemConfig {
  totalSystemSizeKw: number;
  dcrSizeKw: number;
  nonDcrSizeKw: number;
  phaseType: string;
}

/**
 * Frontend alias for shared CalculatedPanelConfig.
 * Identical structure -- gstRate is optional in the API response.
 */
export interface CalculatedPanel extends Omit<CalculatedPanelConfig, 'gstRate'> {
  gstRate?: number;
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
  structureType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
}

/**
 * Frontend installation type -- extends shared CalculatedInstallationCost
 * with optional gstRate (required in shared but optional in API response).
 */
export interface CalculatedInstallation extends Omit<CalculatedInstallationCost, 'gstRate'> {
  gstRate?: number;
}

export interface SubsidyBreakdown {
  fromKw: number;
  toKw: number;
  kw: number;
  ratePerKw: number;
  amount: number;
}

/**
 * Frontend CalculatedSubsidy -- mirrors shared but with optional `schemes`
 * for backward compatibility with API responses that predate multi-scheme.
 */
export interface CalculatedSubsidy extends Omit<SharedCalculatedSubsidy, 'schemes'> {
  schemes?: SubsidySchemeResult[];
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

export interface QuoteSnapshot {
  inputs: CalculatorInputs;
  calculation: CalculateQuoteResponse;
  pricing: PricingBreakdown;
  discountAmount: number;
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
  gstConfig: GstConfig;
  paymentMilestones: PaymentMilestone[];
  profitMarginTiers: ProfitMarginTier[];
}

export interface SubsidyConfigResponse {
  id: string;
  schemeName: string;
  projectType: ProjectType;
  maxSubsidyKw: number;
  maxSubsidyAmount?: number;
  requiresDcr: boolean;
  tiers: SubsidyTier[];
  isActive: boolean;
}

// ============================================================================
// PDF Data Types (frontend-only)
// ============================================================================

export interface PdfCompanyInfo {
  companyName: string;
  address: string;
  phone: string;
  email?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  workmanshipWarrantyYears?: number;
  cancellationFeePercent?: number;
  latePaymentInterestPercent?: number;
  legalEntityName?: string;
  bankAccountName?: string;
  tagline?: string;
  websiteUrl?: string;
  whatsappDigits?: string;
  copyrightEntity?: string;
}

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

export interface QuotePdfOrgConfig {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  legalEntityName?: string;
  tagline?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankBranch?: string;
  bankAccountName?: string;
  workmanshipWarrantyYears?: number;
  warrantyWorkmanshipYears?: number;
  cancellationFee?: number;
  cancellationFeePercent?: number;
  latePaymentRate?: number;
  latePaymentRatePercent?: number;
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
  gstConfig: QuoteConfigResponse['gstConfig'];
  companyInfo?: Partial<PdfCompanyInfo>;
  orgConfig?: Partial<QuotePdfOrgConfig>;
}
