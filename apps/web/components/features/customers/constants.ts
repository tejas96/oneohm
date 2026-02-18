/**
 * Customer Feature Constants
 *
 * Shared constants used across customer feature components and hooks.
 *
 * @module features/customers/constants
 */

// ============================================================================
// Document Type Labels
// ============================================================================

/**
 * Mapping of document tag values to human-readable labels.
 * Used by both UploadDocumentModal (as select options) and DocumentRow (as display labels).
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

/**
 * Document type options for Select components.
 * Derived from DOCUMENT_TYPE_LABELS.
 */
export const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

/**
 * Get human-readable label for a document tag.
 * Falls back to title-cased tag if not in the lookup.
 */
export function getDocumentTypeLabel(tag: string): string {
  return (
    DOCUMENT_TYPE_LABELS[tag] ||
    tag
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
