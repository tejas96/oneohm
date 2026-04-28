'use client';

import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useMemo, useState } from 'react';

import { EmployeeRow } from './employee-row';
import { getEmployeeDisplayName } from '../../../utils';

import { MUIInput, MUISelect, MUITypography } from '@/components/ui';
import { useRoles, type AdminRole, type EmployeeListItem, type TeamWorkloadItem } from '@/lib/hooks/resources';

// ── Props ──────────────────────────────────────────────────────

interface AvailableEmployeesListProps {
  employees: EmployeeListItem[];
  selectedUserIds: Set<string>;
  workloadMap: Map<string, TeamWorkloadItem>;
  onAdd: (employee: EmployeeListItem) => void;
}

// ── Component ─────────────────────────────────────────────────

export function AvailableEmployeesList({
  employees,
  selectedUserIds,
  workloadMap,
  onAdd,
}: AvailableEmployeesListProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const { items: roles, isLoading: rolesLoading } = useRoles({
    syncToUrl: false,
    defaultPageSize: 100,
  });

  // Only show roles that at least one employee in the list actually holds
  const roleOptions = useMemo((): { value: string; label: string }[] => {
    const codesInUse = new Set(
      employees.flatMap((e: EmployeeListItem) => (e.roles as string[] | undefined) ?? []),
    );
    return (roles as AdminRole[])
      .filter((r) => codesInUse.has(r.code))
      .map((r) => ({ value: r.code, label: r.name }));
  }, [roles, employees]);

  const filtered = useMemo((): EmployeeListItem[] => {
    const q = search.toLowerCase().trim();
    return employees.filter((e) => {
      const matchesSearch =
        !q ||
        getEmployeeDisplayName(e).toLowerCase().includes(q) ||
        (e.user?.email ?? e.email ?? '').toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q) ||
        (e.designation ?? '').toLowerCase().includes(q);

      const matchesRole = !selectedRole || (e.roles ?? []).includes(selectedRole);

      return matchesSearch && matchesRole;
    });
  }, [employees, search, selectedRole]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar — search 70% + role 30% on one row */}
      <div className="flex items-center gap-2 p-3 border-b border-border-light">
        <div className="flex-[7]">
          <MUIInput
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<SearchIcon fontSize="small" />}
            clearable
            onClear={() => setSearch('')}
            size="small"
            fullWidth
          />
        </div>

        <div className="flex flex-[3] items-center gap-1">
          <MUISelect
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as string)}
            options={roleOptions}
            placeholder="Select role"
            displayEmpty
            size="small"
            fullWidth
            disabled={rolesLoading || roleOptions.length === 0}
          />
          {selectedRole && (
            <Tooltip title="Clear role filter">
              <IconButton
                size="small"
                onClick={() => setSelectedRole('')}
                aria-label="Clear role filter"
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Employee list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border-light">
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <MUITypography variant="body" className="text-foreground-secondary">
              {employees.length === 0
                ? 'No employees found in this organization.'
                : 'No matches for current filters.'}
            </MUITypography>
          </div>
        ) : (
          filtered.map((emp) => {
            const isSelected = selectedUserIds.has(emp.userId);
            const workload = workloadMap.get(emp.userId);

            return (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                workload={workload}
                rightSlot={
                  isSelected ? (
                    <Tooltip title="Already added">
                      <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Add to team">
                      <IconButton
                        size="small"
                        onClick={() => onAdd(emp)}
                        aria-label={`Add ${getEmployeeDisplayName(emp)} to team`}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
