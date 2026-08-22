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
  onCompleteFollowup: (item: DashboardItem) => void;
}

/**
 * Every row of one section, over the dashboard.
 *
 * `renderItem` draws OUR row unchanged, so the drawer and the card cannot drift
 * apart. Search is left to the drawer's own client-side filter — we pass no
 * `onSearch`, which is what tells it to filter on title and subtitle itself.
 */
export function ViewAllDrawer({
  open,
  onOpenChange,
  title,
  items,
  onCompleteFollowup,
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

  return (
    <DrillDownDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={`${items.length} items`}
      items={drillItems}
      searchPlaceholder="Search this list..."
      renderItem={(drill) => {
        const item = byId.get(drill.id);
        if (!item) return null;
        return <DashboardRow key={item.id} item={item} onCompleteFollowup={onCompleteFollowup} />;
      }}
      emptyContent={<p className="p-6 text-sm text-foreground-tertiary">Nothing here.</p>}
    />
  );
}
