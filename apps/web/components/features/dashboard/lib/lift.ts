import type { DashboardItem, DashboardSection, MyWorkResponse } from '@tejas96/shared/types';

export type SectionKey = keyof MyWorkResponse['sections'];

/** Project health keeps its critical rows. See the block comment below. */
const DOES_NOT_LIFT: ReadonlySet<SectionKey> = new Set<SectionKey>(['projects']);

export interface LiftResult {
  critical: DashboardItem[];
  /**
   * How many critical items EXIST, from each section's `criticalCount`.
   *
   * Not `critical.length`. That is what survived the backend's per-bucket cap —
   * the rows we can draw — while `criticalCount` counts the whole scoped set,
   * the same set "At a glance · Overdue" sums from the bucket totals. The two
   * describe one set (spec 6.1: every overdue item is critical), so they have to
   * agree; before this they read 92 and 14 side by side on the same screen.
   */
  criticalTotal: number;
  rest: Record<SectionKey, DashboardSection>;
  /**
   * How many critical items each section CONTRIBUTED to Needs attention, taken
   * from the backend's `section.criticalCount`.
   *
   * The true figure for the section's whole scoped set — deliberately NOT the
   * number of rows the lift pulled out of the list on screen. Those two diverge
   * the moment a section holds more criticals than the backend's per-bucket cap
   * ships: finance reported "3 overdue shown above" under a badge reading 118,
   * two inches apart, contradicting each other. The aside now quotes the same
   * population the badge does.
   *
   * It is a change of magnitude, not of WHEN an aside appears: a section with
   * any critical item always delivers at least one of them, because no bucket
   * in any of the five providers mixes critical with non-critical severities,
   * so the head of a critical bucket is always inside the cap.
   *
   * Projects is counted too, though it is copy-only. It contributes its
   * criticals to the block above while also keeping them — which is exactly
   * what its own aside claims underneath.
   */
  criticalBySection: Record<SectionKey, number>;
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
  const criticalBySection = {} as Record<SectionKey, number>;
  let criticalTotal = 0;

  (Object.keys(sections) as SectionKey[]).forEach((key) => {
    const section = sections[key];
    criticalBySection[key] = 0;

    if (section.status !== 'ok') {
      rest[key] = section;
      return;
    }

    // Every section contributes, INCLUDING projects: a copy-only section still
    // puts its critical items in the top block, so they belong in its count.
    // One source for both numbers — the block's badge is the sum of the asides.
    criticalBySection[key] = section.criticalCount;
    criticalTotal += section.criticalCount;

    // A copy-only section contributes its critical items to the top block but
    // KEEPS them. Skipping the scan entirely — as an earlier version did — meant
    // an overdue project reached Needs Attention never, while the projects block
    // claimed underneath that it 'also appears above'.
    const copyOnly = DOES_NOT_LIFT.has(key);

    const buckets = section.buckets
      .map((bucket) => {
        const keep = bucket.items.filter((item) => {
          if (item.severity !== 'critical') return true;
          critical.push(item);
          return copyOnly;
        });
        return { ...bucket, items: keep };
      })
      // A bucket emptied by the lift is empty BY CONSTRUCTION — every overdue
      // item is critical — so rendering its header would be dead UI.
      .filter((bucket) => bucket.items.length > 0);

    rest[key] = { ...section, buckets };
  });

  // Oldest first. There is no severity tie-break because there is no tie to
  // break: everything in this array got here by being critical, so a severity
  // comparator would compare equal on every pair.
  critical.sort((a, b) => {
    const aDue = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });

  return { critical, criticalTotal, rest, criticalBySection };
}

/** "2 overdue shown above" — or nothing, when the section contributed none. */
export function liftedAside(count: number, noun = 'critical'): string | undefined {
  if (count === 0) return undefined;
  return `${count} ${noun} shown above`;
}
