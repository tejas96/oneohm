'use client';

import { useMemo, type JSX } from 'react';

import type { TeamMemberSummary } from '../hooks';

import { MUIAvatarGroup, type MUIAvatarGroupMember } from '@/components/ui';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TeamAvatarGroupProps {
  members: TeamMemberSummary[];
  max?: number;
  size?: 'xs' | 'sm';
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (memberId: string) => void;
  onClear?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

/** Size token → pixel diameter matching the design system avatar sizes */
const SIZE_PX: Record<'xs' | 'sm', number> = { xs: 28, sm: 32 };

export function TeamAvatarGroup({
  members,
  max = 3,
  size = 'xs',
  selectable,
  selectedIds,
  onToggle,
  onClear,
}: TeamAvatarGroupProps): JSX.Element {
  const groupMembers = useMemo<MUIAvatarGroupMember[]>(
    () =>
      members.map((m) => ({
        id: m.id,
        displayName: `${m.firstName}${m.lastName ? ` ${m.lastName}` : ''}`.trim() || 'Unknown',
      })),
    [members],
  );

  return (
    <MUIAvatarGroup
      members={groupMembers}
      max={max}
      size={SIZE_PX[size]}
      selectable={selectable}
      selectedIds={selectedIds}
      onToggle={onToggle}
      onClear={onClear}
      emptyText="No team"
    />
  );
}
