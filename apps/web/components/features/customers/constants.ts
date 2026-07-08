/**
 * Customer Feature Constants
 *
 * Shared constants used across customer feature components and hooks.
 *
 * @module features/customers/constants
 */

import type { CustomerStatus, QuoteStatus } from '@tejas96/shared/types';

import type { BadgeProps } from '@/components/ui/badge';
import type { StatusChipColor } from '@/components/ui/mui-status-chip';

// ============================================================================
// Detail Page: Tab Configuration
// ============================================================================

export const CUSTOMER_DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'properties', label: 'Properties' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'projects', label: 'Projects' },
  { value: 'documents', label: 'Documents' },
  { value: 'followups', label: 'Follow-ups' },
  { value: 'finance', label: 'Finance' },
  { value: 'service', label: 'Service' },
  { value: 'activity', label: 'Activity' },
] as const;

export type CustomerDetailTab = (typeof CUSTOMER_DETAIL_TABS)[number]['value'];

export const CUSTOMER_DETAIL_DEFAULT_TAB: CustomerDetailTab = 'overview';

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  walk_in: 'Walk-in',
  social_media: 'Social Media',
  website: 'Website',
  exhibition: 'Exhibition',
  cold_call: 'Cold Call',
  advertisement: 'Advertisement',
  reseller: 'Reseller',
  other: 'Other',
};

export const CUSTOMER_STATUS_CHIP_COLOR: Record<CustomerStatus, StatusChipColor> = {
  lead: 'info',
  prospect: 'warning',
  active: 'success',
  inactive: 'default',
};

// ============================================================================
// Detail Page: Quote Status Badge Variants
// ============================================================================

export const QUOTE_STATUS_BADGE_VARIANT: Record<QuoteStatus, BadgeProps['variant']> = {
  draft: 'default',
  sent: 'info',
  viewed: 'secondary',
  accepted: 'success',
  rejected: 'error',
  expired: 'warning',
};

// ============================================================================
// Document Type Labels
// ============================================================================

/**
 * Mapping of document tag values to human-readable labels.
 * Mapping of legacy document tag values to display labels.
 */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  electricity_bill: 'Electricity Bill',
  identity_proof: 'ID Proof',
  address_proof: 'Address Proof',
  site_survey: 'Site Survey',
  aadhaar_card: 'Aadhaar Card',
  pan_card: 'PAN Card',
  bank_statement: 'Bank Statement',
  technical_drawing: 'Technical Drawing',
  compliance_certificate: 'Compliance Certificate',
  other: 'Other',
};
