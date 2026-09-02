'use client';

import { RotateCw } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Shared building blocks for the project detail page.
 *
 * The governing design-system rule applies throughout: **hierarchy comes from
 * luminance and soft shadow, never from lines.** Nothing here draws a 1px
 * border. A surface separates because it is brighter than the canvas and
 * carries a wide, low-opacity shadow; a state separates because it sits on a
 * flat semantic tint.
 *
 * Colour is taken from the `--ds-*` custom properties that
 * `lib/theme/tokens.ts` emits, so a token change lands here without a hunt
 * through JSX. The readable ink of each tone is used for text and icons; the
 * vivid `-main` fill is reserved for chart marks.
 */

// ============================================================================
// Tone
// ============================================================================

export type Tone = 'neutral' | 'accent' | 'success' | 'info' | 'warning' | 'danger';

export interface ToneInk {
  /** Foreground — text, icon strokes, dots. WCAG-safe on the tint. */
  ink: string;
  /** Flat semantic tint for the surface behind it. Never translucent. */
  tint: string;
}

export const TONE: Record<Tone, ToneInk> = {
  neutral: { ink: 'var(--ds-text-secondary)', tint: 'var(--ds-canvas-sunken)' },
  accent: { ink: 'var(--ds-accent-ink)', tint: 'var(--ds-accent-subtle)' },
  success: { ink: 'var(--ds-success)', tint: 'var(--ds-success-bg)' },
  info: { ink: 'var(--ds-info)', tint: 'var(--ds-info-bg)' },
  warning: { ink: 'var(--ds-warning)', tint: 'var(--ds-warning-bg)' },
  danger: { ink: 'var(--ds-danger)', tint: 'var(--ds-danger-bg)' },
};

// ============================================================================
// Typography
// ============================================================================

/** The signature overline micro-label — 11px / 700 / 0.12em, uppercase. */
export function Overline({
  children,
  className,
  as: Tag = 'h2',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3' | 'span' | 'p';
}): React.JSX.Element {
  return (
    <Tag
      className={cn(
        'text-[11px] font-bold uppercase leading-[1.2] tracking-[0.12em] text-foreground-secondary',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Tabular mono numerals — IDs, consumer numbers, exact rupee figures, counts. */
export function Mono({
  children,
  className,
  style,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Carries the full value when the visible text is shortened. */
  title?: string;
}): React.JSX.Element {
  return (
    <span className={cn('font-mono tabular-nums', className)} style={style} title={title}>
      {children}
    </span>
  );
}

// ============================================================================
// Surfaces
// ============================================================================

export interface DetailCardProps {
  /** Small uppercase label, e.g. "Money". */
  label: string;
  /** Quiet text right of the label — a count, a scope note. */
  aside?: React.ReactNode;
  /** A control pinned right of the label — a link or a small button. */
  action?: React.ReactNode;
  isError?: boolean;
  onRetry?: () => void;
  /** Height the retry state occupies, so a failed card does not collapse the grid. */
  errorHeight?: number;
  children: React.ReactNode;
  className?: string;
  /** Merged onto the section — used for the mount stagger. */
  style?: React.CSSProperties;
}

/**
 * The page's only surface. White on the stone canvas, 24px radius (the
 * expressive card value the dashboard's Business mode runs on), `e2` shadow.
 *
 * Failure is contained here rather than in each card: one card showing a retry
 * while the other seven render is the whole point of a query per panel.
 */
export function DetailCard({
  label,
  aside,
  action,
  isError = false,
  onRetry,
  errorHeight = 160,
  children,
  className,
  style,
}: DetailCardProps): React.JSX.Element {
  return (
    <section
      className={cn('min-w-0 rounded-3xl bg-surface px-[22px] pb-[18px] pt-5 shadow-e2', className)}
      style={style}
    >
      <div className="flex min-h-[26px] items-center gap-2.5 pb-3">
        <Overline>{label}</Overline>
        {aside ? (
          <span className="text-[11.5px] tabular-nums text-foreground-tertiary">{aside}</span>
        ) : null}
        {action ? <div className="ml-auto flex shrink-0 items-center">{action}</div> : null}
      </div>

      {isError ? <ErrorPane label={label} onRetry={onRetry} height={errorHeight} /> : children}
    </section>
  );
}

/**
 * BROKEN — this card only. Every other card on the page still draws.
 */
export function ErrorPane({
  label,
  onRetry,
  height = 160,
}: {
  label: string;
  onRetry?: () => void;
  height?: number;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-start justify-center gap-3" style={{ minHeight: height }}>
      <p className="text-[13px] text-foreground-secondary">
        {label} didn&apos;t load. Nothing else on this page is affected.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-accent-subtle px-3.5 text-[12.5px] font-medium text-primary-dark transition-[filter] duration-fast hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RotateCw className="size-3" aria-hidden />
          Retry
        </button>
      ) : null}
    </div>
  );
}

// ============================================================================
// Pills, circles, links
// ============================================================================

export interface TonePillProps {
  label: React.ReactNode;
  tone?: Tone;
  /** Leading tone-coloured dot, so state is never carried by colour alone. */
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

/** A fully-pill status chip on a flat semantic tint. */
export function TonePill({
  label,
  tone = 'neutral',
  dot,
  icon,
  className,
  title,
}: TonePillProps): React.JSX.Element {
  const { ink, tint } = TONE[tone];
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-[11px] font-semibold leading-none',
        className,
      )}
      style={{ background: tint, color: ink }}
    >
      {dot ? (
        <span aria-hidden className="size-[5px] rounded-full" style={{ background: ink }} />
      ) : null}
      {icon}
      {label}
    </span>
  );
}

export interface IconCircleProps {
  children: React.ReactNode;
  tone?: Tone;
  /** 32px is the functional-density size; 40px the expressive one. */
  size?: 24 | 28 | 32 | 40;
  className?: string;
}

/** The signature circular icon container — a flat tint with the icon in ink. */
export function IconCircle({
  children,
  tone = 'neutral',
  size = 32,
  className,
}: IconCircleProps): React.JSX.Element {
  const { ink, tint } = TONE[tone];
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full', className)}
      style={{ width: size, height: size, background: tint, color: ink }}
    >
      {children}
    </span>
  );
}

/** The bottom-of-card deep link: "Open money ›". */
export function CardLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}): React.JSX.Element {
  const classes = cn(
    'inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-dark transition-colors duration-fast hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-rf-xs',
    className,
  );
  const chevron = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        {chevron}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
      {chevron}
    </Link>
  );
}

// ============================================================================
// Empty
// ============================================================================

export interface EmptyPaneProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
  /** Compact fits beside other content; `page` fills a tab. */
  size?: 'compact' | 'page';
}

/**
 * One empty state for the whole page. Copy is a statement of where things
 * stand, never an apology, and is centre-aligned — the rule for non-data prose.
 */
export function EmptyPane({
  title,
  description,
  icon,
  tone = 'neutral',
  action,
  size = 'compact',
}: EmptyPaneProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 px-4 text-center',
        size === 'page' ? 'py-14' : 'py-6',
      )}
    >
      {icon ? (
        <IconCircle tone={tone} size={40} className="mb-1">
          {icon}
        </IconCircle>
      ) : null}
      <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-[42ch] text-[12.5px] leading-relaxed text-foreground-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}

// ============================================================================
// Rows
// ============================================================================

/**
 * A list row that is a link. Hover raises it by luminance, never by a rule.
 * Padding is pulled back into the card gutter so the hover tint reaches the
 * card edge while the content stays on the grid.
 */
export function RowLink({
  href,
  children,
  className,
  title,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      title={title}
      className={cn(
        '-mx-2.5 flex min-w-0 items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors duration-fast hover:bg-background-tertiary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Thin progress track. `tone` colours the fill; the track is the sunken canvas. */
export function Track({
  pct,
  tone = 'accent',
  height = 4,
  className,
  color,
}: {
  pct: number;
  tone?: Tone;
  height?: number;
  className?: string;
  /** Overrides the tone ink — for the time axis, which is blue by rule. */
  color?: string;
}): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <span
      aria-hidden
      className={cn('block w-full overflow-hidden rounded-pill', className)}
      style={{ height, background: 'var(--ds-canvas-sunken)' }}
    >
      <span
        className="block h-full rounded-pill transition-[width] duration-slow ease-out"
        style={{ width: `${clamped}%`, background: color ?? TONE[tone].ink }}
      />
    </span>
  );
}

// ============================================================================
// Toolbar
// ============================================================================

/**
 * The filter row that sits under a card's header.
 *
 * Controls float on the card surface with no dividers between them — the DS
 * has no structural lines, so groups separate by gap alone.
 */
export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-2 pb-3', className)}>
      {children}
    </div>
  );
}

/**
 * `value` is omitted from the native button attributes on purpose: this
 * component uses it for the chosen filter label, and `<button value>` means
 * something else entirely (the value submitted with a form).
 */
export interface FilterButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  icon?: React.ReactNode;
  /** The filter's name, e.g. "Status". Shown when nothing is chosen. */
  label: string;
  /**
   * The chosen value, e.g. "In progress". When set the button reads
   * "Status · In progress" and takes the accent tint, so the active filter is
   * legible from the control itself. That is what replaced the row of chips
   * this toolbar used to draw underneath — the chips restated what the buttons
   * were already showing.
   */
  value?: string | null;
  onClear?: () => void;
}

/** A pill filter trigger. Quiet when unset, accent-tinted when a value is chosen. */
export const FilterButton = React.forwardRef<HTMLButtonElement, FilterButtonProps>(
  ({ icon, label, value, onClear, className, ...props }, ref) => {
    const active = Boolean(value);
    return (
      <span
        className={cn(
          'inline-flex h-8 shrink-0 items-center rounded-pill transition-colors duration-fast',
          active
            ? 'bg-accent-subtle text-primary-dark'
            : 'bg-background-tertiary text-foreground-secondary hover:text-foreground',
          className,
        )}
      >
        <button
          ref={ref}
          type="button"
          className={cn(
            'inline-flex h-8 min-w-0 items-center gap-1.5 rounded-pill px-3.5 text-[12.5px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            active && onClear && 'pr-1.5',
          )}
          {...props}
        >
          {icon ? <span className="shrink-0 [&>svg]:size-3.5">{icon}</span> : null}
          <span className="truncate">{label}</span>
          {active ? (
            <>
              <span aria-hidden className="opacity-40">
                ·
              </span>
              <span className="max-w-[140px] truncate font-semibold">{value}</span>
            </>
          ) : null}
        </button>
        {active && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label} filter`}
            className="mr-1.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-fast hover:bg-primary-dark/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </span>
    );
  },
);
FilterButton.displayName = 'FilterButton';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/**
 * A pill segmented control — the same shape as the page's tab rail, one step
 * smaller. Replaces MUI's `ToggleButtonGroup`, which draws outlined boxes.
 */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 gap-0.5 rounded-pill bg-background-tertiary p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-[12px] font-medium transition-all duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              selected
                ? 'bg-surface text-foreground shadow-e1'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            {option.icon ? <span className="[&>svg]:size-3.5">{option.icon}</span> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tables
// ============================================================================

/**
 * A row grid that bleeds to the card's edge.
 *
 * The card pads its content by 22px; a data row wants its hover tint and zebra
 * stripe to reach the edge while the text stays on the grid, so rows pull that
 * padding back with a negative margin and re-apply it inside.
 */
export const ROW_BLEED = '-mx-[22px] px-[22px]';

/** Column header for a data list: the overline device, not a grey bar. */
export function ColumnHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'truncate text-[9.5px] font-bold uppercase tracking-[0.1em] text-foreground-tertiary',
        className,
      )}
    >
      {children}
    </span>
  );
}
