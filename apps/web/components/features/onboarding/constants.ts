/**
 * Unified customer + property onboarding wizard — step configuration.
 *
 * The same wizard shell serves four flows (see `OnboardingMode`); each one
 * just exposes a different slice of the step list:
 *   create          full run — lookup, customer, property, assign
 *   create-site     entered with a known customer — property + assign only
 *   edit-customer   customer steps only
 *   edit-property   property steps + assign
 */

export type OnboardingMode = 'create' | 'create-site' | 'edit-customer' | 'edit-property';

export type OnboardingStepKey =
  | 'find-customer'
  | 'customer-identity'
  | 'billing-address'
  | 'property-basics'
  | 'site-address'
  | 'utility'
  | 'change-requests'
  | 'lead'
  | 'financing'
  | 'documents'
  | 'review-assign';

export type OnboardingStepGroup = 'Start' | 'Customer' | 'Property' | 'Finish';

export interface OnboardingStepConfig {
  key: OnboardingStepKey;
  /** Sidebar label. */
  label: string;
  /** Sidebar sub-label. */
  description: string;
  group: OnboardingStepGroup;
  /** Card overline — e.g. "Customer · Who they are". */
  overline: string;
  /** Card heading. */
  title: string;
  /** Card sub-heading; omitted where the design shows none. */
  blurb?: string;
  /** Dot-paths validated (via `form.trigger`) before advancing past this step. */
  fields: string[];
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    key: 'find-customer',
    label: 'Find customer',
    description: 'Phone lookup',
    group: 'Start',
    overline: 'Step 1 · Find customer',
    title: 'Start with the phone number',
    blurb:
      'A customer can own several sites. Check the number first — if they already exist, skip straight to the property and keep one profile.',
    fields: [],
  },
  {
    key: 'customer-identity',
    label: 'Customer details',
    description: 'Name & contact',
    group: 'Customer',
    overline: 'Customer · Who they are',
    title: 'Customer details',
    fields: [
      'customer.firstName',
      'customer.middleName',
      'customer.lastName',
      'customer.phone',
      'customer.alternatePhone',
      'customer.email',
      'customer.leadSource',
      'customer.leadSourceOther',
    ],
  },
  {
    key: 'billing-address',
    label: 'Billing address',
    description: 'Invoice address',
    group: 'Customer',
    overline: 'Customer · Billing address',
    title: 'Where invoices go',
    blurb:
      'This is the mailing address on the invoice. You can copy it onto the site address in the next steps.',
    fields: ['customer.address', 'customer.city', 'customer.state', 'customer.pincode'],
  },
  {
    key: 'property-basics',
    label: 'Property basics',
    description: 'Name & type',
    group: 'Property',
    overline: 'Property · Basics',
    title: 'What are we installing on?',
    fields: ['propertyName', 'propertyType'],
  },
  {
    key: 'site-address',
    label: 'Site address',
    description: 'Location & pin',
    group: 'Property',
    overline: 'Property · Site address',
    title: 'Where the array goes',
    fields: ['address', 'city', 'pincode', 'country'],
  },
  {
    key: 'utility',
    label: 'Utility & DISCOM',
    description: 'Consumer details',
    group: 'Property',
    overline: 'Property · Electricity connection',
    title: 'Utility & DISCOM',
    blurb:
      "Copy these straight off the latest electricity bill — net metering paperwork is rejected when they don't match.",
    fields: ['discomId', 'consumerName', 'consumerNumber', 'connectionType', 'sanctionedLoad'],
  },
  {
    key: 'change-requests',
    label: 'Change of request',
    description: 'Bill corrections',
    group: 'Property',
    overline: 'Property · Change of request',
    title: 'Anything to fix with the DISCOM?',
    blurb:
      'Each one becomes a task on the project when this site is converted. Skip it if the bill is already correct.',
    fields: ['changeRequests'],
  },
  {
    key: 'lead',
    label: 'Lead & notes',
    description: 'Temperature & notes',
    group: 'Property',
    overline: 'Property · Lead tracking',
    title: 'How warm is this one?',
    fields: ['leadTemperature'],
  },
  {
    key: 'financing',
    label: 'Financing',
    description: 'Loan options',
    group: 'Property',
    overline: 'Property · Financing',
    title: 'Does this one need a loan?',
    blurb: 'Turning this on collects the KYC and income documents the lender asks for.',
    fields: ['wantsLoan'],
  },
  {
    key: 'documents',
    label: 'Documents',
    description: 'Bills & photos',
    group: 'Property',
    overline: 'Property · Documents',
    title: 'Bills, photos and paperwork',
    blurb:
      'Nothing here is mandatory to create the site — but the latest electricity bill unblocks the design team on day one.',
    fields: [],
  },
  {
    key: 'review-assign',
    label: 'Review & assign',
    description: 'Site visit owner',
    group: 'Finish',
    overline: 'Finish · Review',
    title: 'Check it over',
    fields: [],
  },
];

const CUSTOMER_STEPS = new Set<OnboardingStepKey>(['customer-identity', 'billing-address']);
const PROPERTY_STEPS = new Set<OnboardingStepKey>([
  'property-basics',
  'site-address',
  'utility',
  'change-requests',
  'lead',
  'financing',
  'documents',
  'review-assign',
]);

export interface VisibleStepOptions {
  /** Create flow only: an existing customer was picked, so their steps are skipped. */
  usingExistingCustomer?: boolean;
}

export function getVisibleSteps(
  mode: OnboardingMode,
  options: VisibleStepOptions = {},
): OnboardingStepConfig[] {
  if (mode === 'edit-customer') {
    return ONBOARDING_STEPS.filter((s) => CUSTOMER_STEPS.has(s.key));
  }
  if (mode === 'edit-property') {
    return ONBOARDING_STEPS.filter((s) => PROPERTY_STEPS.has(s.key));
  }
  if (mode === 'create-site') {
    return ONBOARDING_STEPS.filter((s) => PROPERTY_STEPS.has(s.key));
  }
  // create
  return ONBOARDING_STEPS.filter(
    (s) => !(options.usingExistingCustomer && CUSTOMER_STEPS.has(s.key)),
  );
}

/** Order the sidebar renders its group headings in. */
export const STEP_GROUP_ORDER: OnboardingStepGroup[] = ['Start', 'Customer', 'Property', 'Finish'];
