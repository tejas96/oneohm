/**
 * Canonical solar-EPC work-stage sequence.
 *
 * `project_tasks.milestone_order` is denormalized per task and is NOT unique
 * across milestone names — many workflow steps independently store 1, 2, 5…
 * Sorting by that number then falls back to localeCompare, so "Installation"
 * appears before "Permits & Approvals" and "Planning".
 *
 * This list is the single source of truth for display, aggregation, current
 * phase, and new-task writes. Lower index = earlier in the project lifecycle.
 */
export const MILESTONE_LIFECYCLE_SEQUENCE: readonly string[] = [
  // Pre-construction
  'Planning',
  'Site Survey & Design',
  'Feasibility Study',
  'Structural Assessment',
  'Shading Analysis',
  // Approvals & compliance
  'Permits & Approvals',
  'DISCOM Application',
  'Net Metering Application',
  'Subsidy Application',
  'Loan Processing',
  // Procurement
  'Material Procurement',
  'Equipment Delivery',
  // Construction
  'Civil & Structural Work',
  'Electrical Work',
  'Installation',
  'Earthing & Lightning Protection',
  // Quality & commissioning
  'Inspection & Testing',
  'Commissioning',
  'Commissioning & Testing',
  'DISCOM Inspection',
  'Net Meter Installation',
  // Handover & post-sales
  'Handover',
  'Customer Training',
  'Documentation',
  'AMC / Warranty Registration',
  // Payment-linked labels sometimes used as work-stage names
  'Payment 1',
  'Payment 2',
  'Payment 3',
  'Payment 4',
  'Payment 5',
] as const;

/** Normalized-name aliases that must not substring-match longer catalog names. */
export const MILESTONE_LIFECYCLE_ALIASES: Readonly<Record<string, string>> = {
  'site survey': 'Site Survey & Design',
  permits: 'Permits & Approvals',
  approval: 'Permits & Approvals',
  design: 'Site Survey & Design',
};

/** Sort key offset so unknown custom names never collide with catalog indices. */
export const UNKNOWN_MILESTONE_SEQUENCE_BASE = 10_000;
