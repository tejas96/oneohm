'use client';

import { EmployeeProfileKind } from '@tejas96/shared/types';
import * as React from 'react';

import { useEmployees } from '@/components/features/employees/hooks/use-employees';
import { MUIInput } from '@/components/ui';
import { useCan } from '@/lib/rbac';

/** The sentinel for "my own work". A real uuid can never collide with it. */
const MINE = '__mine__';

type EmployeeOption = {
  value: string;
  label: string;
  [key: string]: unknown;
};

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

  const options: EmployeeOption[] = React.useMemo(() => {
    // Annotated, and sorted as a SEPARATE statement. `useEmployees` returns a
    // value eslint sees as `any`, so chaining `.sort()` straight onto `.map()`
    // gives the comparator `any` parameters and `localeCompare` becomes an
    // unsafe call. Sorting the annotated variable types `a` and `b` properly.
    const others: EmployeeOption[] = (employees ?? [])
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

  const selected = options.find((option) => option.value === (value ?? MINE)) ?? options[0] ?? null;

  // After the hooks, never before them — an early return above `useMemo` would
  // change the hook count between renders.
  if (!allowed) return null;

  return (
    <MUIInput
      mode="autocomplete"
      options={options}
      value={selected}
      onChange={(opt) => {
        if (!opt || typeof opt !== 'object' || !('value' in opt)) return;
        const next = String(opt.value);
        onChange(next === MINE ? undefined : next);
      }}
      clearable={false}
      openOnFocus
      size="small"
      sx={{ minWidth: 220 }}
      textFieldProps={{
        size: 'small',
        placeholder: 'Search people…',
        inputProps: { 'aria-label': 'Whose work to show' },
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
    />
  );
}
