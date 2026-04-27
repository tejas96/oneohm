'use client';

import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import React from 'react';

import { TASK_VIEW_MODES, type TaskViewMode } from '../../../../constants';

interface TaskViewToggleProps {
  view: TaskViewMode;
  onViewChange: (view: TaskViewMode) => void;
}

export function TaskViewToggle({ view, onViewChange }: TaskViewToggleProps) {
  return (
    <ToggleButtonGroup
      value={view}
      exclusive
      onChange={(_e, val) => {
        if (val) onViewChange(val as TaskViewMode);
      }}
      size="small"
    >
      <ToggleButton value={TASK_VIEW_MODES.LIST} aria-label="List view" sx={{ px: 0.75, py: 0.5 }}>
        <ViewListIcon sx={{ fontSize: 18 }} />
      </ToggleButton>
      <ToggleButton
        value={TASK_VIEW_MODES.BOARD}
        aria-label="Board view"
        sx={{ px: 0.75, py: 0.5 }}
      >
        <ViewModuleIcon sx={{ fontSize: 18 }} />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
