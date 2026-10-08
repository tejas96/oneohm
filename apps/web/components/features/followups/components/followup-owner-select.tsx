'use client';

import { Autocomplete, TextField } from '@mui/material';
import { FollowupStatus, FollowupType, LeadTemperature, UserStatus } from '@tejas96/shared/types';
import { useMemo, type JSX } from 'react';

import { type FollowupResponse } from '../hooks/use-followups';

import { useEmployees } from '@/components/features/employees';
import type { ColumnConfig } from '@/components/shared/advanced-table';
import { toTitleLabel } from '@/lib/utils';

/** 'me' and 'all' are views; any other value is a user id. */
export type FollowupOwner = 'me' | 'all' | (string & {});

/** Visits and surveys never list here (they have their own queue), so never offer them. */
const LISTED_TYPES = [
  FollowupType.MEETING,
  FollowupType.TASK,
  FollowupType.REMINDER,
  FollowupType.DOCUMENT_COLLECTION,
];

/**
 * The filter contract for /followups, handed to the shared TableFilters panel
 * — the same panel the customers list uses. Status left empty means open work.
 */
export const FOLLOWUP_FILTER_COLUMNS: ColumnConfig<FollowupResponse>[] = [
  {
    field: 'status',
    headerName: 'Status',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Open', value: FollowupStatus.PENDING },
      { label: 'Done', value: FollowupStatus.COMPLETED },
      { label: 'Cancelled', value: FollowupStatus.CANCELLED },
    ],
  },
  {
    field: 'type',
    headerName: 'Type',
    filterable: true,
    filterType: 'select',
    filterOptions: LISTED_TYPES.map((type) => ({ label: toTitleLabel(type), value: type })),
  },
  {
    // Temperature is stored on the site, so this can only match site follow-ups.
    field: 'leadTemperature',
    headerName: 'Site temperature',
    filterable: true,
    filterType: 'select',
    filterOptions: Object.values(LeadTemperature).map((temp) => ({
      label: toTitleLabel(temp),
      value: temp,
    })),
  },
  { field: 'fromDate', headerName: 'From', filterable: true, filterType: 'date' },
  { field: 'toDate', headerName: 'To', filterable: true, filterType: 'date' },
];

interface OwnerOption {
  id: FollowupOwner;
  label: string;
}

/** Owner picker. Lists staff who left too, so their open work can be found and moved. */
export function FollowupOwnerSelect({
  value,
  onChange,
  currentUserId,
}: {
  value: FollowupOwner;
  onChange: (owner: FollowupOwner) => void;
  currentUserId?: string;
}): JSX.Element {
  const { data: active = [] } = useEmployees();
  const { data: inactive = [] } = useEmployees({ status: UserStatus.INACTIVE });

  const options = useMemo<OwnerOption[]>(() => {
    const seen = new Set<string>([currentUserId ?? '']);
    const staff = [...active, ...inactive]
      .filter((employee) => !seen.has(employee.userId) && seen.add(employee.userId))
      .map((employee) => {
        const name =
          [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' ').trim() ||
          'Unnamed';
        return {
          id: employee.userId,
          label: employee.status === UserStatus.ACTIVE ? name : `${name} (left)`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ id: 'me', label: 'Me' }, { id: 'all', label: 'Everyone' }, ...staff];
  }, [active, inactive, currentUserId]);

  const selected = options.find((option) => option.id === value) ?? options[0];

  return (
    <Autocomplete
      size="small"
      disableClearable
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option.id)}
      isOptionEqualToValue={(option, current) => option.id === current.id}
      renderOption={({ key: _key, ...props }, option) => (
        <li key={option.id} {...props}>
          {option.label}
        </li>
      )}
      renderInput={(params) => <TextField {...params} label="Owner" />}
      sx={{ width: 200 }}
    />
  );
}
