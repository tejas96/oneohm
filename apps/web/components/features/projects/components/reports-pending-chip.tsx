'use client';

import { type JSX } from 'react';

import { CrmStatusPill } from '@/components/shared/crm-table';

export function ReportsPendingChip({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;
  return (
    <CrmStatusPill label={`${count} report${count === 1 ? '' : 's'} pending`} tone="warning" dot />
  );
}
