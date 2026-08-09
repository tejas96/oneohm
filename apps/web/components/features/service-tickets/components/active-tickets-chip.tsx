'use client';

import { type JSX } from 'react';

import { CrmStatusPill } from '@/components/shared/crm-table';

export interface ActiveTicketsChipProps {
  /** Open or in-progress tickets. Renders nothing at zero. */
  count: number;
}

/**
 * The active-service-tickets indicator.
 *
 * Shared verbatim by the customers list and the projects list so the two
 * screens cannot drift apart visually — change it here, not in a copy.
 *
 * Warning tone rather than danger: an open ticket needs attention, it is not
 * an error state.
 */
export function ActiveTicketsChip({ count }: ActiveTicketsChipProps): JSX.Element | null {
  if (!count || count <= 0) return null;

  return (
    <CrmStatusPill label={`${count} active ticket${count === 1 ? '' : 's'}`} tone="warning" dot />
  );
}
