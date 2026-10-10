'use client';

import { useMemo } from 'react';

import { useEmployees } from '@/components/features/employees';

const NO_NAMES: ReadonlyMap<string, string> = new Map();

/**
 * Reseller names by profile id.
 *
 * A list item only carries `resellerId`. The employees request this page
 * already makes for its filter options includes reseller profiles, so the
 * names cost no extra request. A reseller who is no longer active is not in
 * that list; the row then reads plain "Reseller".
 */
export function useResellerNames(): ReadonlyMap<string, string> {
  const { data: employees } = useEmployees();

  return useMemo(() => {
    if (!employees) return NO_NAMES;
    const names = new Map<string, string>();
    for (const employee of employees) {
      const name =
        employee.companyName?.trim() ||
        `${employee.user?.firstName ?? ''} ${employee.user?.lastName ?? ''}`.trim();
      if (name) names.set(employee.id, name);
    }
    return names;
  }, [employees]);
}
