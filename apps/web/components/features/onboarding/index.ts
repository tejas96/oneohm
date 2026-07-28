// Onboarding Feature - Barrel Exports
// Unified customer + property creation wizard, replacing the separate
// /customers/new and /properties/new flows.

export { OnboardingWizardPage } from './components/onboarding-wizard-page';
export { OnboardingWizard } from './components/onboarding-wizard';

export {
  onboardingCreateSchema,
  onboardingCustomerSchema,
  onboardingPropertySchema,
  getOnboardingResolverSchema,
} from './schemas/onboarding.schema';
export type { OnboardingFormData } from './schemas/onboarding.schema';
export type { OnboardingMode } from './constants';

export { useCustomerLookup } from './hooks';
