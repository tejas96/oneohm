import type {
  DashboardFinancing,
  ProjectAttention,
  StageGroupKey,
} from '@tejas96/shared/types';

import { ROUTES } from '@/lib/config/routes';

type ListFilters = Record<string, unknown>;

/**
 * The project list keeps its filters as JSON under `projects_filters`
 * (`useTableUrlState`, prefix "projects"). `status: 'all'` is explicit: the
 * dashboard counts every non-cancelled project whatever its status field says
 * (spec D5), and the list otherwise opens on Active only.
 */
export function projectListHref(filters: ListFilters): string {
  const params = new URLSearchParams();
  params.set('projects_filters', JSON.stringify({ status: 'all', ...filters }));
  return `${ROUTES.PROJECTS.LIST}?${params.toString()}`;
}

const fin = (f: DashboardFinancing): ListFilters => (f === 'all' ? {} : { financing: f });

function monthBounds(month: string): { from: string; to: string } {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export const dashboardLinks = {
  onboarded: (from: string, to: string, f: DashboardFinancing): string =>
    projectListHref({ ...fin(f), onboarded: { from, to } }),
  live: (f: DashboardFinancing): string => projectListHref({ ...fin(f), progress: 'live' }),
  notStarted: (f: DashboardFinancing): string =>
    projectListHref({ ...fin(f), progress: 'not_started' }),
  inProgress: (f: DashboardFinancing): string =>
    projectListHref({ ...fin(f), progress: 'in_progress' }),
  meterInstalled: (from: string, to: string, f: DashboardFinancing): string =>
    projectListHref({ ...fin(f), meterInstalled: { from, to } }),
  attention: (a: ProjectAttention, f: DashboardFinancing): string =>
    projectListHref({ ...fin(f), attention: a }),
  stage: (stage: StageGroupKey | 'none', f: DashboardFinancing, phase?: string): string =>
    projectListHref({ ...fin(f), ...(phase ? { phase } : { stage }) }),
  meterDue: (from: string, to: string, f: DashboardFinancing): string =>
    projectListHref({ ...fin(f), meterDue: { from, to } }),
  month: (kind: 'onboarded' | 'meterInstalled', month: string, f: DashboardFinancing): string => {
    const { from, to } = monthBounds(month);
    return projectListHref({ ...fin(f), [kind]: { from, to } });
  },
  project: (projectId: string): string => `/projects/${projectId}`,
  task: (projectId: string, taskId: string): string =>
    `/projects/${projectId}?${new URLSearchParams({ tab: 'tasks', t_task: taskId })}`,
  workload: (department: string): string => `/workload?${new URLSearchParams({ department })}`,
  receivables: (f: DashboardFinancing): string =>
    f === 'all' ? ROUTES.FINANCE.RECEIVABLES : `${ROUTES.FINANCE.RECEIVABLES}?funding=${f}`,
  recovery: (f: DashboardFinancing): string =>
    `${ROUTES.FINANCE.RECEIVABLES}?scope=${f === 'all' ? 'recovery' : `recovery-${f}`}`,
};
