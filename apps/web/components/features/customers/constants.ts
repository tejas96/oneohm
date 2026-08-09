/**
 * Customer Feature Constants
 *
 * Shared constants used across customer feature components and hooks.
 *
 * @module features/customers/constants
 */

import {
  PropertyStatus,
  PropertyType,
  type CustomerStatus,
  type QuoteStatus,
} from '@tejas96/shared/types';

import type { CrmTone } from '@/components/shared/crm-table';
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
  lost: 'error',
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
// CRM list: semantic tone maps
// ============================================================================

/**
 * Customer status → DS tone.
 *
 * Status is an ordered ladder (lead → prospect → active, with inactive as the
 * exit), so it maps to fixed semantic tones rather than to `MUIStatusChip`'s
 * hashed palette. Two customers on the same rung must always read the same
 * colour, on this page and every other.
 */
export const CUSTOMER_STATUS_TONE: Record<CustomerStatus, CrmTone> = {
  lead: 'neutral',
  prospect: 'info',
  active: 'success',
  inactive: 'danger',
  lost: 'danger',
};

/**
 * Lead source → DS tone.
 *
 * Grouped by how the lead reached us: inbound (info), earned (accent), paid
 * (warning), and everything else neutral. Sources not listed — the enum allows
 * free-text values under `other` — fall back to neutral.
 */
export const LEAD_SOURCE_TONE: Record<string, CrmTone> = {
  website: 'info',
  social_media: 'info',
  referral: 'accent',
  advertisement: 'warning',
  exhibition: 'warning',
  cold_call: 'warning',
  walk_in: 'neutral',
  reseller: 'neutral',
  other: 'neutral',
};

/** Site (property) status → DS tone. */
export const PROPERTY_STATUS_TONE: Record<PropertyStatus, CrmTone> = {
  [PropertyStatus.ACTIVE]: 'info',
  [PropertyStatus.CONVERTED]: 'success',
  [PropertyStatus.PENDING_VERIFICATION]: 'warning',
  [PropertyStatus.INACTIVE]: 'danger',
  [PropertyStatus.LOST]: 'danger',
};

/**
 * Order the site-status segments are stacked in the portfolio distribution bar.
 * Fixed rather than derived from object key order so the bar's reading — won
 * on the left, lost on the right — is stable across rows.
 */
export const PROPERTY_STATUS_BAR_ORDER: readonly PropertyStatus[] = [
  PropertyStatus.CONVERTED,
  PropertyStatus.ACTIVE,
  PropertyStatus.PENDING_VERIFICATION,
  PropertyStatus.INACTIVE,
  PropertyStatus.LOST,
];

/** Latest-quote status → DS tone. */
export const QUOTE_STATUS_TONE: Record<QuoteStatus, CrmTone> = {
  draft: 'neutral',
  sent: 'warning',
  viewed: 'warning',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
};

/** Property type → DS tone, used by the site type badge and its icon wash. */
export const PROPERTY_TYPE_TONE: Record<PropertyType, CrmTone> = {
  [PropertyType.RESIDENTIAL]: 'info',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'info',
  [PropertyType.COMMERCIAL]: 'accent',
  [PropertyType.INDUSTRIAL]: 'neutral',
  [PropertyType.AGRICULTURAL]: 'success',
  [PropertyType.INSTITUTIONAL]: 'warning',
};

// ============================================================================
// CRM list: site pipeline stage
// ============================================================================

/**
 * The site journey, in order. The expanded row shows the current rung plus a
 * progress bar of `(index + 1) / length`.
 */
export const SITE_STAGES = [
  'Lead captured',
  'Survey done',
  'Design ready',
  'Quote sent',
  'Converted',
] as const;

/** Quote states that mean the quote has actually gone out to the customer. */
const QUOTE_SENT_STATUSES: readonly string[] = ['sent', 'viewed', 'accepted', 'rejected'];

/**
 * Derive a site's stage index from the facts already on the property record.
 *
 * There is no `stage` column — the stage IS the highest milestone the site has
 * reached, so it is computed from converted status, quote state, and survey
 * completion rather than stored and risked going stale. Checked highest-first:
 * a converted site is converted regardless of what its quote says.
 */
export function getSiteStageIndex(property: {
  status?: string;
  latestQuoteId?: string;
  latestQuoteStatus?: string;
  surveyDone?: boolean;
  siteVisitDone?: boolean;
}): number {
  if (property.status === PropertyStatus.CONVERTED) return 4;
  if (property.latestQuoteStatus && QUOTE_SENT_STATUSES.includes(property.latestQuoteStatus)) {
    return 3;
  }
  if (property.latestQuoteId) return 2;
  if (property.surveyDone || property.siteVisitDone) return 1;
  return 0;
}

// ============================================================================
// Document Type Labels
// ============================================================================

/** Mapping of document tag values (including legacy ones) to display labels. */
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
