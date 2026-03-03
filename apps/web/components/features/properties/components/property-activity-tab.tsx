'use client';

import { Activity } from 'lucide-react';
import type { JSX } from 'react';

import { EmptyState } from '@/components/shared/feedback/empty-state';

interface PropertyActivityTabProps {
  propertyId: string;
}

// TODO: Phase 2 – replace with real activity API integration
export function PropertyActivityTab({
  propertyId: _propertyId,
}: PropertyActivityTabProps): JSX.Element {
  return (
    <EmptyState
      icon={<Activity className="w-full h-full" />}
      title="Activity log"
      description="Activity tracking will be available soon. Check back for property event history."
    />
  );
}
