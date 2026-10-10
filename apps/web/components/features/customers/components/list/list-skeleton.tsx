import type { JSX } from 'react';

import { ROW_CELL, ROW_GRID } from './row-layout';

import { BONE, SKELETON_CARD } from '@/components/shared/calm-list';
import { cn } from '@/lib/utils';

/** One placeholder shaped like a customer row, so nothing jumps when data lands. */
export function CustomerRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <div className={cn(ROW_CELL.who, 'flex items-center gap-3.5')}>
        <span className={cn(BONE, 'size-11 flex-none')} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={cn(BONE, 'h-4 w-3/5')} />
          <span className={cn(BONE, 'h-3 w-4/5')} />
        </span>
      </div>
      <div className={cn(ROW_CELL.journey, 'flex flex-col gap-3')}>
        <span className={cn(BONE, 'h-3.5 w-1/3')} />
        <span className={cn(BONE, 'h-1.5 w-full')} />
      </div>
      <div className={cn(ROW_CELL.next, 'flex items-center gap-2.5')}>
        <span className={cn(BONE, 'size-[34px] flex-none')} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={cn(BONE, 'h-3.5 w-2/3')} />
          <span className={cn(BONE, 'h-3 w-1/2')} />
        </span>
      </div>
      <div className={cn(ROW_CELL.value, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-4 w-20')} />
        <span className={cn(BONE, 'h-3 w-14')} />
      </div>
      <div className={cn(ROW_CELL.actions, 'flex items-center justify-end gap-1.5')}>
        <span className={cn(BONE, 'size-7')} />
        <span className={cn(BONE, 'size-[34px]')} />
      </div>
    </div>
  );
}

/** A placeholder shaped like a site block in the focus panel. */
export function SiteSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-2.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className={cn(BONE, 'h-4 w-2/5')} />
        <span className={cn(BONE, 'h-4 w-20')} />
      </div>
      <span className={cn(BONE, 'h-3 w-3/5')} />
      <span className={cn(BONE, 'h-1.5 w-full')} />
      <span className={cn(BONE, 'h-3 w-1/2')} />
    </div>
  );
}
