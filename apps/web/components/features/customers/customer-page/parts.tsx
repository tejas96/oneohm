'use client';

import type { CSSProperties, JSX, ReactNode } from 'react';

import { type Gate, useAccessDialog } from '@/lib/rbac';
import { cn } from '@/lib/utils';

/** The small grey caps heading every card and band starts with. */
export const EYEBROW =
  'm-0 text-[12px] font-medium uppercase tracking-[0.04em] text-foreground-tertiary';

/** A green text action: "Open project →", "Schedule", "+ Add". */
export const TEXT_ACTION =
  'text-[13px] font-medium normal-case tracking-normal text-primary-dark hover:underline aria-disabled:opacity-50';

export interface PageCardProps {
  /** Scroll target for an old `?tab=` link (`money`, `followups`, …). */
  id?: string;
  title: ReactNode;
  /** Right of the title: one or two text actions. */
  action?: ReactNode;
  /** The entrance stagger, in the order the cards read. */
  delayMs?: number;
  className?: string;
  children: ReactNode;
}

/** One white card of the customer page. */
export function PageCard({
  id,
  title,
  action,
  delayMs = 0,
  className,
  children,
}: PageCardProps): JSX.Element {
  return (
    <section
      id={id}
      style={{ animationDelay: `${delayMs}ms`, '--calm-rise-y': '8px' } as CSSProperties}
      className={cn(
        // `scroll-mt` clears the pinned bar when an old link scrolls here.
        'min-w-0 scroll-mt-20 animate-calm-rise rounded-rf-xl bg-surface px-5 py-[18px] shadow-e1 [animation-duration:500ms] motion-reduce:animate-none',
        className,
      )}
    >
      <header className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className={EYEBROW}>{title}</h2>
        {action ? <div className="flex flex-none items-center gap-2.5">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** A part inside a card: a hairline, then a quiet heading. */
export function SubHeading({ children }: { children: ReactNode }): JSX.Element {
  return (
    <h3 className="mb-2 mt-4 border-t border-border pt-3.5 text-[12px] font-medium text-foreground-tertiary">
      {children}
    </h3>
  );
}

export interface KvRow {
  label: string;
  value: ReactNode;
}

/** Label and value pairs. The label column is narrow inside the three-card row. */
export function Kv({ rows, narrow = false }: { rows: KvRow[]; narrow?: boolean }): JSX.Element {
  return (
    <dl
      className={cn(
        'm-0 grid gap-x-2.5 gap-y-2 text-[14px] [&_dd]:m-0 [&_dd]:min-w-0 [&_dd]:font-medium [&_dd]:[overflow-wrap:anywhere] [&_dt]:text-foreground-tertiary',
        narrow ? 'grid-cols-[84px_minmax(0,1fr)]' : 'grid-cols-[118px_minmax(0,1fr)]',
      )}
    >
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A fact nobody has entered yet: it says so, and offers the way to enter it. */
export function Missing({
  text = 'Not recorded',
  action,
}: {
  text?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <span className="font-medium text-[var(--ds-warning)]">
      {text}
      {action ? <span className="ml-1.5">{action}</span> : null}
    </span>
  );
}

/** A value that is simply empty and is nobody's job to fill. */
export function Blank(): JSX.Element {
  return <span className="font-normal text-foreground-tertiary">—</span>;
}

/** One line of a short list inside a card: what on the left, a figure or tag on the right. */
export function Line({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-2.5 py-[5px] text-[14px]">
      <div className="min-w-0">
        <div className="[overflow-wrap:anywhere]">{title}</div>
        {sub ? <div className="text-[12px] text-foreground-tertiary">{sub}</div> : null}
      </div>
      {right ? <div className="flex-none whitespace-nowrap font-medium">{right}</div> : null}
    </div>
  );
}

/** "3 more ▾" — opens the rest of a card in place. */
export function MoreToggle({
  open,
  onToggle,
  closedLabel,
  openLabel = 'Show less',
}: {
  open: boolean;
  onToggle: () => void;
  closedLabel: string;
  openLabel?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary-dark hover:underline"
    >
      {open ? openLabel : closedLabel}
      <span aria-hidden className="text-[10px]">
        {open ? '▴' : '▾'}
      </span>
    </button>
  );
}

/** The small round button of a card: dark for the one thing to do, plain for the rest. */
export function PillButton({
  children,
  onClick,
  variant = 'plain',
  disabled = false,
  ariaDisabled = false,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'dark' | 'plain';
  disabled?: boolean;
  /** Blocked by a permission: still clickable, so the access dialog can say why. */
  ariaDisabled?: boolean;
  title?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={ariaDisabled || undefined}
      title={title}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-pill px-3 py-[7px] text-[13px] font-medium shadow-e1 transition-transform duration-200 ease-calm hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        variant === 'dark' ? 'bg-foreground text-white' : 'bg-surface text-foreground-secondary',
      )}
    >
      {children}
    </button>
  );
}

/** A card's "nothing here" line, with the reason under it. */
export function EmptyNote({ title, hint }: { title: string; hint?: string }): JSX.Element {
  return (
    <div className="text-[14px] text-foreground-secondary">
      {title}
      {hint ? <div className="mt-0.5 text-[13px] text-foreground-tertiary">{hint}</div> : null}
    </div>
  );
}

const BONE = 'block rounded-md bg-background-tertiary motion-safe:animate-pulse';

/** A card's placeholder while its own request is out. */
export function CardBones({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-2.5">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className={cn(BONE, 'h-3.5', index % 2 ? 'w-3/5' : 'w-4/5')} />
      ))}
    </div>
  );
}

/** A card whose request failed says so; it never shows an empty or zero state instead. */
export function CardError({ what, onRetry }: { what: string; onRetry: () => void }): JSX.Element {
  return (
    <div className="text-[14px] text-foreground-secondary">
      Could not load {what}.{' '}
      <button type="button" onClick={onRetry} className={TEXT_ACTION}>
        Try again
      </button>
    </div>
  );
}

/**
 * Where a card would be for a user without its permission. The old tabs stayed
 * visible and opened the access dialog; a card that just vanished would hide
 * that there is something to ask for.
 */
export function LockedCard({
  id,
  title,
  gate,
  delayMs,
}: {
  id: string;
  title: string;
  gate: Gate;
  delayMs?: number;
}): JSX.Element {
  const { requestAccess } = useAccessDialog();
  return (
    <PageCard id={id} title={title} delayMs={delayMs}>
      <p className="m-0 text-[14px] text-foreground-secondary">
        You do not have access to this part.{' '}
        <button type="button" className={TEXT_ACTION} onClick={() => requestAccess(gate, title)}>
          Ask for access
        </button>
      </p>
    </PageCard>
  );
}
