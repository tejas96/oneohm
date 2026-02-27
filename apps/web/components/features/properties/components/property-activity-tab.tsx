'use client';

import {
  Clock,
  FileText,
  MapPin,
  Plus,
  Thermometer,
  UserCheck,
} from 'lucide-react';
import { type JSX, useState } from 'react';

import { Timeline, type TimelineItem } from '@/components/shared/timeline/timeline';

// ============================================================================
// Types
// ============================================================================

interface PropertyActivityTabProps {
  propertyId: string;
}

// ============================================================================
// Mock Activity Data (Phase 2: Replace with real API)
// ============================================================================

const MOCK_ACTIVITY: TimelineItem[] = [
  {
    id: '1',
    title: 'Quote #QT-2026-0051 created',
    description: '5kW On-Grid system quoted at ₹3,25,000',
    timestamp: new Date('2026-02-14T10:30:00Z'),
    icon: <FileText className="size-3" />,
    iconBgClass: 'bg-primary/10',
    iconTextClass: 'text-primary',
    badge: { label: 'Quote', variant: 'info' as const },
  },
  {
    id: '2',
    title: 'Temperature changed to Hot',
    description: 'Lead temperature updated from Warm to Hot',
    timestamp: new Date('2026-02-12T14:15:00Z'),
    icon: <Thermometer className="size-3" />,
    iconBgClass: 'bg-error/10',
    iconTextClass: 'text-error',
    badge: { label: 'Status', variant: 'warning' as const },
  },
  {
    id: '3',
    title: 'Site visit completed',
    description: 'Roof assessment completed with 450 sqft available',
    timestamp: new Date('2026-02-10T11:00:00Z'),
    icon: <MapPin className="size-3" />,
    iconBgClass: 'bg-success/10',
    iconTextClass: 'text-success',
    badge: { label: 'Visit', variant: 'success' as const },
  },
  {
    id: '4',
    title: 'Site visit scheduled',
    description: 'Visit scheduled for Feb 10, 2026',
    timestamp: new Date('2026-02-08T09:30:00Z'),
    icon: <MapPin className="size-3" />,
    iconBgClass: 'bg-info/10',
    iconTextClass: 'text-info',
  },
  {
    id: '5',
    title: 'Followup created',
    description: 'Call reminder for electricity bill discussion',
    timestamp: new Date('2026-02-05T16:00:00Z'),
    icon: <Clock className="size-3" />,
    iconBgClass: 'bg-warning/10',
    iconTextClass: 'text-warning',
    badge: { label: 'Followup', variant: 'warning' as const },
  },
  {
    id: '6',
    title: 'Followup completed',
    description: 'Initial consultation completed',
    timestamp: new Date('2026-02-03T10:00:00Z'),
    icon: <UserCheck className="size-3" />,
    iconBgClass: 'bg-success/10',
    iconTextClass: 'text-success',
    badge: { label: 'Followup', variant: 'success' as const },
  },
  {
    id: '7',
    title: 'Property created',
    description: 'Property profile created by Arun Kumar',
    timestamp: new Date('2026-01-28T10:00:00Z'),
    icon: <Plus className="size-3" />,
    iconBgClass: 'bg-muted',
    iconTextClass: 'text-foreground-secondary',
    badge: { label: 'Created', variant: 'default' as const },
  },
];

// ============================================================================
// Filter options
// ============================================================================

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Activity' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'visits', label: 'Site Visits' },
  { value: 'followups', label: 'Followups' },
  { value: 'status', label: 'Status Changes' },
];

function filterItems(items: TimelineItem[], filter: string): TimelineItem[] {
  if (filter === 'all') return items;

  const filterMap: Record<string, string[]> = {
    quotes: ['Quote #'],
    visits: ['Site visit', 'visit scheduled'],
    followups: ['Followup'],
    status: ['Temperature changed'],
  };

  const keywords = filterMap[filter] ?? [];
  return items.filter((item) =>
    keywords.some((kw) => item.title.toLowerCase().includes(kw.toLowerCase())),
  );
}

// ============================================================================
// Component
// ============================================================================

export function PropertyActivityTab({
  propertyId: _propertyId,
}: PropertyActivityTabProps): JSX.Element {
  const [filter, setFilter] = useState('all');
  const filteredItems = filterItems(MOCK_ACTIVITY, filter);

  return (
    <div className="p-4">
      <Timeline
        items={filteredItems}
        variant="full"
        groupByDate
        title="Activity"
        filterOptions={FILTER_OPTIONS}
        currentFilter={filter}
        onFilterChange={setFilter}
        emptyMessage="No activity found for this filter"
      />
    </div>
  );
}
