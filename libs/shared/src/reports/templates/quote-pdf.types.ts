/**
 * Everything `generateQuoteHtml` needs to describe a quote.
 *
 * These lived in `apps/web/components/features/quotes/types/calculator.types.ts`
 * and moved here with the template, because a template in a shared package
 * cannot depend on types in one of its consumers. The web file now re-exports
 * them so nothing on that side had to be rewritten.
 *
 * WHY THESE ARE NOT THE SHARED CALCULATOR TYPES. Several of them deliberately
 * loosen a shared type to match what the API actually sends: `gstRate` is
 * required on `CalculatedPanelConfig` and optional in the response, `schemes` is
 * required on `CalculatedSubsidy` and absent on quotes raised before
 * multi-scheme. The template renders whatever came back over the wire, so it is
 * typed against the wire, not against the ideal.
 */

import type {
  CalculatedInstallationCost,
  CalculatedPanelConfig,
  CalculatedSubsidy as SharedCalculatedSubsidy,
  GstConfig,
  SubsidySchemeResult,
  ValidationWarning,
} from '../../types';

/* ------------------------------------------------------------ the calculation */

export interface QuotePdfSystemConfig {
  totalSystemSizeKw: number;
  dcrSizeKw: number;
  nonDcrSizeKw: number;
  phaseType: string;
}

/** `gstRate` is optional in the API response and required in the shared type. */
export interface QuotePdfPanel extends Omit<CalculatedPanelConfig, 'gstRate'> {
  gstRate?: number;
}

export interface QuotePdfInverterItem {
  productId: string;
  name: string;
  brand: string;
  description?: string;
  capacityKw: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
  productWarrantyYears?: number;
}

export interface QuotePdfInverters {
  inverters: QuotePdfInverterItem[];
  totalCapacityKw: number;
  totalCost: number;
  totalGst: number;
}

export interface QuotePdfStructure {
  productId: string;
  name: string;
  description?: string;
  structureType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
}

/** Same loosening as the panel: `gstRate` is optional over the wire. */
export interface QuotePdfInstallation extends Omit<CalculatedInstallationCost, 'gstRate'> {
  gstRate?: number;
}

export interface QuotePdfSubsidyBreakdown {
  fromKw: number;
  toKw: number;
  kw: number;
  ratePerKw: number;
  amount: number;
}

/** `schemes` is absent on quotes raised before multi-scheme support. */
export interface QuotePdfSubsidy extends Omit<SharedCalculatedSubsidy, 'schemes'> {
  schemes?: SubsidySchemeResult[];
}

export interface QuotePdfPricing {
  basePrice: number;
  gst5Amount: number;
  gst18Amount: number;
  totalGst: number;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface QuotePdfInventoryStatus {
  productId: string;
  productName: string;
  requiredQuantity: number;
  availableStock: number;
  isSufficient: boolean;
}

export interface QuotePdfCalculation {
  systemConfig: QuotePdfSystemConfig;
  panels: QuotePdfPanel[];
  inverters: QuotePdfInverters;
  structure: QuotePdfStructure;
  installation: QuotePdfInstallation;
  pricing: QuotePdfPricing;
  subsidy: QuotePdfSubsidy;
  effectivePrice: number;
  completionWeeks: number;
  inventoryStatus?: QuotePdfInventoryStatus[];
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

/* -------------------------------------------------------------- the schedule */

/**
 * NOT the shared `PaymentMilestone`, and the difference is load-bearing.
 *
 * The shared type has no `stage`, no `amount` and no `color`. This one is what
 * the CONFIG endpoint returns and what the document prints — the template reads
 * `m.amount` for the rupee figure on every row, so swapping this for the shared
 * type would compile and then print a schedule of zeroes.
 *
 * It carries its own name for that reason: two types called `PaymentMilestone`
 * in one package is how the substitution happens by accident.
 */
export interface QuotePdfPaymentMilestone {
  stage: string;
  name: string;
  description?: string;
  percentage: number;
  color?: string;
  amount?: number;
}

/* ------------------------------------------------------------- who and where */

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

/* ------------------------------------------------------------------ the firm */

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

/**
 * The same facts again, under the names the ORG SETTINGS record uses.
 *
 * Both shapes are accepted because the two sources disagree on spelling —
 * `cancellationFee` here against `cancellationFeePercent` there, and
 * `workmanshipWarrantyYears` against `warrantyWorkmanshipYears`. The template
 * falls back across them rather than picking a winner, so a company that filled
 * in either field gets its own number on the document instead of a default.
 */
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

/* -------------------------------------------------------------- equipment lines */

/**
 * One equipment line on the quotation, as the PDF renders it.
 *
 * NOT the `BomItem` from `../../types`, which this used to borrow. That type
 * describes a `bom_items` row on a project's bill of materials, and a
 * quotation has no BOM — these lines come from the quote's own calculation
 * snapshot via `quoteBomLines()`, which is what `quote-detail-content.tsx`
 * actually passes. Sharing one type across both let the project BOM's shape
 * dictate the quotation's, and the two have nothing to do with each other.
 *
 * `itemType` is a plain string, not the union `quoteBomLines()` emits
 * ('panel' | 'inverter' | 'structure'): the template also filters for
 * 'cables', 'earthing', 'meter' and friends, which no current producer sends,
 * so those branches fall through to the hardcoded rows below them. Typed
 * against the wire, like everything else in this file.
 */
export interface QuotePdfBomItem {
  id: string;
  itemType: string;
  name: string;
  brand?: string;
  specifications?: Record<string, unknown>;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  gstRate?: number;
  gstAmount?: number;
  warrantyYears?: number;
  sortOrder?: number;
}

/* ------------------------------------------------------------------ the root */

export interface QuotePdfData {
  calculation: QuotePdfCalculation;
  customer: QuoteCustomerInfo;
  property: QuotePropertyInfo;
  quoteNumber?: string;
  validityDays: number;
  paymentMilestones?: QuotePdfPaymentMilestone[];
  showPriceBreakdown?: boolean;
  discountAmount?: number;
  gstConfig: GstConfig;
  companyInfo?: Partial<PdfCompanyInfo>;
  orgConfig?: Partial<QuotePdfOrgConfig>;
  bomItems?: QuotePdfBomItem[];
  customerNotes?: string;
}
