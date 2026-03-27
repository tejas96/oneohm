/**
 * Customer Feature Constants
 *
 * Shared constants used across customer feature components and hooks.
 *
 * @module features/customers/constants
 */

import type { QuoteStatus } from '@oneohm-epc/shared/types';

import type { BadgeProps } from '@/components/ui/badge';

// ============================================================================
// Detail Page: Tab Configuration
// ============================================================================

export const CUSTOMER_DETAIL_TABS = [
  { value: 'quotes', label: 'Quotes' },
  { value: 'documents', label: 'Documents' },
  { value: 'projects', label: 'Projects' },
  { value: 'activity', label: 'All Activity' },
] as const;

export type CustomerDetailTab = (typeof CUSTOMER_DETAIL_TABS)[number]['value'];

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
