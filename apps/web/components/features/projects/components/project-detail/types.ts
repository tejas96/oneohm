import type { AttentionItem } from '@tejas96/shared/types';

import type { MilestoneAggregateItem, ProjectTeamMember } from '../../hooks/types';
import type { ProjectReportsData } from '../../hooks/use-project-reports';

import type { ProjectSummary } from '@/lib/hooks/resources';
import type { ProjectLedgerSummary } from '@/lib/hooks/resources/ledger';

/**
 * One independently-loading region of the page.
 *
 * Every card keeps its own three states. "Nothing is wrong here" and "we could
 * not check" lead to opposite actions, so a failed panel must never collapse
 * into an empty one — and a count that failed must never render as zero.
 */
export interface Panel<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Everything the header band and the Overview tab draw from, fetched once by
 * the page shell. The header sits on every tab, so these requests are made
 * regardless of which tab is showing; react-query dedupes them against the
 * tabs that ask for the same keys.
 */
export interface ProjectDetailData {
  summary: Panel<ProjectSummary>;
  milestones: Panel<MilestoneAggregateItem[]>;
  attention: Panel<AttentionItem[]>;
  /** `allowed` is the `finance.view` gate. When false nothing was requested. */
  ledger: Panel<ProjectLedgerSummary> & { allowed: boolean };
  reports: Panel<ProjectReportsData>;
  team: Panel<ProjectTeamMember[]>;
}
