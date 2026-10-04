import type { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';

/** One thing a site still needs before it can become a project. */
export interface OnboardingBlocker {
  /** Stable id for the web and for logs. */
  code: string;
  /** Shown as is, in the red list on the create-project page. */
  message: string;
}

type OnboardingCheck = (property: CustomerPropertyEntity) => OnboardingBlocker | null;

/**
 * Everything a site must have before it is onboarded as a project. A site can
 * be saved without these (a first visit often lacks them); a project cannot be
 * created until each check passes. A new rule is one more entry here: the
 * backend refuses the conversion and the web lists it, with no other change.
 */
const ONBOARDING_CHECKS: readonly OnboardingCheck[] = [
  (property) =>
    property.consumerNumber?.trim()
      ? null
      : {
          code: 'consumer_number_missing',
          message: "Add the site's MSEDCL consumer number: every DISCOM report prints it.",
        },
];

/** What still blocks this site from becoming a project; empty when it is ready. */
export function onboardingBlockers(property: CustomerPropertyEntity): OnboardingBlocker[] {
  return ONBOARDING_CHECKS.map((check) => check(property)).filter(
    (blocker): blocker is OnboardingBlocker => blocker !== null,
  );
}
