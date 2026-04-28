'use client';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import type { RefObject } from 'react';

import { TASK_GROUP_BY_OPTIONS } from '../constants';
import type { GroupByMode } from '../hooks';

interface FilterOption {
  value: string;
  label: string;
}

interface MyTasksFilterBarProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
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
  allExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function MyTasksFilterBar({
  searchInput,
  onSearchChange,
  searchInputRef,
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
  allExpanded,
  onExpandAll,
  onCollapseAll,
}: MyTasksFilterBarProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
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
        }}
      />

      <FormControl size="small" sx={{ width: 192 }}>
        <InputLabel shrink>Project</InputLabel>
        <Select
          label="Project"
          displayEmpty
          notched
          value={projectFilter || ''}
          onChange={(e) => onFilterChange('projectId', e.target.value)}
        >
          {projectFilterOptions.map((opt) => (
            <MenuItem key={opt.value || '__all__'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
          sx={{ ml: 'auto' }}
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
