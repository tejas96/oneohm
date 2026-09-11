import { PROPERTY_TYPE_LABELS, type PropertyType } from '../types/enums/customer.enum';
import { type SiteTaskFacts } from '../types/interfaces/task.interface';

/**
 * Which workflow steps a brand-new project turns into tasks.
 *
 * Change-request templates (`isSpecial`) are instantiated only when a property
 * actually has a pending request, never as part of a project's baseline task
 * list. Project creation has always dropped them; the create wizard used to list
 * them anyway, so it promised more tasks than the project would get.
 *
 * Both sides call this, so the rule cannot drift between what the wizard shows
 * and what the backend builds. Deactivated steps are excluded separately, by the
 * `isActive` filter on the query that feeds this.
 */
export function isProjectBaselineStep(step: {
  isSpecial?: boolean | null;
  changeRequestType?: string | null;
}): boolean {
  return !step.isSpecial && !step.changeRequestType;
}

interface StepRule {
  loanOnly?: boolean | null;
  propertyTypes?: PropertyType[] | null;
}

/**
 * Whether a step's task rule lets its task onto a site.
 *
 * No rule: every site. "Loan only": the site must want a loan. A type list: the
 * site's type must be in it; an empty or missing list means every type. When
 * both are set, both must match.
 *
 * Project creation, the loan sync and the create wizard all call this, so what
 * the wizard shows is what the project gets.
 */
export function stepAppliesToSite(step: StepRule, site: SiteTaskFacts): boolean {
  if (step.loanOnly && !site.wantsLoan) return false;
  const types = step.propertyTypes ?? [];
  if (types.length > 0 && !types.includes(site.propertyType)) return false;
  return true;
}

/**
 * The rule in words, or null when the step has no rule.
 * Full: "Loan only · Residential, Commercial". Short: "Loan only · Residential +1".
 */
export function describeStepRule(step: StepRule, options: { short?: boolean } = {}): string | null {
  const parts: string[] = [];
  if (step.loanOnly) parts.push('Loan only');

  const types = step.propertyTypes ?? [];
  if (types.length > 0) {
    const labels = types.map((type) => PROPERTY_TYPE_LABELS[type] ?? type);
    parts.push(
      options.short && labels.length > 1
        ? `${labels[0]} +${labels.length - 1}`
        : labels.join(', '),
    );
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
