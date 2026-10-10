'use client';

import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  MenuItem,
  OutlinedInput,
  Popover,
  Portal,
  Select,
  Stack,
  TextField,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { type JSX, memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import type { ColumnConfig, FilterState, FilterType } from './types';
import { toSortableString } from './utils';

import { cn, formatDate } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface TableFiltersProps<TRow> {
  columns: ColumnConfig<TRow>[];
  filters: FilterState;
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  onFilterChange: (filters: FilterState) => void;
  /**
   * `popover` (default) hangs the panel under its button. `drawer` opens it as
   * a side panel that stays open beside the list, so the rows can be watched
   * while they filter; a page makes room for it by reading `--filters-drawer-w`.
   */
  presentation?: 'popover' | 'drawer';
  /** Drawer only: what the list holds now ("265 customers"), shown under the title. */
  resultLabel?: string;
}

/** Above MUI Popover (1300) so autocomplete menus are not clipped inside filter panels. */
const FILTER_AUTOCOMPLETE_Z_INDEX = 1600;

interface FilterAutocompleteOption {
  label: string;
  value: string;
}

export interface FilterAutocompleteProps {
  options: FilterAutocompleteOption[];
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder: string;
}

/**
 * Autocomplete for filter popovers. Uses a portal + elevated z-index so the
 * listbox is not clipped by the popover paper's overflow scroll container.
 */
export function FilterAutocomplete({
  options,
  value,
  onChange,
  placeholder,
}: FilterAutocompleteProps): JSX.Element {
  const selectedOption = options.find((option) => String(option.value) === String(value)) ?? null;

  return (
    <Autocomplete
      size="small"
      fullWidth
      options={options}
      value={selectedOption}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.label || '')}
      getOptionKey={(option) => (typeof option === 'string' ? option : String(option.value))}
      isOptionEqualToValue={(option, val) => option.value === val?.value}
      onChange={(_, val) => {
        onChange(val?.value ?? '');
      }}
      slotProps={{
        popper: {
          sx: { zIndex: FILTER_AUTOCOMPLETE_Z_INDEX },
        },
        paper: {
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 3,
          },
        },
      }}
      renderInput={(params) => <TextField {...params} placeholder={placeholder} />}
    />
  );
}

// ============================================================================
// Individual filter controls
// ============================================================================

interface FilterControlProps<TRow> {
  column: ColumnConfig<TRow>;
  value: unknown;
  onChange: (field: string, value: unknown) => void;
}

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateLike(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw) return null;

  const match = DATE_ONLY_REGEX.exec(raw);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Text filter with internal debouncing.
 */
function TextFilterControl<TRow>({
  column,
  value,
  onChange,
}: FilterControlProps<TRow>): JSX.Element {
  const debounceMs = column.filterDebounceMs ?? 400;
  const externalValue = typeof value === 'string' ? value : '';

  const [localValue, setLocalValue] = useState(externalValue);
  const lastEmittedValueRef = useRef(externalValue);

  useEffect(() => {
    if (externalValue === lastEmittedValueRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalValue(externalValue);
    lastEmittedValueRef.current = externalValue;
  }, [externalValue]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (raw: string): void => {
      setLocalValue(raw);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceMs === 0) {
        lastEmittedValueRef.current = raw;
        onChangeRef.current(column.field, raw);
      } else {
        timerRef.current = setTimeout(() => {
          lastEmittedValueRef.current = raw;
          onChangeRef.current(column.field, raw);
        }, debounceMs);
      }
    },
    [column.field, debounceMs],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <TextField
      size="small"
      placeholder={column.filterPlaceholder ?? 'Type to search'}
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      fullWidth
      slotProps={{ htmlInput: { 'aria-label': column.headerName } }}
    />
  );
}

function SelectFilterControl<TRow>({
  column,
  value,
  onChange,
}: FilterControlProps<TRow>): JSX.Element {
  return (
    <FormControl size="small" fullWidth>
      <Select
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(column.field, e.target.value)}
        displayEmpty
        input={<OutlinedInput />}
        SelectDisplayProps={{ 'aria-label': column.headerName }}
        renderValue={(selected) => {
          // The label above already names the field; the empty state only has
          // to say that nothing is picked.
          if (!selected) return <span className="text-foreground-tertiary">Any</span>;
          const opt = (column.filterOptions ?? []).find((o) => String(o.value) === selected);
          return opt?.label ?? selected;
        }}
      >
        <MenuItem value="">
          <span className="text-foreground-tertiary">Any</span>
        </MenuItem>
        {(column.filterOptions ?? []).map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function DateFilterControl<TRow>({
  column,
  value,
  onChange,
}: FilterControlProps<TRow>): JSX.Element {
  const toLocalDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return (
    <DatePicker
      value={parseDateLike(value)}
      // Day first, like every other date field in the app (`MUIDatePicker`).
      format="dd/MM/yyyy"
      onChange={(date) => {
        // The picker reports every keystroke. A year still being typed ("2" of
        // "2026") is a real date in year 2; filtering on it rewrote the field
        // under the cursor. Wait for a whole year.
        if (date && (Number.isNaN(date.getTime()) || date.getFullYear() < 1000)) return;
        const emittedValue = date ? toLocalDate(date) : null;
        onChange(column.field, emittedValue);
      }}
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: true,
          placeholder: 'Any date',
        },
      }}
    />
  );
}

function RangeFilterControl<TRow>({
  column,
  value,
  onChange,
}: FilterControlProps<TRow>): JSX.Element {
  const range =
    value != null && typeof value === 'object' ? (value as { min?: number; max?: number }) : {};

  const handleChange = (key: 'min' | 'max', rawVal: string): void => {
    const num = rawVal === '' ? undefined : Number(rawVal);
    onChange(column.field, { ...range, [key]: num });
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <TextField
        size="small"
        placeholder="Min"
        type="number"
        value={range.min ?? ''}
        onChange={(e) => handleChange('min', e.target.value)}
        fullWidth
        slotProps={{ htmlInput: { 'aria-label': `${column.headerName} minimum` } }}
      />
      <span className="text-[13px] text-text-secondary">–</span>
      <TextField
        size="small"
        placeholder="Max"
        type="number"
        value={range.max ?? ''}
        onChange={(e) => handleChange('max', e.target.value)}
        fullWidth
        slotProps={{ htmlInput: { 'aria-label': `${column.headerName} maximum` } }}
      />
    </div>
  );
}

function FilterControl<TRow>({ column, value, onChange }: FilterControlProps<TRow>): JSX.Element {
  if (column.renderFilter) {
    return (
      <Box sx={{ display: 'flex' }}>
        {column.renderFilter({
          value,
          onChange: (v) => onChange(column.field, v),
        })}
      </Box>
    );
  }

  const filterType: FilterType | undefined = column.filterType;
  switch (filterType) {
    case 'select':
      return <SelectFilterControl column={column} value={value} onChange={onChange} />;
    case 'date':
      return <DateFilterControl column={column} value={value} onChange={onChange} />;
    case 'range':
      return <RangeFilterControl column={column} value={value} onChange={onChange} />;
    case 'text':
    case undefined:
      return <TextFilterControl column={column} value={value} onChange={onChange} />;
  }
}

// ============================================================================
// Active filter chips
// ============================================================================

interface ActiveFilterChipsProps<TRow> {
  filters: FilterState;
  columns: ColumnConfig<TRow>[];
  onRemove: (field: string) => void;
  onClearAll: () => void;
}

function ActiveFilterChips<TRow>({
  filters,
  columns,
  onRemove,
  onClearAll,
}: ActiveFilterChipsProps<TRow>): JSX.Element | null {
  const activeEntries = Object.entries(filters).filter(([, v]) => v !== '' && v != null);
  if (activeEntries.length === 0) return null;

  const getLabel = (field: string, value: unknown): string => {
    const col = columns.find((c) => c.field === field);
    if (!col) return toSortableString(value);

    if (col.formatFilterValue) return `${col.headerName}: ${col.formatFilterValue(value)}`;

    const optionLabel = col.filterOptions?.find(
      (o) => String(o.value) === toSortableString(value),
    )?.label;

    if (col.filterType === 'select') {
      if (optionLabel && optionLabel === col.headerName) return optionLabel;
      return `${col.headerName}: ${optionLabel ?? toSortableString(value)}`;
    }
    if (col.filterType === 'range') {
      const r = value as { min?: number; max?: number };
      const parts: string[] = [];
      if (r.min != null) parts.push(`≥ ${r.min}`);
      if (r.max != null) parts.push(`≤ ${r.max}`);
      return `${col.headerName}: ${parts.join(' ')}`;
    }
    if (col.filterType === 'date') {
      const parsedDate = parseDateLike(value);
      return `${col.headerName}: ${parsedDate ? formatDate(parsedDate) : toSortableString(value)}`;
    }
    if (optionLabel) {
      return `${col.headerName}: ${optionLabel}`;
    }
    return `${col.headerName}: ${toSortableString(value)}`;
  };

  return (
    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ px: 2, pt: 1.5 }}>
      {activeEntries.map(([field, value]) => (
        <Chip
          key={field}
          label={getLabel(field, value)}
          onDelete={() => onRemove(field)}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: '0.75rem' }}
        />
      ))}
      <Button
        size="small"
        variant="text"
        color="error"
        onClick={onClearAll}
        sx={{ fontSize: '0.75rem', minWidth: 'auto', p: 0 }}
        startIcon={<FilterListOffIcon sx={{ fontSize: '14px !important' }} />}
      >
        Clear all
      </Button>
    </Stack>
  );
}

// ============================================================================
// TableFiltersToggle
// ============================================================================

interface TableFiltersToggleProps {
  filters: FilterState;
  open: boolean;
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function TableFiltersToggle({
  filters,
  open,
  onToggle,
}: TableFiltersToggleProps): JSX.Element {
  const activeCount = Object.values(filters).filter((v) => v !== '' && v != null).length;

  return (
    <Tooltip title={open ? 'Hide filters' : 'Show filters'}>
      <IconButton
        size="small"
        color={activeCount > 0 ? 'primary' : 'inherit'}
        onClick={onToggle}
        className="rounded-lg p-2.5 bg-background shadow-e1 hover:shadow-e2"
      >
        <Badge badgeContent={activeCount} color="primary" max={9}>
          <FilterListIcon className="size-4" />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

// ============================================================================
// Panel look
// ============================================================================

/** A long filter list goes two-up so it fits one screen instead of a long scroll. */
const TWO_COLUMNS_ABOVE = 6;

/**
 * White fields on a sunken panel — the same "card on canvas" contrast the list
 * pages use. The DS field fill (`surface-alt`) is nearly white, so on a white
 * panel the fields could not be told from the panel. One rule here styles
 * every control, including the ones a page supplies through `renderFilter`,
 * so no field in the panel can be the odd one out.
 */
const FILTER_PANEL_SX = {
  p: 0,
  overflowY: 'auto',
  backgroundColor: 'var(--ds-canvas-sunken)',
  '& .MuiOutlinedInput-root': { height: 36, backgroundColor: 'var(--ds-surface)' },
  // The theme pins an Autocomplete's field to its own height; keep every row level.
  '& .MuiAutocomplete-root .MuiOutlinedInput-root': { height: 36 },
  '& .MuiOutlinedInput-root.Mui-disabled': { backgroundColor: 'var(--ds-canvas)' },
  // Date pickers are a different MUI field that the theme does not restyle:
  // left alone they keep MUI's 1px outline and no fill, the one odd field here.
  '& .MuiPickersOutlinedInput-root': {
    height: 36,
    borderRadius: 'var(--radius-input-functional, 10px)',
    backgroundColor: 'var(--ds-surface)',
    boxShadow: 'var(--shadow-e1)',
    fontSize: '0.8125rem',
    '&:hover': { boxShadow: 'var(--shadow-e2)' },
    '&.Mui-focused': {
      boxShadow: 'var(--shadow-e2), 0 0 0 2px var(--ds-surface), 0 0 0 4px var(--ds-accent)',
    },
  },
  '& .MuiPickersOutlinedInput-notchedOutline': { border: 'none' },
  // `text-tertiary` (2.5:1) is the browser-facing default for placeholders.
  '& input::placeholder': { color: 'var(--ds-neutral-500)', opacity: 1 },
} as const;

/** The panel opens under its button and scrolls inside, so it never covers the toolbar. */
function panelMaxHeight(anchorEl: HTMLElement | null): number {
  if (!anchorEl || typeof window === 'undefined') return 480;
  const room = window.innerHeight - anchorEl.getBoundingClientRect().bottom - 24;
  return Math.max(280, Math.min(640, room));
}

// ============================================================================
// Side panel
// ============================================================================

/** A page that wants the list to move over reads this (it is unset while closed). */
const DRAWER_WIDTH_VAR = '--filters-drawer-w';
/** Narrow enough that a 1366px laptop still has room for a list's wide row. */
const DRAWER_WIDTH = 280;

interface FilterDrawerProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The filters as a side panel. In a desktop-size window it docks beside the
 * list with no shade — the filters apply as they change, so the rows stay in
 * view and usable while it is open. In a smaller window there is no room
 * beside the list, so it slides over it as an ordinary modal drawer.
 */
function FilterDrawer({ open, anchorEl, onClose, children }: FilterDrawerProps): JSX.Element {
  const docked = useMediaQuery('(min-width:1024px)');
  const paperRef = useRef<HTMLDivElement>(null);

  // Docked: publish the width so the page moves over instead of sitting under it.
  useEffect(() => {
    if (!open || !docked) return undefined;
    const root = document.documentElement;
    root.style.setProperty(DRAWER_WIDTH_VAR, `${DRAWER_WIDTH}px`);
    return () => {
      root.style.removeProperty(DRAWER_WIDTH_VAR);
    };
  }, [open, docked]);

  // A docked panel is not modal, so MUI moves no focus for it. Send focus in
  // when it opens (it is at the end of the document, far from its button) and
  // back to the button when it closes.
  const buttonRef = useRef<HTMLElement | null>(null);
  if (anchorEl) buttonRef.current = anchorEl;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!docked) {
      wasOpen.current = open;
      return;
    }
    if (open && !wasOpen.current) paperRef.current?.focus({ preventScroll: true });
    if (!open && wasOpen.current) buttonRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open, docked]);

  const drawer = (
    <Drawer
      anchor="right"
      variant={docked ? 'persistent' : 'temporary'}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          ref: paperRef,
          tabIndex: -1,
          role: docked ? 'complementary' : 'dialog',
          'aria-label': 'Filters',
          sx: {
            ...FILTER_PANEL_SX,
            outline: 'none',
            border: 'none',
            maxWidth: '100%',
            ...(docked
              ? {
                  width: DRAWER_WIDTH,
                  top: 'var(--header-height, 48px)',
                  height: 'calc(100vh - var(--header-height, 48px))',
                  // Under the global header and any modal, over the page.
                  zIndex: 40,
                  boxShadow: '-8px 0 24px rgba(16,24,40,0.06)',
                }
              : { width: 340, boxShadow: 'var(--shadow-e3)' }),
          },
        },
      }}
    >
      {children}
    </Drawer>
  );

  // Docked drawers render in place; send this one to the body so no ancestor's
  // stacking context or transform can trap a `position: fixed` panel.
  return docked ? <Portal>{drawer}</Portal> : drawer;
}

// ============================================================================
// Main export
// ============================================================================

function TableFiltersInner<TRow>({
  columns: allColumns,
  filters,
  anchorEl,
  onClose,
  onFilterChange,
  presentation = 'popover',
  resultLabel,
}: TableFiltersProps<TRow>): JSX.Element | null {
  const filterableColumns = allColumns.filter((c) => c.filterable);

  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const handleChange = useCallback(
    (field: string, value: unknown): void => {
      onFilterChangeRef.current({ ...filters, [field]: value });
    },
    [filters],
  );

  const handleRemove = useCallback(
    (field: string): void => {
      const next = { ...filters };
      delete next[field];
      onFilterChangeRef.current(next);
    },
    [filters],
  );

  const handleClearAll = useCallback((): void => {
    onFilterChangeRef.current({});
  }, []);

  // The panel opens without taking focus (disableAutoFocus), so MUI never gets
  // an Escape pressed while focus is still on the page. Close it from there.
  // Inside the panel (or a menu it opened) MUI already handles Escape itself.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isOpen = Boolean(anchorEl);
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[role="presentation"], [role="dialog"], [role="listbox"]')) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (filterableColumns.length === 0) return null;

  const activeCount = Object.values(filters).filter((v) => v !== '' && v != null).length;
  const asDrawer = presentation === 'drawer';
  const twoColumns = !asDrawer && filterableColumns.length > TWO_COLUMNS_ABOVE;

  const header = (
    <div className="sticky top-0 z-[1] flex items-start justify-between gap-3 bg-background-tertiary px-5 pb-3 pt-4">
      <div className="min-w-0">
        <p className="m-0 flex items-baseline gap-2 text-[14px] font-semibold text-text-primary">
          Filters
          {activeCount > 0 ? (
            <span className="text-[12px] font-medium text-text-secondary">
              {activeCount} active
            </span>
          ) : null}
        </p>
        {asDrawer && resultLabel ? (
          <p aria-live="polite" className="m-0 mt-0.5 text-[12px] text-text-secondary">
            {resultLabel}
          </p>
        ) : null}
      </div>
      <div className="flex flex-none items-center gap-0.5">
        <Button
          size="small"
          variant="text"
          color="inherit"
          disabled={activeCount === 0}
          onClick={handleClearAll}
          startIcon={<FilterListOffIcon className="size-3.5" />}
          className="min-w-0 px-2 py-1 text-[12px] font-semibold normal-case text-text-secondary hover:text-error"
        >
          Reset
        </Button>
        {asDrawer ? (
          <IconButton size="small" aria-label="Close filters" onClick={onClose}>
            <CloseIcon className="size-4" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );

  const fields = (
    <div
      className={cn('grid grid-cols-1 gap-x-4 gap-y-3.5 px-5 pb-5', twoColumns && 'sm:grid-cols-2')}
    >
      {filterableColumns.map((col) => {
        const value = filters[col.field];
        const isSet = value !== '' && value != null;
        return (
          <div
            key={col.field}
            className={cn(
              'flex min-w-0 flex-col gap-1.5',
              twoColumns && col.filterWide && 'sm:col-span-2',
            )}
          >
            <span
              className={cn(
                'flex items-center gap-1.5 text-[12px] font-medium',
                isSet ? 'text-text-primary' : 'text-text-secondary',
              )}
            >
              {col.headerName}
              {isSet ? <i aria-hidden className="block size-1.5 rounded-full bg-primary" /> : null}
            </span>
            <FilterControl column={col} value={value} onChange={handleChange} />
          </div>
        );
      })}
    </div>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <>
        <ActiveFilterChips
          filters={filters}
          columns={allColumns}
          onRemove={handleRemove}
          onClearAll={handleClearAll}
        />

        {asDrawer ? (
          <FilterDrawer open={isOpen} anchorEl={anchorEl} onClose={onClose}>
            {header}
            {fields}
          </FilterDrawer>
        ) : (
          <Popover
            open={isOpen}
            anchorEl={anchorEl}
            onClose={onClose}
            disableAutoFocus
            disableEnforceFocus
            disableRestoreFocus
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                'aria-label': 'Filters',
                sx: {
                  ...FILTER_PANEL_SX,
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-e3)',
                  width: `min(calc(100vw - 32px), ${twoColumns ? 600 : 340}px)`,
                  maxHeight: panelMaxHeight(anchorEl),
                },
              },
            }}
          >
            {header}
            {fields}
          </Popover>
        )}
      </>
    </LocalizationProvider>
  );
}

export const TableFilters = memo(TableFiltersInner) as typeof TableFiltersInner;
