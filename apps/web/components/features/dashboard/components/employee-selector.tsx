'use client';

import { EmployeeProfileKind } from '@tejas96/shared/types';
import * as React from 'react';

import { useEmployees } from '@/components/features/employees/hooks/use-employees';
import { MUISelect, type MUISelectOption } from '@/components/ui';
import { useCan } from '@/lib/rbac';

/** The sentinel for "my own work". A real uuid can never collide with it. */
const MINE = '__mine__';

interface EmployeeSelectorProps {
  /** The selected subject, or `undefined` for your own work. */
  value: string | undefined;
  onChange: (userId: string | undefined) => void;
  /** The signed-in user, so they can be dropped from the list of others. */
  selfUserId: string;
}

/**
 * Pick whose "My Work" dashboard to read.
 *
 * HIDDEN when the gate is closed, not shown-and-blocked. `can.tsx` says
 * clickable controls stay visible and explain themselves, because a user who
 * cannot see a button cannot know to ask for it — and that rule is right for
 * the data-changing controls it was written for. This is a view switch that
 * reads across the whole organisation. Showing it to all 40 staff would
 * advertise an org-wide read to people who will never hold it. Decision 5 of
 * the design spec records this as the deliberate exception.
 */
export function EmployeeSelector({
  value,
  onChange,
  selfUserId,
}: EmployeeSelectorProps): React.JSX.Element | null {
  const { can } = useCan();
  const allowed = can('dashboard.employees.view');

  // `enabled` keeps the request from firing at all for the ~everyone case.
  const { data: employees } = useEmployees({
    profileKind: EmployeeProfileKind.STAFF,
    enabled: allowed,
  });

  const options: MUISelectOption[] = React.useMemo(() => {
    // Annotated, and sorted as a SEPARATE statement. `useEmployees` returns a
    // value eslint sees as `any`, so chaining `.sort()` straight onto `.map()`
    // gives the comparator `any` parameters and `localeCompare` becomes an
    // unsafe call. Sorting the annotated variable types `a` and `b` properly.
    const others: Array<{ value: string; label: string }> = (employees ?? [])
      .filter((employee) => employee.userId !== selfUserId)
      .map((employee) => ({
        value: employee.userId,
        label:
          [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' ') ||
          'Unnamed employee',
      }));

    others.sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: MINE, label: 'My work' }, ...others];
  }, [employees, selfUserId]);

  // After the hooks, never before them — an early return above `useMemo` would
  // change the hook count between renders.
  if (!allowed) return null;

  return (
    <MUISelect
      options={options}
      value={value ?? MINE}
      onChange={(event) => {
        const next = String(event.target.value);
        onChange(next === MINE ? undefined : next);
      }}
      size="small"
      aria-label="Whose work to show"
      sx={{ minWidth: 220 }}
    />
  );
}
