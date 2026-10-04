import type { ReportCondition, ReportDefinition } from '@tejas96/shared/reports';

import { getQuoteSnapshot } from './quote-snapshot.util';
import type { ProjectEntity } from '../../projects/entities/project.entity';

interface ConditionCheck {
  /** False only when the project clearly fails the condition: unknown data keeps the report needed. */
  holds: (project: ProjectEntity) => boolean;
  /** Shown on the report card when the condition fails. */
  notMet: string;
}

/** One entry per ReportCondition. A new check is one entry here plus `onlyWhen` on a report. */
const CONDITIONS: Record<ReportCondition, ConditionCheck> = {
  subsidy: {
    // The approved quote decides it, as it does for the quote's own subsidy line.
    holds: (project) => {
      const snapshot = getQuoteSnapshot(project);
      return snapshot?.inputs?.subsidyApplicable ?? snapshot?.pricing?.isSubsidyApplicable ?? true;
    },
    notMet: 'No subsidy on the approved quote',
  },
};

/** Why the report is not needed for this project, or undefined when it is needed. */
export function notNeededReason(
  definition: ReportDefinition,
  project: ProjectEntity,
): string | undefined {
  if (!definition.onlyWhen) return undefined;
  const check = CONDITIONS[definition.onlyWhen];
  return check.holds(project) ? undefined : check.notMet;
}
