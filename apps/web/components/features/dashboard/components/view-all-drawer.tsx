'use client';

import type { DashboardItem } from '@tejas96/shared/types';
import * as React from 'react';

import { DashboardRow } from './dashboard-row';

import { DrillDownDrawer, type DrillDownItem } from '@/components/shared/drawers';

interface ViewAllDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: DashboardItem[];
  /** The section's true backend total. May exceed `items.length` — the
   *  backend caps rows per bucket, and the drawer does not lift that cap. */
  total: number;
  onCompleteFollowup: (item: DashboardItem) => void;
  /** Forwarded to every row — see `DashboardRow`. */
  readOnly?: boolean;
}

/**
 * Every row of one section, over the dashboard.
 *
 * `renderItem` draws OUR row unchanged, so the drawer and the card cannot drift
 * apart. Search is left to the drawer's own client-side filter — we pass no
 * `onSearch`, which is what tells it to filter on title and subtitle itself.
 *
 * The subtitle states its own scope rather than just a count: when `items`
 * is short of `total` (the backend's per-bucket cap, not paginated away),
 * "Showing N of M" says so plainly instead of implying the drawer holds
 * everything the overflow button counted.
 */
export function ViewAllDrawer({
  open,
  onOpenChange,
  title,
  items,
  total,
  onCompleteFollowup,
  readOnly = false,
}: ViewAllDrawerProps): React.JSX.Element {
  const byId = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const drillItems: DrillDownItem[] = React.useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: `${item.subtitle ? `${item.subtitle} · ` : ''}${item.reason}`,
      })),
    [items],
  );

  const subtitle = items.length < total ? `Showing ${items.length} of ${total}` : `${total} items`;

  return (
    <DrillDownDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={subtitle}
      items={drillItems}
      searchPlaceholder="Search this list..."
      renderItem={(drill) => {
        const item = byId.get(drill.id);
        if (!item) return null;
        return (
          <DashboardRow
            key={item.id}
            item={item}
            onCompleteFollowup={onCompleteFollowup}
            readOnly={readOnly}
          />
        );
      }}
      emptyContent={<p className="p-6 text-sm text-foreground-tertiary">Nothing here.</p>}
    />
  );
}
