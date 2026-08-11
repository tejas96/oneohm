'use client';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
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
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, ...sx }}>
      <TextField
        inputRef={searchInputRef}
        size="small"
        placeholder="Search tasks… (press /)"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ width: 220 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: isSearchPending ? (
            <InputAdornment position="end">
              <CircularProgress size={16} />
            </InputAdornment>
          ) : undefined,
        }}
      />

      <TextField
        size="small"
        placeholder="Pincode/City/Address"
        value={addressInput}
        onChange={(e) => onAddressChange(e.target.value)}
        sx={{ width: 220 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LocationOnIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: isAddressPending ? (
            <InputAdornment position="end">
              <CircularProgress size={16} />
            </InputAdornment>
          ) : undefined,
        }}
      />

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
        sx={{ width: 192 }}
        textFieldProps={{
          label: 'Project',
          size: 'small',
          placeholder: 'All Projects',
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

      <FormControl size="small" sx={{ width: 144 }}>
        <InputLabel shrink>Status</InputLabel>
        <Select
          label="Status"
          displayEmpty
          notched
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

      <FormControl size="small" sx={{ width: 144 }}>
        <InputLabel shrink>Priority</InputLabel>
        <Select
          label="Priority"
          displayEmpty
          notched
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

      <FormControl size="small" sx={{ width: 176 }}>
        <InputLabel shrink>Group By</InputLabel>
        <Select
          label="Group By"
          displayEmpty
          notched
          value={groupBy}
          onChange={(e) => onFilterChange('groupBy', e.target.value as string)}
        >
          {TASK_GROUP_BY_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {hasActiveFilters && (
        <Chip
          label="Clear"
          size="small"
          variant="outlined"
          onDelete={onClearFilters}
          onClick={onClearFilters}
        />
      )}

      <Tooltip title={allExpanded ? 'Collapse all' : 'Expand all'}>
        <IconButton
          size="small"
          onClick={allExpanded ? onCollapseAll : onExpandAll}
          sx={{ ml: 'auto', borderLeft: '1px solid', borderColor: 'divider', pl: 1.5 }}
        >
          {allExpanded ? (
            <KeyboardArrowUpIcon fontSize="small" />
          ) : (
            <KeyboardArrowDownIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
