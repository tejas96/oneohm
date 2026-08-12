import type { SxProps, Theme } from '@mui/material/styles';

// ============================================================================
// Detail pages — design-system surfaces
//
// Shared by the customer detail page and the property (site) detail page, so
// the two navigate, list and read identically. The property page imports these
// modules directly rather than through the feature barrel — the barrel would
// close a cycle back into `features/properties`.
// ============================================================================

/**
 * Avatar for the identity band.
 *
 * A flat 10% brand tint with the initials drawn in the brand ink, rather than
 * a solid green disc: the DS reserves saturated brand fill for nothing at all
 * ("colour is atmosphere, not decoration") and uses the circular tinted
 * container as its signature identity shape.
 */
export const customerAvatarSx: SxProps<Theme> = {
  width: { xs: 44, md: 52 },
  height: { xs: 44, md: 52 },
  bgcolor: 'var(--ds-accent-subtle)',
  color: 'var(--ds-accent)',
  fontWeight: 700,
  fontSize: { xs: '0.875rem', md: '1rem' },
  letterSpacing: '-0.01em',
};

/**
 * Sticky tab rail.
 *
 * The page header used to be the sticky element, which cost ~150px of every
 * screen on a laptop and pinned information you only read once. The *tabs* are
 * what you reach for repeatedly, so they hold the sticky slot instead and the
 * header scrolls away.
 */
export const stickyTabRailSx: SxProps<Theme> = {
  position: 'sticky',
  top: 'var(--header-height, 48px)',
  zIndex: 10,
  py: 1,
  mx: { xs: -2, md: -3 },
  px: { xs: 2, md: 3 },
  bgcolor: 'var(--ds-canvas)',
};

/**
 * Table styling shared by every tab that lists rows.
 *
 * Applied to a MUI `<Table>` so the tabs keep real table semantics and MUI's
 * own components — only the paint changes. Three things happen here:
 *
 *   1. Every default `border-bottom` is removed. The DS forbids structural
 *      lines; separation comes from the zebra stripe instead.
 *   2. Headers become the overline micro-label (11px / 700 / 0.12em upper).
 *   3. Rows alternate `surface` / `surface-alt`, the DS functional-density
 *      pattern, and hover raises the row by luminance rather than a rule.
 */
export const detailTableSx: SxProps<Theme> = {
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-root': {
    borderBottom: 'none',
    fontSize: '0.8125rem',
    color: 'var(--ds-text-primary)',
    px: 1.5,
    py: 1.25,
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    fontSize: 'var(--text-overline-size)',
    fontWeight: 700,
    letterSpacing: 'var(--text-overline-track)',
    textTransform: 'uppercase',
    color: 'var(--ds-text-secondary)',
    bgcolor: 'var(--ds-surface)',
    whiteSpace: 'nowrap',
    py: 1,
  },
  '& .MuiTableBody-root .MuiTableRow-root': {
    transition: 'background-color 120ms var(--ease-standard)',
  },
  '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
    bgcolor: 'var(--ds-surface-alt)',
  },
  '& .MuiTableBody-root .MuiTableRow-root:hover': {
    bgcolor: 'var(--ds-accent-subtle)',
  },
  /** Money and counts line up column-to-column. */
  '& .MuiTableCell-alignRight': {
    fontFamily: 'var(--font-mono)',
    fontVariantNumeric: 'tabular-nums',
  },
};

/** Wrapper for a `detailTableSx` table: a card that lets the grid bleed to its edges. */
export const tableCardSx: SxProps<Theme> = {
  bgcolor: 'var(--ds-surface)',
  borderRadius: 'var(--radius-card-functional)',
  boxShadow: 'var(--shadow-e2)',
  overflow: 'hidden',
};
