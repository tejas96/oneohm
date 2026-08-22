import type { DashboardItem, DashboardSection, MyWorkResponse } from '@tejas96/shared/types';

export type SectionKey = keyof MyWorkResponse['sections'];

/** Project health keeps its critical rows. See the block comment below. */
const DOES_NOT_LIFT: ReadonlySet<SectionKey> = new Set<SectionKey>(['projects']);

export interface LiftResult {
  critical: DashboardItem[];
  rest: Record<SectionKey, DashboardSection>;
  liftedBySection: Record<SectionKey, number>;
}

/**
 * Move critical items into the top block.
 *
 * This is a RENDERING rule, not a query rule. Every section's `total` is left
 * exactly as the backend reported it, so a badge always describes the whole set
 * even when the card beneath it shows what is left after the lift.
 *
 * `projects` is exempt: it is a per-project health summary rather than a list of
 * items, and lifting its overdue projects away would leave a block that only
 * ever shows projects that are fine — the opposite of its purpose. An overdue
 * project therefore appears twice on purpose, and the block says so.
 */
export function liftCritical(sections: MyWorkResponse['sections']): LiftResult {
  const critical: DashboardItem[] = [];
  const rest = {} as Record<SectionKey, DashboardSection>;
  const liftedBySection = {} as Record<SectionKey, number>;

  (Object.keys(sections) as SectionKey[]).forEach((key) => {
    const section = sections[key];
    liftedBySection[key] = 0;

    if (section.status !== 'ok' || DOES_NOT_LIFT.has(key)) {
      rest[key] = section;
      return;
    }

    let lifted = 0;
    const buckets = section.buckets
      .map((bucket) => {
        const keep = bucket.items.filter((item) => {
          if (item.severity !== 'critical') return true;
          critical.push(item);
          lifted += 1;
          return false;
        });
        return { ...bucket, items: keep };
      })
      // A bucket whose every item lifted is empty BY CONSTRUCTION — every
      // overdue item is critical — so rendering its header would be dead UI.
      .filter((bucket) => bucket.items.length > 0);

    liftedBySection[key] = lifted;
    rest[key] = { ...section, buckets };
  });

  const order = { critical: 0, warning: 1, info: 2 } as const;
  critical.sort((a, b) => {
    const bySeverity = order[a.severity] - order[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const aDue = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });

  return { critical, rest, liftedBySection };
}

/** "2 overdue shown above" — or nothing, when none were lifted. */
export function liftedAside(count: number, noun = 'critical'): string | undefined {
  if (count === 0) return undefined;
  return `${count} ${noun} shown above`;
}
