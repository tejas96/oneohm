'use client';

import GroupsIcon from '@mui/icons-material/Groups';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';
import { TeamSplitPanel } from '../components/team-split-panel';

import { MUITypography } from '@/components/ui';
import { useEmployees, useTeamWorkload, type EmployeeListItem, type TeamWorkloadItem } from '@/lib/hooks/resources';

// ── Props ──────────────────────────────────────────────────────

interface Step3TeamSelectionProps {
  form: UseFormReturn<ProjectCreateFormData>;
}

// ── Component ─────────────────────────────────────────────────

export function Step3TeamSelection({ form }: Step3TeamSelectionProps): React.JSX.Element {
  const {
    items: employees,
    isLoading: employeesLoading,
    isError,
  } = useEmployees({
    status: 'active',
  });
  const { data: workloadData } = useTeamWorkload();

  const workloadMap = useMemo(() => {
    const map = new Map<string, TeamWorkloadItem>();
    workloadData?.forEach((w) => map.set(w.userId, w));
    return map;
  }, [workloadData]);

  // Sort ascending by active project count — 0 projects always first, ties preserve API order
  const sortedEmployees = useMemo(
    (): EmployeeListItem[] =>
      (employees as EmployeeListItem[]).slice().sort((a, b) => {
        const aCount = workloadMap.get(a.userId)?.activeProjectCount ?? 0;
        const bCount = workloadMap.get(b.userId)?.activeProjectCount ?? 0;
        return aCount - bCount;
      }),
    [employees, workloadMap],
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <GroupsIcon className="text-primary" fontSize="small" />
        </div>
        <div>
          <MUITypography variant="sectionTitle">Team Selection</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary">
            Add team members and designate a project manager.
          </MUITypography>
        </div>
      </div>

      {isError && (
        <Alert severity="error" className="mb-4">
          Failed to load employees. Please refresh and try again.
        </Alert>
      )}

      {employeesLoading && (
        <div className="flex items-center justify-center p-12">
          <CircularProgress size={32} />
        </div>
      )}

      {!isError && !employeesLoading && (
        <TeamSplitPanel form={form} employees={sortedEmployees} workloadMap={workloadMap} />
      )}
    </div>
  );
}
