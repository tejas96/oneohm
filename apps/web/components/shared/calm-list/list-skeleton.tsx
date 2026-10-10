import type { JSX, ReactNode } from 'react';

/** One grey bar of a loading placeholder. */
export const BONE = 'animate-pulse rounded-pill bg-background-tertiary motion-reduce:animate-none';

/** The card a placeholder row sits in — the same card a real row has. */
export const SKELETON_CARD = 'rounded-rf-xl bg-surface px-5 py-4 shadow-e1';

/** `rows` placeholders, each shaped like the list's real row so nothing jumps when data lands. */
export function ListSkeleton({
  rows,
  label,
  renderRow,
}: {
  rows: number;
  /** "Loading customers". */
  label: string;
  renderRow: () => ReactNode;
}): JSX.Element {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index}>{renderRow()}</div>
      ))}
    </div>
  );
}
