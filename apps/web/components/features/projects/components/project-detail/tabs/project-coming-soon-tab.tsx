'use client';

import { Clock } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/shared/feedback/empty-state';

interface ProjectComingSoonTabProps {
  tabName: string;
  description?: string;
}

export const ProjectComingSoonTab = React.memo(({
  tabName,
  description,
}: ProjectComingSoonTabProps): React.JSX.Element => {
  return (
    <div>
      <EmptyState
        icon={<Clock className="w-full h-full" />}
        iconColor="muted"
        title={`${tabName} is coming soon`}
        description={description ?? 'This feature is currently under development.'}
      />
      <div className="mt-4 p-3 bg-info/5 rounded-lg border border-info/20 max-w-sm mx-auto">
        <p className="text-2xs text-info text-center">
          This feature is under development.
        </p>
      </div>
    </div>
  );
});
