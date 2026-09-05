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
