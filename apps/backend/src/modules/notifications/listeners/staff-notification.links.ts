/**
 * Where a staff notification opens.
 *
 * `link` is the web path; `mobilePath` is the EPC app path without `oneohm://`,
 * resolved by the app's own linking config (oneohm-mobile/src/app/routes.tsx).
 * Mobile task notifications open the project: the task detail screen is still
 * a placeholder there.
 */
export interface StaffTarget {
  link: string;
  mobilePath: string;
}

export const staffTargets = {
  project: (projectId: string): StaffTarget => ({
    link: `/projects/${projectId}`,
    mobilePath: `projects/${projectId}`,
  }),
  projectTasks: (projectId: string): StaffTarget => ({
    link: `/projects/${projectId}?tab=tasks`,
    mobilePath: `projects/${projectId}`,
  }),
  lead: (customerId: string): StaffTarget => ({
    link: `/customers/${customerId}`,
    mobilePath: `leads/${customerId}`,
  }),
  /** Same URL as the web's followupRecordHref(): property first, else customer. */
  followup: (f: { id: string; customerId: string; propertyId: string | null }): StaffTarget => ({
    link: f.propertyId
      ? `/properties/${f.propertyId}?tab=followups&followupId=${f.id}`
      : `/customers/${f.customerId}?tab=followups&followupId=${f.id}`,
    mobilePath: `more/followups/${f.id}`,
  }),
  followupList: (): StaffTarget => ({ link: '/followups', mobilePath: 'more/followups' }),
  siteWork: (propertyId: string, kind: 'visit' | 'survey'): StaffTarget => ({
    link: `/properties/${propertyId}`,
    mobilePath: `more/site-activity/job/${propertyId}/${kind}`,
  }),
  ticket: (ticketId: string): StaffTarget => ({
    link: `/service/${ticketId}`,
    mobilePath: `more/service-tickets/${ticketId}`,
  }),
};
