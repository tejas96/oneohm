'use client';

import { Clock } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/shared/feedback/empty-state';

interface QuoteComingSoonTabProps {
  tabName: string;
}

export function QuoteComingSoonTab({ tabName }: QuoteComingSoonTabProps): React.JSX.Element {
  return (
    <div className="mt-4">
      <EmptyState
        icon={<Clock className="w-full h-full" />}
        title={`${tabName} Coming Soon`}
        description={`The ${tabName.toLowerCase()} tab is under development and will be available soon.`}
      />
    </div>
  );
}
