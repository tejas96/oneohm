'use client';

import { Box, Skeleton, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { JSX, ReactNode } from 'react';

import type { CrmTone } from '@/components/shared/crm-table';

/**
 * Shared building blocks for the customer detail page.
 *
 * Every tab used to invent its own card, its own section title and its own
 * empty state, which is why nine tabs read as nine different products. These
 * are the small set of pieces they now share.
 *
 * The governing DS rule applies throughout: **hierarchy comes from luminance
 * and soft shadow, never from lines.** Nothing here draws a 1px border — a
 * surface separates because it is brighter than the canvas and carries a wide,
 * low-opacity shadow.
 */

// ============================================================================
// Tone
// ============================================================================

/**
 * Reuses `CrmTone` rather than declaring a parallel union: a customer that
 * reads "success" in the list must read "success" here too, and sharing the
 * type means a new tone can never exist on one surface only.
 */
export type DetailTone = CrmTone;

interface ToneInk {
  /** Foreground — text, icon strokes, dots. */
  ink: string;
  /** Flat semantic tint for the surface behind it. Never translucent. */
  tint: string;
}

export const TONE_INK = {
  neutral: { ink: 'var(--ds-text-secondary)', tint: 'var(--ds-canvas-sunken)' },
  accent: { ink: 'var(--ds-accent)', tint: 'var(--ds-accent-subtle)' },
  success: { ink: 'var(--ds-success-main)', tint: 'var(--ds-success-bg)' },
  info: { ink: 'var(--ds-info-main)', tint: 'var(--ds-info-bg)' },
  warning: { ink: 'var(--ds-warning-main)', tint: 'var(--ds-warning-bg)' },
  danger: { ink: 'var(--ds-danger)', tint: 'var(--ds-danger-bg)' },
} satisfies Record<DetailTone, ToneInk>;

// ============================================================================
// Surfaces
// ============================================================================

export interface DetailCardProps {
  children: ReactNode;
  /** Merged onto the card. Use for grid placement, not for borders. */
  sx?: SxProps<Theme>;
  /** Card padding. `none` when the card owns a table that bleeds to its edges. */
  padding?: 'none' | 'default';
  className?: string;
}

/**
 * The page's only surface. White on the grey canvas, 12px radius (the DS
 * *functional* density value this data-heavy app runs at), `e2` shadow.
 */
export function DetailCard({
  children,
  sx,
  padding = 'default',
  className,
}: DetailCardProps): JSX.Element {
  return (
    <Box
      className={className}
      sx={[
        {
          bgcolor: 'var(--ds-surface)',
          borderRadius: 'var(--radius-card-functional)',
          boxShadow: 'var(--shadow-e2)',
          p: padding === 'none' ? 0 : { xs: 2, md: 2.5 },
          minWidth: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// Section heading
// ============================================================================

export interface SectionHeadingProps {
  children: ReactNode;
  /** Rendered right-aligned on the same line — a button or link, kept small. */
  action?: ReactNode;
  /** Appended after the label in a lighter weight, e.g. a count. */
  count?: number;
  sx?: SxProps<Theme>;
}

/**
 * The overline micro-label — 11px / 700 / 0.12em uppercase — is a signature
 * device of the design system, and it is what replaces the boxed card titles
 * the page used to draw. It names a section without costing a line or a rule.
 */
export function SectionHeading({ children, action, count, sx }: SectionHeadingProps): JSX.Element {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1.5}
      sx={[{ mb: 1.5, minHeight: 28 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Stack direction="row" alignItems="baseline" gap={0.75} sx={{ minWidth: 0 }}>
        <Typography
          component="h3"
          sx={{
            fontSize: 'var(--text-overline-size)',
            fontWeight: 700,
            letterSpacing: 'var(--text-overline-track)',
            textTransform: 'uppercase',
            color: 'var(--ds-text-secondary)',
            lineHeight: 1.2,
          }}
        >
          {children}
        </Typography>
        {count !== undefined && (
          <Typography
            component="span"
            sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-overline-size)',
              fontWeight: 700,
              color: 'var(--ds-text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {count}
          </Typography>
        )}
      </Stack>
      {action}
    </Stack>
  );
}

// ============================================================================
// Fields
// ============================================================================

export interface FieldProps {
  label: string;
  value: ReactNode;
  /** Renders the value in the mono face — for IDs, consumer numbers, codes. */
  mono?: boolean;
  /** Span both columns of a `FieldGrid` — for addresses and notes. */
  wide?: boolean;
}

/**
 * A label/value pair. The label is a caption above the value rather than a
 * left column: at 288–360px of card width a two-column layout truncates every
 * value it holds, which is what made the old contact card unreadable.
 */
export function Field({ label, value, mono }: FieldProps): JSX.Element {
  const isEmpty = value === null || value === undefined || value === '' || value === '—';

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: 'var(--ds-text-tertiary)',
          lineHeight: 1.4,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Typography
          sx={{
            fontSize: '0.8125rem',
            lineHeight: 1.45,
            color: isEmpty ? 'var(--ds-text-tertiary)' : 'var(--ds-text-primary)',
            ...(mono && { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }),
            overflowWrap: 'anywhere',
          }}
        >
          {isEmpty ? '—' : value}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {value}
        </Box>
      )}
    </Box>
  );
}

export interface FieldGridProps {
  fields: FieldProps[];
  /** Columns at `sm` and up. Defaults to 2. */
  columns?: 1 | 2 | 3;
}

/** Fields on a grid, with `wide` entries spanning the full row. */
export function FieldGrid({ fields, columns = 2 }: FieldGridProps): JSX.Element {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${columns}, minmax(0, 1fr))` },
        columnGap: 2,
        rowGap: 1.75,
      }}
    >
      {fields.map((field) => (
        <Box
          key={field.label}
          sx={{ minWidth: 0, gridColumn: field.wide ? { sm: '1 / -1' } : undefined }}
        >
          <Field {...field} />
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// Icon circle
// ============================================================================

export interface IconCircleProps {
  children: ReactNode;
  tone?: DetailTone;
  /** 32px is the DS functional-density size; 40px the expressive one. */
  size?: 28 | 32 | 40;
}

/**
 * The signature circular icon container — a flat tint of a semantic colour,
 * with the icon drawn in that colour's ink.
 */
export function IconCircle({
  children,
  tone = 'neutral',
  size = 32,
}: IconCircleProps): JSX.Element {
  const { ink, tint } = TONE_INK[tone];
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        bgcolor: tint,
        color: ink,
        display: 'grid',
        placeItems: 'center',
        '& svg': { fontSize: size === 40 ? 20 : 16 },
      }}
    >
      {children}
    </Box>
  );
}

// ============================================================================
// Pills
// ============================================================================

export interface TonePillProps {
  label: ReactNode;
  tone?: DetailTone;
  /** Leading tone-coloured dot, so state is never carried by colour alone. */
  dot?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
}

/** A fully-pill status/signal chip on a flat semantic tint. */
export function TonePill({
  label,
  tone = 'neutral',
  dot,
  onClick,
  icon,
}: TonePillProps): JSX.Element {
  const { ink, tint } = TONE_INK[tone];
  const interactive = Boolean(onClick);

  return (
    <Box
      component={interactive ? 'button' : 'span'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        px: 1.125,
        height: 24,
        borderRadius: 'var(--radius-pill)',
        bgcolor: tint,
        color: ink,
        fontSize: '0.6875rem',
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        border: 'none',
        fontFamily: 'inherit',
        ...(interactive && {
          cursor: 'pointer',
          transition: 'filter 120ms var(--ease-standard)',
          '&:hover': { filter: 'brightness(0.96)' },
          '&:focus-visible': {
            outline: '2px solid var(--ds-accent)',
            outlineOffset: 2,
          },
        }),
        '& svg': { fontSize: 13 },
      }}
    >
      {dot && (
        <Box
          aria-hidden
          sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: ink, flexShrink: 0 }}
        />
      )}
      {icon}
      {label}
    </Box>
  );
}

// ============================================================================
// Numerals
// ============================================================================

export interface MonoProps {
  children: ReactNode;
  /** Larger, heavier — for the one number a card is actually about. */
  emphasis?: boolean;
  tone?: DetailTone;
  sx?: SxProps<Theme>;
}

/**
 * All numeric data is tabular so figures line up column-to-column — the DS
 * calls this out specifically, and it is what makes a money column scannable.
 */
export function Mono({ children, emphasis, tone, sx }: MonoProps): JSX.Element {
  return (
    <Typography
      component="span"
      sx={[
        {
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: emphasis ? '0.9375rem' : '0.8125rem',
          fontWeight: emphasis ? 600 : 400,
          lineHeight: 1.4,
          color: tone ? TONE_INK[tone].ink : 'var(--ds-text-primary)',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Typography>
  );
}

// ============================================================================
// Empty + loading
// ============================================================================

export interface EmptyPaneProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** Compact fits inside a card next to other content; `page` fills a tab. */
  size?: 'compact' | 'page';
}

/**
 * One empty state for the whole page. Copy is encouraging rather than
 * apologetic, and centre-aligned — the DS rule for non-data prose.
 */
export function EmptyPane({
  title,
  description,
  icon,
  action,
  size = 'compact',
}: EmptyPaneProps): JSX.Element {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={1}
      sx={{ textAlign: 'center', py: size === 'page' ? 7 : 3.5, px: 2 }}
    >
      {icon && (
        <IconCircle tone="neutral" size={40}>
          {icon}
        </IconCircle>
      )}
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ds-text-primary)' }}>
        {title}
      </Typography>
      {description && (
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: 'var(--ds-text-secondary)',
            maxWidth: '42ch',
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 0.5 }}>{action}</Box>}
    </Stack>
  );
}

/** Skeleton rows sized to the table shell, so loading doesn't change layout. */
export function RowSkeleton({ rows = 4 }: { rows?: number }): JSX.Element {
  return (
    <Stack gap={0.75} sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={40} sx={{ borderRadius: 1 }} />
      ))}
    </Stack>
  );
}
