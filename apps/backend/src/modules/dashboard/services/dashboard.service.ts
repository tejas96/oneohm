import { Injectable, Logger } from '@nestjs/common';
import type {
  DashboardSection,
  DashboardSubject,
  DashboardSummary,
  MyWorkResponse,
} from '@tejas96/shared/types';
import { DataSource } from 'typeorm';

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
    private readonly dataSource: DataSource,
    workflow: WorkflowProvider,
    followups: FollowupsProvider,
    service: ServiceProvider,
    projects: ProjectsProvider,
    finance: FinanceProvider,
  ) {
    this.providers = [workflow, followups, service, projects, finance];
  }

  async getMyWork(userId: string): Promise<MyWorkResponse> {
    // The name lookup runs WITH the providers, not before them. It is one
    // indexed primary-key read; making the five aggregates wait behind it would
    // add a round trip to the first screen after login for no benefit.
    const [subject, settled] = await Promise.all([
      this.loadSubject(userId),
      Promise.allSettled(this.providers.map((p) => p.load(userId))),
    ]);

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
      subject,
      summary: this.summarise(ok),
      sections,
    };
  }

  /**
   * Whose dashboard this is, echoed back so the page can name the subject from
   * data the server resolved.
   *
   * The name lives on `users`. It is NOT on `employee_profiles` — that table
   * carries no name columns at all, so the obvious-sounding source does not
   * exist. `last_name` is nullable, hence the coalesce: without it a
   * single-named employee renders as "Priya null".
   *
   * A missing row is not an error. The id came from `resolveDashboardSubjectId`,
   * which either returned the token holder or a caller-supplied uuid that
   * matches no live user; the second case should show an empty dashboard with
   * an honest label, not a 500.
   */
  private async loadSubject(userId: string): Promise<DashboardSubject> {
    const rows: Array<{ name: string }> = await this.dataSource.query(
      `SELECT trim(u.first_name || ' ' || coalesce(u.last_name, '')) AS name
       FROM users u
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId],
    );

    return { userId, name: rows[0]?.name || 'Unknown employee' };
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
