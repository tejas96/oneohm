'use client';

import { EmptyState } from '@/components/shared';

interface AdminEmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function AdminEmptyState({
  title,
  description,
  action,
  secondaryAction,
}: AdminEmptyStateProps) {
  return (
    <div className="p-8">
      <EmptyState
        title={title}
        description={description}
        action={action}
        secondaryAction={secondaryAction}
      />
    </div>
  );
}
