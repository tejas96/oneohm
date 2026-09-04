/**
 * Customer Feature Constants
 *
 * Shared constants used across customer feature components and hooks.
 *
 * @module features/customers/constants
 */

import {
  ProjectStatus,
  PropertyStatus,
  PropertyType,
  type CustomerStatus,
  type QuoteStatus,
} from '@tejas96/shared/types';

import type { CrmTone } from '@/components/shared/crm-table';
import type { BadgeProps } from '@/components/ui/badge';
import type { StatusChipColor } from '@/components/ui/mui-status-chip';
import type { Gate } from '@/lib/rbac/catalog';
import { toTitleLabel } from '@/lib/utils';

// ============================================================================
// Detail Page: Tab Configuration
// ============================================================================

export const CUSTOMER_DETAIL_TABS = [
  { value: 'overview', label: 'Overview', permission: 'customers.view' },
  { value: 'properties', label: 'Properties', permission: 'properties.view' },
  { value: 'quotes', label: 'Quotes', permission: 'quotes.view' },
  { value: 'projects', label: 'Projects', permission: 'projects.view' },
  { value: 'documents', label: 'Documents', permission: 'customers.view' },
  { value: 'followups', label: 'Follow-ups', permission: 'followups.view' },
  { value: 'finance', label: 'Finance', permission: 'finance.view' },
  { value: 'service', label: 'Service', permission: 'service.view' },
  { value: 'activity', label: 'Activity', permission: 'customers.view' },
] as const satisfies readonly {
  value: string;
  label: string;
  permission: Gate;
}[];

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
  'Commissioned',
] as const;

/** Quote states that mean the quote has actually gone out to the customer. */
const QUOTE_SENT_STATUSES: readonly string[] = ['sent', 'viewed', 'accepted', 'rejected'];

/**
 * Derive a site's stage index from the facts already on the property record.
 *
 * There is no `stage` column — the stage IS the highest milestone the site has
 * reached, so it is computed from the linked project, converted status, quote
 * state and survey completion rather than stored and risked going stale.
 * Checked highest-first: a converted site is converted regardless of what its
 * quote says, and a commissioned one regardless of both.
 */
export function getSiteStageIndex(property: {
  status?: string;
  projectStatus?: string;
  latestQuoteId?: string;
  latestQuoteStatus?: string;
  surveyDone?: boolean;
  siteVisitDone?: boolean;
}): number {
  // Conversion is not the end of the journey — handover is. Only a finished
  // project fills the rail; a cancelled one stops where it stopped rather than
  // reading as progress, and the status pill carries the bad news.
  if (property.projectStatus === ProjectStatus.COMPLETED) return 5;
  if (property.status === PropertyStatus.CONVERTED) return 4;
  if (property.latestQuoteStatus && QUOTE_SENT_STATUSES.includes(property.latestQuoteStatus)) {
    return 3;
  }
  if (property.latestQuoteId) return 2;
  if (property.surveyDone || property.siteVisitDone) return 1;
  return 0;
}

// ============================================================================
// CRM list: what a site is actually doing
// ============================================================================

/**
 * How a project's state reads when it is describing a SITE rather than a
 * project. "Planning" on a project row means the build has not started; on a
 * site row it has to also say that the site is no longer in the sales pipeline,
 * hence "In planning" over the bare status word.
 */
const PROJECT_STATUS_SITE_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.PLANNING]: 'In planning',
  [ProjectStatus.ACTIVE]: 'In progress',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.CANCELLED]: 'Cancelled',
  [ProjectStatus.ON_HOLD]: 'On hold',
};

const PROJECT_STATUS_SITE_TONE: Record<ProjectStatus, CrmTone> = {
  [ProjectStatus.PLANNING]: 'info',
  [ProjectStatus.ACTIVE]: 'accent',
  [ProjectStatus.COMPLETED]: 'success',
  [ProjectStatus.CANCELLED]: 'danger',
  [ProjectStatus.ON_HOLD]: 'warning',
};

export interface SiteLifecycle {
  label: string;
  tone: CrmTone;
}

/**
 * What to show in a site's status pill.
 *
 * A property's own `status` column is written to CONVERTED when its project is
 * created and moves again only if that project is deleted. It is therefore a
 * record of one past event, not a state: a finished install, a stalled one and
 * a cancelled one all read "Converted", in success green. Wherever a project
 * exists, its status is the honest answer and this returns that instead.
 *
 * LOST wins over the project state on purpose. A site marked lost is a sales
 * outcome the operator recorded deliberately, and it should not be overwritten
 * by whatever a leftover project row says.
 */
export function getSiteLifecycle(property: {
  status: PropertyStatus;
  projectStatus?: ProjectStatus;
}): SiteLifecycle {
  if (property.status !== PropertyStatus.LOST && property.projectStatus) {
    return {
      label: PROJECT_STATUS_SITE_LABEL[property.projectStatus],
      tone: PROJECT_STATUS_SITE_TONE[property.projectStatus],
    };
  }
  return {
    label: toTitleLabel(property.status),
    tone: PROPERTY_STATUS_TONE[property.status] ?? 'neutral',
  };
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
  panel_structure_installation_view: 'Panel / Structure Installation View',
  other: 'Other',
};
