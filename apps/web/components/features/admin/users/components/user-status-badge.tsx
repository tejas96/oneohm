'use client';

import { USER_STATUS_VARIANTS, USER_STATUS_LABELS } from '../../constants';

import { Badge } from '@/components/ui';

interface UserStatusBadgeProps {
  status: string;
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const variant = USER_STATUS_VARIANTS[status] ?? 'secondary';
  const label = USER_STATUS_LABELS[status] ?? status;

  return (
    <Badge variant={variant as 'success' | 'secondary' | 'error'} size="xs">
      {label}
    </Badge>
  );
}
