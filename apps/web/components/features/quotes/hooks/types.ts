import type {
  CalculatorInputs,
  PaymentMilestone,
  PricingBreakdown,
  ProjectType,
  QuoteStatus,
  SystemType,
} from '@tejas96/shared/types';

import type { QuoteSnapshot } from '../types/calculator.types';

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
  quoteSnapshot?: QuoteSnapshot;
  paymentMilestones?: PaymentMilestone[];
  projectCompletionWeeks?: number;
  versions?: QuoteVersionDetail[];
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
  calculatorInputs?: CalculatorInputs;
  quoteSnapshot?: QuoteSnapshot;
  paymentMilestones?: PaymentMilestone[];
  projectCompletionWeeks: number;
  changeSummary?: string;
  createdBy: string;
  createdAt: string;
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
