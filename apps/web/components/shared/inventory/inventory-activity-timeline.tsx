'use client';

import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import * as React from 'react';

import { Timeline, type TimelineItem, type TimelineProps } from '@/components/shared/timeline';

/**
 * Inventory-specific adapter over the shared Timeline. Maps inventory
 * activity events (transactions, status changes, allocation/dispatch
 * lifecycle, payment events) to the generic `TimelineItem` shape.
 *
 * Why an adapter and not a fresh component:
 *   * The shared Timeline already handles grouping by date, load-more,
 *     filter selects, the visual rail, and empty/loading states.
 *   * What inventory needs that the generic timeline doesn't is:
 *     (a) consistent icon + colour conventions per event type, and
 *     (b) a label-aware data shape so callers don't hand-write the
 *     icon/badge wiring at every site.
 *
 * Per UX1 in the plan: each event must carry an explicit `kind`. We
 * use the event kind to pick the icon and the badge variant, but
 * caller controls the title/description text so domain phrasing stays
 * with the page that knows the most.
 */

export type InventoryEventKind =
  // Stock movements
  | 'stock-receive'
  | 'stock-adjust'
  | 'stock-transfer'
  | 'stock-deplete'
  // Lifecycle
  | 'created'
  | 'updated'
  | 'cancelled'
  | 'approved'
  | 'rejected'
  // Domain
  | 'allocated'
  | 'dispatched'
  | 'delivered'
  | 'payment-recorded';

export interface InventoryActivityEvent {
  id: string;
  kind: InventoryEventKind;
  timestamp: Date;
  title: string;
  description?: string;
  actor?: string;
  badgeLabel?: string;
  /** Optional drill-through link (e.g. to the related PO/dispatch). */
  href?: string;
}

const KIND_VISUALS: Record<
  InventoryEventKind,
  {
    icon: React.ReactNode;
    iconBgClass: string;
    iconTextClass: string;
    badgeVariant: NonNullable<TimelineItem['badge']>['variant'];
  }
> = {
  'stock-receive': {
    icon: <AddCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-success/10',
    iconTextClass: 'text-success',
    badgeVariant: 'success',
  },
  'stock-adjust': {
    icon: <EditOutlinedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-info/10',
    iconTextClass: 'text-info',
    badgeVariant: 'info',
  },
  'stock-transfer': {
    icon: <SwapHorizRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-info/10',
    iconTextClass: 'text-info',
    badgeVariant: 'info',
  },
  'stock-deplete': {
    icon: <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-warning/10',
    iconTextClass: 'text-warning',
    badgeVariant: 'warning',
  },
  created: {
    icon: <AddCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-primary/10',
    iconTextClass: 'text-primary',
    badgeVariant: 'default',
  },
  updated: {
    icon: <EditOutlinedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-muted',
    iconTextClass: 'text-foreground-tertiary',
    badgeVariant: 'default',
  },
  cancelled: {
    icon: <CancelOutlinedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-error/10',
    iconTextClass: 'text-error',
    badgeVariant: 'error',
  },
  approved: {
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-success/10',
    iconTextClass: 'text-success',
    badgeVariant: 'success',
  },
  rejected: {
    icon: <CancelOutlinedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-error/10',
    iconTextClass: 'text-error',
    badgeVariant: 'error',
  },
  allocated: {
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-info/10',
    iconTextClass: 'text-info',
    badgeVariant: 'info',
  },
  dispatched: {
    icon: <LocalShippingOutlinedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-info/10',
    iconTextClass: 'text-info',
    badgeVariant: 'info',
  },
  delivered: {
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-success/10',
    iconTextClass: 'text-success',
    badgeVariant: 'success',
  },
  'payment-recorded': {
    icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />,
    iconBgClass: 'bg-success/10',
    iconTextClass: 'text-success',
    badgeVariant: 'success',
  },
};

export interface InventoryActivityTimelineProps
  extends Pick<
    TimelineProps,
    | 'variant'
    | 'groupByDate'
    | 'onLoadMore'
    | 'hasMore'
    | 'isLoading'
    | 'emptyMessage'
    | 'title'
    | 'className'
  > {
  events: ReadonlyArray<InventoryActivityEvent>;
}

function adaptEvent(event: InventoryActivityEvent): TimelineItem {
  const visuals = KIND_VISUALS[event.kind];
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    timestamp: event.timestamp,
    icon: visuals.icon,
    iconBgClass: visuals.iconBgClass,
    iconTextClass: visuals.iconTextClass,
    actor: event.actor,
    badge: event.badgeLabel
      ? { label: event.badgeLabel, variant: visuals.badgeVariant }
      : undefined,
    action: event.href ? { label: 'View', href: event.href } : undefined,
  };
}

export function InventoryActivityTimeline({
  events,
  ...timelineProps
}: InventoryActivityTimelineProps): React.JSX.Element {
  const items = React.useMemo<TimelineItem[]>(() => {
    const result: TimelineItem[] = [];
    for (const event of events) {
      result.push(adaptEvent(event));
    }
    return result;
  }, [events]);
  return <Timeline items={items} {...timelineProps} />;
}

InventoryActivityTimeline.displayName = 'InventoryActivityTimeline';
