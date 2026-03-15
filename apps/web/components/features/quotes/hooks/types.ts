import type {
  CalculatorInputs,
  ItemCategory,
  PaymentMilestone,
  PricingBreakdown,
  ProjectType,
  QuoteConfigSnapshot,
  QuoteStatus,
  SystemType,
} from '@oneohm-epc/shared/types';

// ============================================================================
// Quote Detail Types
// ============================================================================

export interface QuoteDetail {
  id: string;
  organizationId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  propertyId?: string;
  propertyName?: string;
  propertyAddress?: string;
  salesPersonId?: string;
  salesPersonName?: string;
  resellerId?: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  currentVersion: number;
  systemType: SystemType;
  systemSizeKw: number;
  totalWattageWp: number;
  projectType: ProjectType;
  basePrice?: number;
  gstAmount?: number;
  totalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  isSubsidyApplicable?: boolean;
  subsidyAmount?: number;
  effectivePrice?: number;
  calculatorInputs?: CalculatorInputs;
  status: QuoteStatus;
  acceptedAt?: string;
  rejectionReason?: string;
  internalNotes?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  pricingBreakdown?: PricingBreakdown;
  paymentMilestones?: PaymentMilestone[];
  projectCompletionWeeks?: number;
  configSnapshot?: QuoteConfigSnapshot;
  versions?: QuoteVersionDetail[];
  lineItems?: QuoteLineItemDetail[];
}

// ============================================================================
// Quote Version Types
// ============================================================================

export interface QuoteVersionDetail {
  id: string;
  quoteId: string;
  versionNumber: number;
  systemType: SystemType;
  systemSizeKw: number;
  totalWattageWp: number;
  projectType: ProjectType;
  finalPrice: number;
  effectivePrice?: number;
  pricingBreakdown?: PricingBreakdown;
  paymentMilestones?: PaymentMilestone[];
  projectCompletionWeeks: number;
  changeSummary?: string;
  isCurrent: boolean;
  configSnapshot?: QuoteConfigSnapshot;
  createdBy: string;
  createdAt: string;
  lineItems?: QuoteLineItemDetail[];
}

// ============================================================================
// Quote Line Item Types
// ============================================================================

export interface QuoteLineItemDetail {
  id: string;
  quoteVersionId: string;
  productId?: string;
  itemCategory: ItemCategory;
  itemName: string;
  itemDescription?: string;
  specifications?: Record<string, unknown>;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  lineTotal: number;
  taxRate?: number;
  taxAmount?: number;
  displayOrder: number;
}

// ============================================================================
// Payment Milestone Display Type
// ============================================================================

export interface QuotePaymentMilestone {
  stage: string;
  name: string;
  percentage: number;
  amount: number;
  order: number;
}
