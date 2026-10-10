'use client';

import { useMemo } from 'react';

import { type CustomerRow, FILTER_COLUMNS } from './filter-columns';
import { useCustomerGroups } from '../../hooks/use-customers';

import { useEmployees } from '@/components/features/employees';
import { type ColumnConfig, FilterAutocomplete } from '@/components/shared/advanced-table';

/**
 * The filter popover's columns with their live options — employees for the
 * three people filters, groups for the group filter. Moved here unchanged from
 * `customer-list-page.tsx`.
 */
export function useFilterColumns(): ColumnConfig<CustomerRow>[] {
  // Fetch active employees
  const { data: employees = [] } = useEmployees();

  // Fetch customer groups
  const { data: groups = [] } = useCustomerGroups();

  // Memoize sorted base employee options
  const baseEmployeeOptions = useMemo(() => {
    const list = employees.map((emp) => {
      const name = `${emp.user?.firstName ?? ''} ${emp.user?.lastName ?? ''}`.trim();
      return {
        label: name || emp.user?.email || 'Unknown Employee',
        value: emp.userId,
      };
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  // Options for 'Created By' filter (includes 'Self-Registered')
  const creatorOptions = useMemo(
    () => [
      { label: 'Current User (Me)', value: 'me' },
      { label: 'Self-Registered', value: 'self' },
      ...baseEmployeeOptions,
    ],
    [baseEmployeeOptions],
  );

  // Options for 'Assigned To' filter (excludes 'Self-Registered')
  const assigneeOptions = useMemo(
    () => [{ label: 'Current User (Me)', value: 'me' }, ...baseEmployeeOptions],
    [baseEmployeeOptions],
  );

  // Memoize customer group options
  const groupOptions = useMemo(() => {
    return groups.map((g) => ({
      label: g.groupName ? `${g.groupName} (${g.groupCode})` : g.groupCode,
      value: g.groupCode,
    }));
  }, [groups]);

  return useMemo<ColumnConfig<CustomerRow>[]>(() => {
    return FILTER_COLUMNS.map((col) => {
      if (col.field === 'followupAssigneeId') {
        return {
          ...col,
          filterOptions: baseEmployeeOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={baseEmployeeOptions}
              value={value}
              onChange={onChange}
              placeholder="Search person..."
            />
          ),
        };
      }
      if (col.field === 'groupSearch') {
        return {
          ...col,
          filterOptions: groupOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={groupOptions}
              value={value}
              onChange={onChange}
              placeholder="Search group..."
            />
          ),
        };
      }
      if (col.field === 'createdBy') {
        return {
          ...col,
          filterOptions: creatorOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={creatorOptions}
              value={value}
              onChange={onChange}
              placeholder="Search creator..."
            />
          ),
        };
      }
      if (col.field === 'assigneeId') {
        return {
          ...col,
          filterOptions: assigneeOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={assigneeOptions}
              value={value}
              onChange={onChange}
              placeholder="Search assignee..."
            />
          ),
        };
      }
      return col;
    });
  }, [creatorOptions, assigneeOptions, groupOptions, baseEmployeeOptions]);
}
