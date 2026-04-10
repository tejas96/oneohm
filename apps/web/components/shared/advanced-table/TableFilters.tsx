'use client';

import FilterListIcon from '@mui/icons-material/FilterList';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { type JSX, memo, useCallback, useEffect, useRef, useState } from 'react';

import type { ColumnConfig, FilterState, FilterType } from './types';
import { toSortableString } from './utils';

// ============================================================================
// Types
// ============================================================================

interface TableFiltersProps<TRow> {
  columns: ColumnConfig<TRow>[];
  filters: FilterState;
  open: boolean;
  onFilterChange: (filters: FilterState) => void;
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
 * The input updates instantly (controlled local state) but `onChange` is only
 * called after the debounce delay so server-mode tables don't get an API call
 * on every keystroke.
 * Per-column delay is configurable via `column.filterDebounceMs` (default 400ms).
 */
function TextFilterControl<TRow>({
  column,
  value,
  onChange,
}: FilterControlProps<TRow>): JSX.Element {
  const debounceMs = column.filterDebounceMs ?? 400;
  const externalValue = typeof value === 'string' ? value : '';

  // Local state drives the input — prevents the cursor jumping on every parent re-render
  const [localValue, setLocalValue] = useState(externalValue);

  // Sync local value when the external filter is cleared (e.g. "Reset all").
  // Also cancels any in-flight debounce timer so a pending onChange call cannot
  // overwrite the reset with stale data (rapid type → reset-all race condition).
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalValue(externalValue);
  }, [externalValue]);

  // Stable ref so the timer callback always calls the latest onChange
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (raw: string): void => {
      setLocalValue(raw);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceMs === 0) {
        onChangeRef.current(column.field, raw);
      } else {
        timerRef.current = setTimeout(() => {
          onChangeRef.current(column.field, raw);
        }, debounceMs);
      }
    },
    [column.field, debounceMs],
  );

  // Clear the timer on unmount to avoid calling onChange on a dead component
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <TextField
      size="small"
      label={column.headerName}
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={`Filter ${column.headerName}...`}
      sx={{ minWidth: 160 }}
    />
  );
}

function SelectFilterControl<TRow>({
  column,
  value,
  onChange,
}: FilterControlProps<TRow>): JSX.Element {
  const labelId = `filter-label-${column.field}`;
  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel id={labelId}>{column.headerName}</InputLabel>
      <Select
        labelId={labelId}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(column.field, e.target.value)}
        input={<OutlinedInput label={column.headerName} />}
      >
        <MenuItem value="">
          <em>All</em>
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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label={column.headerName}
        value={parseDateLike(value)}
        onChange={(date) => {
          // Keep date-only local value (YYYY-MM-DD) to avoid timezone day shifts.
          const emittedValue = date ? toLocalDate(date) : null;
          onChange(column.field, emittedValue);
        }}
        slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
      />
    </LocalizationProvider>
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
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 240 }}>
      <TextField
        size="small"
        label={`${column.headerName} min`}
        type="number"
        value={range.min ?? ''}
        onChange={(e) => handleChange('min', e.target.value)}
        sx={{ width: 110 }}
      />
      <Typography variant="caption" color="text.secondary">
        –
      </Typography>
      <TextField
        size="small"
        label={`${column.headerName} max`}
        type="number"
        value={range.max ?? ''}
        onChange={(e) => handleChange('max', e.target.value)}
        sx={{ width: 110 }}
      />
    </Stack>
  );
}

function FilterControl<TRow>({ column, value, onChange }: FilterControlProps<TRow>): JSX.Element {
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
// Active filter chips (summary bar shown above the filter panel)
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

    if (col.filterType === 'select') {
      const opt = col.filterOptions?.find((o) => String(o.value) === toSortableString(value));
      return `${col.headerName}: ${opt?.label ?? toSortableString(value)}`;
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
      return `${col.headerName}: ${parsedDate ? parsedDate.toLocaleDateString() : toSortableString(value)}`;
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
// TableFiltersToggle — the toolbar button that opens/closes the panel
// ============================================================================

interface TableFiltersToggleProps {
  filters: FilterState;
  open: boolean;
  onToggle: () => void;
}

export function TableFiltersToggle({
  filters,
  open,
  onToggle,
}: TableFiltersToggleProps): JSX.Element {
  const activeCount = Object.values(filters).filter((v) => v !== '' && v != null).length;

  return (
    <Tooltip title={open ? 'Hide filters' : 'Show filters'}>
      <Badge badgeContent={activeCount} color="primary" max={9}>
        <Button
          size="small"
          variant={activeCount > 0 ? 'contained' : 'outlined'}
          color={activeCount > 0 ? 'primary' : 'inherit'}
          onClick={onToggle}
          startIcon={<FilterListIcon />}
          sx={{ fontWeight: 500 }}
        >
          Filters
        </Button>
      </Badge>
    </Tooltip>
  );
}

// ============================================================================
// Main export — the collapsible filter panel
// ============================================================================

function TableFiltersInner<TRow>({
  columns: allColumns,
  filters,
  open,
  onFilterChange,
}: TableFiltersProps<TRow>): JSX.Element | null {
  const filterableColumns = allColumns.filter((c) => c.filterable);

  // Stable ref so callbacks don't bust memo() when onFilterChange identity changes
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const handleChange = useCallback(
    (field: string, value: unknown): void => {
      onFilterChangeRef.current({ ...filters, [field]: value });
    },
    // filters dep required to always spread the latest state
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

  if (filterableColumns.length === 0) return null;

  return (
    <>
      <ActiveFilterChips
        filters={filters}
        columns={allColumns}
        onRemove={handleRemove}
        onClearAll={handleClearAll}
      />

      <Collapse in={open}>
        <Divider />
        <Box sx={{ px: 2, py: 2, backgroundColor: 'action.hover' }}>
          <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-end">
            {filterableColumns.map((col) => (
              <FilterControl
                key={col.field}
                column={col}
                value={filters[col.field]}
                onChange={handleChange}
              />
            ))}
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={handleClearAll}
              startIcon={<FilterListOffIcon />}
              sx={{ color: 'text.secondary', alignSelf: 'center' }}
            >
              Reset
            </Button>
          </Stack>
        </Box>
        <Divider />
      </Collapse>
    </>
  );
}

export const TableFilters = memo(TableFiltersInner) as typeof TableFiltersInner;
