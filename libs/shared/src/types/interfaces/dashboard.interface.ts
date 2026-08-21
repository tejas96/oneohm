/**
 * Types for the single-page "My Work" dashboard.
 *
 * Deliberately separate from `AttentionItem` / `AttentionKind` in
 * `project.interface.ts`. That union is consumed by `oneohm-mobile`, which keeps
 * its own copy and maps it with an EXHAUSTIVE label record — a new kind would
 * render as a blank there. These names never collide with it.
 */

export type DashboardSeverity = 'critical' | 'warning' | 'info';

/** Every kind the dashboard can emit. Each maps to a real database state. */
export type DashboardItemKind =
  // workflow
  | 'property_missing'
  | 'site_visit_unassigned'
  | 'site_visit_pending'
  | 'survey_pending'
  | 'quote_missing'
  | 'quote_draft'
  | 'quote_expiring'
  | 'quote_lapsed'
  | 'quote_accepted_no_project'
  // follow-ups
  | 'followup_overdue'
  | 'followup_today'
  | 'followup_upcoming'
  // service
  | 'service_overdue'
  | 'service_due_today'
  | 'service_due_soon'
  | 'service_unassigned'
  // projects
  | 'project_overdue'
  | 'project_at_risk'
  | 'project_on_track'
  // finance
  | 'payment_overdue'
  | 'payment_due_soon';

/**
 * What to open, never where.
 *
 * Routes are owned by `apps/web/lib/config/routes.ts`. The backend emitting a
 * URL string (as `ProjectAttentionService` does today) rots silently when a
 * route moves, so it emits an intent and the web resolves it.
 */
export type DashboardAction =
  | 'add_property'
  | 'open_property'
  | 'complete_survey'
  | 'create_quote'
  | 'open_quote'
  | 'convert_to_project'
  | 'complete_followup'
  | 'open_service'
  | 'open_project'
  | 'open_payments';

export interface DashboardItem {
  /** Stable within a response. Shape: `<kind>:<entityId>`. */
  id: string;
  kind: DashboardItemKind;
  severity: DashboardSeverity;
  /** Line 1 — what it is and which record. */
  title: string;
  /** Line 2 — the place, person or reference number. */
  subtitle?: string;
  /** Why this is on screen, as a sentence. Never a status code. */
  reason: string;
  /** Right-hand meta, already formatted for display. */
  meta?: string;
  metaSecondary?: string;
  /** ISO date this item hangs off, when it has one. */
  dueDate?: string;
  action: DashboardAction;
  /** Everything the web needs to build the target URL. */
  params: Record<string, string>;
  /** The permission code this action needs, or null when it is always open. */
  gate: string | null;
}

/** One bucket inside a section, e.g. `Today · 3`. */
export interface DashboardBucket {
  key: string;
  label: string;
  /** The bucket's TRUE total, which may exceed `items.length`. */
  count: number;
  items: DashboardItem[];
}

export type DashboardSection =
  | {
      status: 'ok';
      /** The section's full count, including items the web lifts away. */
      total: number;
      /** How many of `total` are critical. The web lifts exactly these. */
      criticalCount: number;
      buckets: DashboardBucket[];
    }
  | { status: 'error'; message: string };

export interface DashboardSummary {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
}

export interface MyWorkResponse {
  generatedAt: string;
  summary: DashboardSummary;
  sections: {
    workflow: DashboardSection;
    followups: DashboardSection;
    service: DashboardSection;
    projects: DashboardSection;
    finance: DashboardSection;
  };
}
