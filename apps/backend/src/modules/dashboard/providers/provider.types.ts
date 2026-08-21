import type { DashboardSection } from '@tejas96/shared/types';

export type OkSection = Extract<DashboardSection, { status: 'ok' }>;

export type DashboardSectionKey = 'workflow' | 'followups' | 'service' | 'projects' | 'finance';

/**
 * One section of the dashboard.
 *
 * A provider MAY throw. The service catches it and degrades that section only —
 * see `DashboardService.getMyWork`. Providers must not swallow their own errors,
 * because a section that silently returns zero rows is indistinguishable from a
 * section that genuinely has no work, and those mean opposite things.
 */
export interface DashboardProvider {
  readonly key: DashboardSectionKey;
  load(userId: string): Promise<OkSection>;
}
