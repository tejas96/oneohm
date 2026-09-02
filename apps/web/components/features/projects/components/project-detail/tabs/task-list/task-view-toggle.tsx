'use client';

import { Columns3, Rows3 } from 'lucide-react';
import React, { useMemo } from 'react';

import { TASK_VIEW_MODES, type TaskViewMode } from '../../../../constants';
import { SegmentedToggle, type SegmentedOption } from '../../primitives';

interface TaskViewToggleProps {
  view: TaskViewMode;
  onViewChange: (view: TaskViewMode) => void;
}

/**
 * List or board.
 *
 * A pill segmented control, matching the page's tab rail one step down. It
 * replaces MUI's `ToggleButtonGroup`, which draws two outlined boxes — the one
 * structural border left on this screen.
 */
export function TaskViewToggle({ view, onViewChange }: TaskViewToggleProps): React.JSX.Element {
  const options = useMemo<ReadonlyArray<SegmentedOption<TaskViewMode>>>(
    () => [
      { value: TASK_VIEW_MODES.LIST, label: 'List', icon: <Rows3 strokeWidth={1.75} /> },
      { value: TASK_VIEW_MODES.BOARD, label: 'Board', icon: <Columns3 strokeWidth={1.75} /> },
    ],
    [],
  );

  return (
    <SegmentedToggle value={view} options={options} onChange={onViewChange} ariaLabel="Task view" />
  );
}
