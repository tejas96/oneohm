'use client';

import FilterListIcon from '@mui/icons-material/FilterList';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  OutlinedInput,
  Popover,
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
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  onFilterChange: (filters: FilterState) => void;
}

/** Above MUI Popover (1300) so autocomplete menus are not clipped inside filter panels. */
const FILTER_AUTOCOMPLETE_Z_INDEX = 1600;

export interface FilterAutocompleteOption {
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
      placeholder={column.filterPlaceholder ?? `Search ${column.headerName}...`}
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      fullWidth
      slotProps={{
        input: {
          className: 'rounded-lg text-xs bg-background',
        },
      }}
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
        input={<OutlinedInput className="rounded-lg text-xs bg-background" />}
        renderValue={(selected) => {
          if (!selected) {
            return (
              <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                Select {column.headerName}
              </span>
            );
          }
          const opt = (column.filterOptions ?? []).find((o) => String(o.value) === selected);
          return <span className="text-xs">{opt?.label ?? selected}</span>;
        }}
      >
        <MenuItem value="">
          <span className="text-xs italic">All</span>
        </MenuItem>
        {(column.filterOptions ?? []).map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            <span className="text-xs">{opt.label}</span>
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
      onChange={(date) => {
        const emittedValue = date ? toLocalDate(date) : null;
        onChange(column.field, emittedValue);
      }}
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: true,
          placeholder: `Select ${column.headerName}`,
          slotProps: {
            input: {
              className: 'rounded-lg text-xs bg-background',
            },
          },
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
        slotProps={{
          input: {
            className: 'rounded-lg text-xs bg-background',
          },
        }}
      />
      <span className="text-text-secondary text-xs">–</span>
      <TextField
        size="small"
        placeholder="Max"
        type="number"
        value={range.max ?? ''}
        onChange={(e) => handleChange('max', e.target.value)}
        fullWidth
        slotProps={{
          input: {
            className: 'rounded-lg text-xs bg-background',
          },
        }}
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
      return `${col.headerName}: ${parsedDate ? parsedDate.toLocaleDateString() : toSortableString(value)}`;
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
// Main export
// ============================================================================

function TableFiltersInner<TRow>({
  columns: allColumns,
  filters,
  anchorEl,
  onClose,
  onFilterChange,
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

  if (filterableColumns.length === 0) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <>
        <ActiveFilterChips
          filters={filters}
          columns={allColumns}
          onRemove={handleRemove}
          onClearAll={handleClearAll}
        />

        <Popover
          open={Boolean(anchorEl)}
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
              className: 'p-4 rounded-xl shadow-e3 min-w-[320px] max-w-[400px]',
              sx: {
                maxHeight: 480,
                overflowY: 'auto',
              },
            },
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2">
              <Typography className="text-xs font-semibold text-text-primary">Filters</Typography>
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={handleClearAll}
                startIcon={<FilterListOffIcon className="size-3.5" />}
                className="text-[11px] font-semibold text-text-secondary hover:text-error normal-case p-0 min-w-0"
              >
                Reset
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {filterableColumns.map((col) => (
                <div key={col.field} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-text-secondary">
                    {col.headerName}
                  </span>
                  <FilterControl column={col} value={filters[col.field]} onChange={handleChange} />
                </div>
              ))}
            </div>
          </div>
        </Popover>
      </>
    </LocalizationProvider>
  );
}

export const TableFilters = memo(TableFiltersInner) as typeof TableFiltersInner;
