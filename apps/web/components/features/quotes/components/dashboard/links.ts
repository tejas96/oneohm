import type { DealAttention, DealStageFilter } from '@tejas96/shared/types';
import { LEAD_SOURCE_OTHER_BUCKET } from '@tejas96/shared/utils';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { DashboardFilters } from '@/lib/hooks/resources';

type ListFilters = Record<string, unknown>;

/** The quote list keeps its filters as JSON under `quotes_filters` (`useTableUrlState`, prefix "quotes"). */
function quoteListHref(filters: ListFilters): string {
  const params = new URLSearchParams();
  params.set('quotes_filters', JSON.stringify(filters));
  return `${ROUTES.QUOTES.LIST}?${params.toString()}`;
}

/** Person and Cash/Loan from the filter bar travel with every link. */
const scope = (f: DashboardFilters): ListFilters => ({
  ...(f.financing === 'all' ? {} : { financing: f.financing }),
  ...(f.person ? { person: f.person } : {}),
});

function monthBounds(month: string): { from: string; to: string } {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export const quoteLinks = {
  newDeals: (from: string, to: string, f: DashboardFilters, financing?: 'cash' | 'loan'): string =>
    quoteListHref({ ...scope(f), ...(financing ? { financing } : {}), newDate: { from, to } }),
  won: (from: string, to: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage: 'won', wonDate: { from, to } }),
  wonOfNew: (from: string, to: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage: 'won', newDate: { from, to } }),
  lost: (from: string, to: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage: 'lost', lostDate: { from, to } }),
  stage: (stage: DealStageFilter, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), stage }),
  attention: (attention: DealAttention, f: DashboardFilters, person?: string): string =>
    quoteListHref({ ...scope(f), ...(person ? { person } : {}), attention }),
  personOpen: (person: string, f: DashboardFilters): string =>
    quoteListHref({ ...scope(f), person, stage: 'open' }),
  source: (key: string, topKeys: string[], from: string, to: string, f: DashboardFilters): string =>
    quoteListHref({
      ...scope(f),
      newDate: { from, to },
      // An array, never a comma list: real lead sources contain commas.
      ...(key === LEAD_SOURCE_OTHER_BUCKET ? { leadSourceNotIn: topKeys } : { leadSource: key }),
    }),
  month: (kind: 'new' | 'won', month: string, f: DashboardFilters): string => {
    const { from, to } = monthBounds(month);
    return kind === 'new'
      ? quoteListHref({ ...scope(f), newDate: { from, to } })
      : quoteListHref({ ...scope(f), stage: 'won', wonDate: { from, to } });
  },
  quote: (quoteId: string): string => buildRoute(ROUTES.QUOTES.DETAIL, { id: quoteId }),
};
