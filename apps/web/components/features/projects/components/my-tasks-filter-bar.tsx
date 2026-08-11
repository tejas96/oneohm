'use client';

import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { SxProps, Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useMemo, type RefObject } from 'react';

import { TASK_GROUP_BY_OPTIONS } from '../constants';
import type { GroupByMode } from '../hooks';

import { MUIInput } from '@/components/ui';

interface FilterOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

interface MyTasksFilterBarProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  addressInput: string;
  onAddressChange: (value: string) => void;
  projectFilter: string;
  projectFilterOptions: FilterOption[];
  statusFilter: string;
  statusFilterOptions: FilterOption[];
  priorityFilter: string;
  priorityFilterOptions: FilterOption[];
  groupBy: GroupByMode;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  isSearchPending?: boolean;
  isAddressPending?: boolean;
  allExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  sx?: SxProps<Theme>;
}

/** "Group by: Due Date" → "Due date" — the segmented control carries the context. */
function shortGroupLabel(label: string): string {
  const stripped = label.replace(/^Group by:\s*/i, '');
  return stripped.charAt(0) + stripped.slice(1).toLowerCase();
}

const SEGMENT_SX = {
  border: 'none',
  cursor: 'pointer',
  height: 26,
  px: 1.25,
  borderRadius: 'var(--radius-pill)',
  fontFamily: 'inherit',
  fontSize: '11.5px',
  fontWeight: 500,
  letterSpacing: '-0.005em',
  whiteSpace: 'nowrap',
  transition: 'color var(--dur-micro) var(--ease-standard)',
} as const;

export function MyTasksFilterBar({
  searchInput,
  onSearchChange,
  searchInputRef,
  addressInput,
  onAddressChange,
  projectFilter,
  projectFilterOptions,
  statusFilter,
  statusFilterOptions,
  priorityFilter,
  priorityFilterOptions,
  groupBy,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  isSearchPending = false,
  isAddressPending = false,
  allExpanded,
  onExpandAll,
  onCollapseAll,
  sx,
}: MyTasksFilterBarProps): React.JSX.Element {
  const searchableProjectOptions = useMemo(
    () => projectFilterOptions.filter((o) => o.value !== ''),
    [projectFilterOptions],
  );

  const selectedProject = useMemo(
    () => searchableProjectOptions.find((o) => o.value === projectFilter) ?? null,
    [searchableProjectOptions, projectFilter],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: 'var(--ds-surface)',
        borderRadius: 'var(--radius-card-functional)',
        boxShadow: 'var(--shadow-e1)',
        ...sx,
      }}
    >
      {/*
        One row, wrapping. Every field carries a modest flex-basis, `minWidth: 0`
        and shrink enabled, so the line compresses before anything is forced to
        wrap and nothing can overflow the card. Bases total ~765px, which leaves
        the group-by cluster room on one line at 1440; below that the cluster is
        what drops to a second line, right-aligned.

        Widths are weighted by what each control actually has to show. Project
        renders "PRJ-0231: Long Project Name", so it takes the widest basis and
        the largest grow factor; Status and Priority hold short fixed options and
        stay narrow.
      */}
      <TextField
        inputRef={searchInputRef}
        size="small"
        placeholder="Search tasks"
        aria-label="Search tasks"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flex: '1.2 1 175px', minWidth: 0, maxWidth: { md: 300 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 17, color: 'var(--ds-text-tertiary)' }} />
            </InputAdornment>
          ),
          endAdornment: isSearchPending ? (
            <InputAdornment position="end">
              <CircularProgress size={14} />
            </InputAdornment>
          ) : (
            // Keyboard shortcut hint — `/` focuses this field (see use-task-keyboard-nav).
            !searchInput && (
              <InputAdornment position="end">
                <Box
                  component="kbd"
                  aria-hidden="true"
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    lineHeight: '16px',
                    minWidth: 16,
                    textAlign: 'center',
                    px: 0.5,
                    borderRadius: 'var(--radius-rf-xs)',
                    color: 'var(--ds-text-tertiary)',
                    bgcolor: 'var(--ds-canvas-sunken)',
                  }}
                >
                  /
                </Box>
              </InputAdornment>
            )
          ),
        }}
      />

      <TextField
        size="small"
        placeholder="Pincode, city or address"
        aria-label="Filter by pincode, city or address"
        value={addressInput}
        onChange={(e) => onAddressChange(e.target.value)}
        sx={{ flex: '1 1 135px', minWidth: 0, maxWidth: { md: 220 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LocationOnIcon sx={{ fontSize: 17, color: 'var(--ds-text-tertiary)' }} />
            </InputAdornment>
          ),
          endAdornment: isAddressPending ? (
            <InputAdornment position="end">
              <CircularProgress size={14} />
            </InputAdornment>
          ) : undefined,
        }}
      />

      {/*
        `MUIInput` (autocomplete mode) renders `<div><Autocomplete sx={sx} /></div>`,
        so `sx` reaches the Autocomplete but the wrapping div is the flex item.
        Flex sizing has to go on this Box; the field then fills it at 100%.
      */}
      <Box sx={{ flex: '2 1 245px', minWidth: 0, maxWidth: { md: 400 } }}>
        <MUIInput
          mode="autocomplete"
          options={searchableProjectOptions}
          value={selectedProject}
          onChange={(opt) => {
            const next = opt && typeof opt === 'object' && 'value' in opt ? String(opt.value) : '';
            onFilterChange('projectId', next);
          }}
          clearable
          onClear={() => onFilterChange('projectId', '')}
          openOnFocus
          disablePortal
          sx={{ width: '100%' }}
          textFieldProps={{
            size: 'small',
            placeholder: 'All projects',
            'aria-label': 'Filter by project',
          }}
          noOptionsText="No matches"
          isOptionEqualToValue={(a, b) => {
            const av = typeof a === 'object' && a !== null ? a.value : a;
            const bv = typeof b === 'object' && b !== null ? b.value : b;
            return av === bv;
          }}
          getOptionLabel={(option) =>
            typeof option === 'string' ? option : (option.label ?? String(option.value ?? ''))
          }
          slotProps={{
            popper: {
              sx: {
                width: 'auto !important',
                minWidth: 280,
                maxWidth: 400,
              },
            },
            listbox: {
              sx: { maxHeight: 280 },
            },
          }}
        />
      </Box>

      <FormControl size="small" sx={{ flex: '0.5 1 105px', minWidth: 0, maxWidth: { md: 150 } }}>
        <Select
          displayEmpty
          aria-label="Filter by status"
          value={statusFilter || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          {statusFilterOptions.map((opt) => (
            <MenuItem key={opt.value || '__all__'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ flex: '0.5 1 105px', minWidth: 0, maxWidth: { md: 150 } }}>
        <Select
          displayEmpty
          aria-label="Filter by priority"
          value={priorityFilter || ''}
          onChange={(e) => onFilterChange('priority', e.target.value)}
        >
          {priorityFilterOptions.map((opt) => (
            <MenuItem key={opt.value || '__all__'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {hasActiveFilters && (
        <Box
          component="button"
          type="button"
          onClick={onClearFilters}
          sx={{
            ...SEGMENT_SX,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            height: 30,
            flexShrink: 0,
            color: 'var(--ds-text-secondary)',
            bgcolor: 'transparent',
            '&:hover': { bgcolor: 'var(--ds-canvas-sunken)', color: 'var(--ds-text-primary)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
          Clear
        </Box>
      )}

      {/*
          Pinned right by `ml: auto` and never shrinks, so it is the one item
          that drops to a second line when the row runs out of room — and it
          stays right-aligned there rather than stranding itself mid-row.
        */}
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box
          role="group"
          aria-label="Group tasks by"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            p: 0.5,
            borderRadius: 'var(--radius-pill)',
            bgcolor: 'var(--ds-canvas-sunken)',
          }}
        >
          {TASK_GROUP_BY_OPTIONS.map((opt) => {
            const active = groupBy === opt.value;
            return (
              <Box
                key={opt.value}
                component="button"
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange('groupBy', opt.value)}
                sx={{
                  ...SEGMENT_SX,
                  color: active ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                  bgcolor: active ? 'var(--ds-surface)' : 'transparent',
                  boxShadow: active ? 'var(--shadow-e1)' : 'none',
                  '&:hover': { color: 'var(--ds-text-primary)' },
                }}
              >
                {shortGroupLabel(opt.label)}
              </Box>
            );
          })}
        </Box>

        <Tooltip title={allExpanded ? 'Collapse all groups' : 'Expand all groups'}>
          <IconButton
            size="small"
            aria-label={allExpanded ? 'Collapse all groups' : 'Expand all groups'}
            onClick={allExpanded ? onCollapseAll : onExpandAll}
            sx={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-rf-md)',
              color: 'var(--ds-text-secondary)',
              '&:hover': { bgcolor: 'var(--ds-canvas-sunken)', color: 'var(--ds-text-primary)' },
            }}
          >
            {allExpanded ? (
              <UnfoldLessIcon sx={{ fontSize: 18 }} />
            ) : (
              <UnfoldMoreIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
