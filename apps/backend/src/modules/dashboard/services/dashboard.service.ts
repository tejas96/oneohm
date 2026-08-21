import { Injectable, Logger } from '@nestjs/common';
import type { DashboardSection, DashboardSummary, MyWorkResponse } from '@tejas96/shared/types';

import { FinanceProvider } from '../providers/finance.provider';
import { FollowupsProvider } from '../providers/followups.provider';
import { ProjectsProvider } from '../providers/projects.provider';
import type { DashboardProvider, OkSection } from '../providers/provider.types';
import { ServiceProvider } from '../providers/service.provider';
import { WorkflowProvider } from '../providers/workflow.provider';

/**
 * Bucket keys that mean "past its date". The summary counts these, and only
 * these, as overdue — the three headline numbers must stay disjoint sets.
 */
const OVERDUE_BUCKETS = new Set(['overdue', 'lapsed', 'payment_overdue']);
const TODAY_BUCKETS = new Set(['today', 'due_today']);
const THIS_WEEK_BUCKETS = new Set(['upcoming', 'due_soon', 'payment_due_soon']);

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly providers: DashboardProvider[];

  constructor(
    workflow: WorkflowProvider,
    followups: FollowupsProvider,
    service: ServiceProvider,
    projects: ProjectsProvider,
    finance: FinanceProvider,
  ) {
    this.providers = [workflow, followups, service, projects, finance];
  }

  async getMyWork(userId: string): Promise<MyWorkResponse> {
    const settled = await Promise.allSettled(this.providers.map((p) => p.load(userId)));

    const sections = {} as MyWorkResponse['sections'];
    const ok: OkSection[] = [];

    settled.forEach((result, index) => {
      const key = this.providers[index]!.key;
      if (result.status === 'fulfilled') {
        sections[key] = result.value;
        ok.push(result.value);
        return;
      }
      // Log the real cause; hand the browser a sentence a person can read.
      this.logger.error(`Dashboard section "${key}" failed`, result.reason);
      sections[key] = {
        status: 'error',
        message: 'This section could not be loaded.',
      } satisfies DashboardSection;
    });

    return {
      generatedAt: new Date().toISOString(),
      summary: this.summarise(ok),
      sections,
    };
  }

  /**
   * The three headline numbers are SUMMED FROM the sections, never queried
   * separately, so they cannot drift from the lists beneath them.
   *
   * A section that failed contributes nothing rather than a zero — the numbers
   * describe what we can actually see.
   */
  private summarise(sections: OkSection[]): DashboardSummary {
    const tally = (match: Set<string>): number =>
      sections.reduce(
        (sum, section) =>
          sum +
          section.buckets
            .filter((bucket) => match.has(bucket.key))
            .reduce((bucketSum, bucket) => bucketSum + bucket.count, 0),
        0,
      );

    return {
      overdue: tally(OVERDUE_BUCKETS),
      dueToday: tally(TODAY_BUCKETS),
      dueThisWeek: tally(THIS_WEEK_BUCKETS),
    };
  }
}
