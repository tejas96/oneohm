'use client';

import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { type ChangeEvent, type JSX, type ReactNode, useState } from 'react';

import type { CrmColumn, CrmQuickFilter, CrmTone } from './types';

import { TableFiltersToggle, type FilterState } from '@/components/shared/advanced-table';
import { color, crm, radius, shadow } from '@/lib/theme/tokens';

// ============================================================================
// Quick-filter chip
// ============================================================================

/**
 * Foreground / dot colour per tone. The DS pairs a readable foreground with a
 * vivid `-main` fill; a chip's text takes the readable one and its dot the
 * vivid one, so the dot stays legible at 5px without dragging the label's
 * contrast down with it.
 */
const TONE_INK: Record<CrmTone, string> = {
  neutral: color.neutral,
  accent: color['accent-ink'],
  success: color.success,
  info: color.info,
  warning: color.warning,
  danger: color.danger,
};

const TONE_DOT: Record<CrmTone, string> = {
  neutral: color['neutral-400'],
  accent: color.accent,
  success: color['success-main'],
  info: color['info-main'],
  warning: color['warning-main'],
  danger: color.danger,
};

interface CrmQuickFilterChipProps {
  filter: CrmQuickFilter;
  active: boolean;
  onClick: () => void;
}

function CrmQuickFilterChip({ filter, active, onClick }: CrmQuickFilterChipProps): JSX.Element {
  const tone = filter.tone ?? 'neutral';

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: crm['toolbar-chip-height'],
        px: 1.25,
        // Chips are always pill in the DS — non-negotiable.
        borderRadius: radius.pill,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: crm['text-row-sm'],
        fontWeight: 500,
        whiteSpace: 'nowrap',
        transition: `background var(--dur-micro) var(--ease-standard), color var(--dur-micro) var(--ease-standard)`,
        // Selected reads as the accent wash; unselected as a sunken well. No
        // borders anywhere — hierarchy comes from luminance in this DS.
        backgroundColor: active ? color['accent-subtle'] : color['canvas-sunken'],
        color: active ? color['accent-ink'] : TONE_INK[tone],
        '&:hover': {
          backgroundColor: active ? color['accent-subtle'] : color['neutral-200'],
        },
      }}
    >
      {filter.dot ? (
        <Box
          component="span"
          sx={{
            width: crm['status-dot-size'],
            height: crm['status-dot-size'],
            borderRadius: '50%',
            backgroundColor: TONE_DOT[tone],
            flexShrink: 0,
          }}
        />
      ) : null}
      {filter.label}
      {filter.count !== undefined ? (
        <Box component="span" sx={{ color: 'inherit', opacity: 0.65 }}>
          · {filter.count}
        </Box>
      ) : null}
    </Box>
  );
}

// ============================================================================
// Column visibility menu
// ============================================================================

interface CrmColumnVisibilityMenuProps<TRow> {
  columns: CrmColumn<TRow>[];
  visibleColumns: Set<string>;
  onToggle: (field: string) => void;
}

function CrmColumnVisibilityMenu<TRow>({
  columns,
  visibleColumns,
  onToggle,
}: CrmColumnVisibilityMenuProps<TRow>): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const hideableColumns = columns.filter((c) => c.hideable !== false && c.header !== '');

  return (
    <>
      <Tooltip title="Toggle columns">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Columns"
          sx={{
            width: crm['toolbar-control-size'],
            height: crm['toolbar-control-size'],
            color: color['text-secondary'],
            '&:hover': { backgroundColor: color['canvas-sunken'] },
          }}
        >
          <ViewColumnIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { boxShadow: shadow.e3, borderRadius: radius['rf-lg'] } } }}
      >
        {hideableColumns.map((col) => (
          <MenuItem key={col.field} dense onClick={() => onToggle(col.field)} sx={{ px: 1.5 }}>
            <FormControlLabel
              control={
                <Checkbox size="small" checked={visibleColumns.has(col.field)} sx={{ p: 0.5 }} />
              }
              label={<Typography variant="body2">{col.header}</Typography>}
              sx={{ m: 0, gap: 1 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ============================================================================
// Toolbar
// ============================================================================

interface CrmTableToolbarProps<TRow> {
  columns: CrmColumn<TRow>[];
  visibleColumns: Set<string>;
  onToggleColumn: (field: string) => void;

  searchQuery: string;
  onSearchInput: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  searchPlaceholder: string;
  enableSearch: boolean;

  quickFilters?: CrmQuickFilter[];
  activeQuickFilter?: string;
  onQuickFilterChange?: (key: string) => void;

  /** Rendered only when the parent supplied filterable columns. */
  showFilters: boolean;
  filterModel: FilterState;
  filtersOpen: boolean;
  onToggleFilters: (e: React.MouseEvent<HTMLButtonElement>) => void;

  showColumnVisibility: boolean;
  toolbarActions?: ReactNode;
}

/**
 * The CRM toolbar: search, quick-filter chips, then the filter and column
 * affordances pushed to the right.
 *
 * The filter *button* is the shared `TableFiltersToggle` (active-count badge
 * included) and the popover it opens is the shared `TableFilters` — rendered by
 * `CrmTable` itself, since the popover must sit outside the toolbar's flex row.
 */
export function CrmTableToolbar<TRow>({
  columns,
  visibleColumns,
  onToggleColumn,
  searchQuery,
  onSearchInput,
  onClearSearch,
  searchPlaceholder,
  enableSearch,
  quickFilters,
  activeQuickFilter,
  onQuickFilterChange,
  showFilters,
  filterModel,
  filtersOpen,
  onToggleFilters,
  showColumnVisibility,
  toolbarActions,
}: CrmTableToolbarProps<TRow>): JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: crm['toolbar-gap'],
        px: crm['row-gutter'],
        py: crm['toolbar-pad-y'],
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      {enableSearch ? (
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={onSearchInput}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: color['text-tertiary'] }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={onClearSearch}
                  aria-label="Clear search"
                  sx={{ p: 0.25 }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          // Radius stays with the theme's functional input (10px); only the
          // design's width and control height are set here.
          sx={{
            width: crm['toolbar-search-width'],
            '& .MuiOutlinedInput-root': { height: crm['toolbar-input-height'] },
          }}
        />
      ) : null}

      {quickFilters && quickFilters.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: crm['toolbar-chip-gap'],
            flexWrap: 'wrap',
          }}
        >
          {quickFilters.map((filter) => (
            <CrmQuickFilterChip
              key={filter.key}
              filter={filter}
              active={(activeQuickFilter ?? '') === filter.key}
              onClick={() => onQuickFilterChange?.(filter.key)}
            />
          ))}
        </Box>
      ) : null}

      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {showFilters ? (
          <TableFiltersToggle filters={filterModel} open={filtersOpen} onToggle={onToggleFilters} />
        ) : null}

        {showColumnVisibility ? (
          <CrmColumnVisibilityMenu
            columns={columns}
            visibleColumns={visibleColumns}
            onToggle={onToggleColumn}
          />
        ) : null}

        {toolbarActions}
      </Box>
    </Box>
  );
}
