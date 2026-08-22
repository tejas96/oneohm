import { buildRoute, ROUTES } from '@/lib/config/routes';

export interface BusinessRange {
  from: string;
  to: string;
  label: string;
}

/**
 * Every destination Business mode links to, in one place.
 *
 * Built through `buildRoute` rather than string literals. Routes are owned by
 * `lib/config/routes.ts`, and the My Work spec records why: a hard-coded path
 * rots silently the day a route moves, and nothing fails until someone clicks.
 *
 * **`range=custom` on the pipeline links is load-bearing.** `resolveStatsWindow`
 * honours `fromDate`/`toDate` ONLY when `range` is exactly `custom`; without it
 * the dates are ignored and the page silently falls back to its 30-day default.
 * A link like that still navigates, so it looks fine — and then shows different
 * numbers from the screen it came from, which is worse than not carrying the
 * period at all.
 */
export const businessLinks = {
  finance: (): string => ROUTES.FINANCE.HOME,

  receivables: (): string => ROUTES.FINANCE.RECEIVABLES,

  /** The project LIST, matching what My Work's overflow links use. */
  projects: (): string => ROUTES.PROJECTS.LIST,

  project: (id: string): string => buildRoute(ROUTES.PROJECTS.DETAIL, { id }),

  service: (): string => ROUTES.SERVICE.HOME,

  /**
   * The pipeline, showing the same period this screen is showing.
   *
   * `salesPersonId` is omitted for the unassigned row: that bucket is "work
   * belonging to nobody", not a person, and the filter has no id to select.
   */
  pipeline: (range: BusinessRange, salesPersonId?: string | null): string =>
    buildRoute(ROUTES.PIPELINE.HOME, undefined, {
      range: 'custom',
      fromDate: range.from,
      toDate: range.to,
      salesPersonId: salesPersonId ?? undefined,
    }),
};
