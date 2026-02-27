/**
 * Property Feature Constants
 *
 * Static configuration for the property creation form.
 * Contains alert messages, section metadata, and required field tracking.
 */

// Required fields tracked by the completion progress bar
export const REQUIRED_FIELD_KEYS = [
  'customerId',
  'propertyName',
  'propertyType',
  'address',
  'city',
  'pincode',
  'leadTemperature',
] as const;

export const REQUIRED_FIELDS_TOTAL = REQUIRED_FIELD_KEYS.length;

// Alert messages used across the property creation form
export const PROPERTY_ALERTS = {
  propertyTip: {
    title: 'Quick Tip',
    message:
      'Give a descriptive name like \u201CMain Residence\u201D or \u201CWarehouse \u2013 Andheri\u201D to easily identify this property later.',
  },
  addressPrefill: {
    message:
      'Address pre-filled from customer profile. You can modify it for this property.',
  },
  electricityTip: {
    title: "Don't have the electricity bill?",
    message:
      'No worries \u2014 all fields here are optional. You can fill these details during the Site Visit.',
  },
  loanBenefits: {
    title: 'Loan Benefits',
    message:
      'With loan financing, your customer pays only 10% advance (vs 30% without). EMI options available from partner banks.',
  },
  documentWarning: {
    title: 'Document Required',
    message:
      'Aadhaar card is required when loan financing is enabled. Other documents are optional but speed up the approval process.',
  },
} as const;
