'use client';

import AddIcon from '@mui/icons-material/Add';
import InboxIcon from '@mui/icons-material/Inbox';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';

interface KanbanEmptyColumnProps {
  label: string;
  isOver: boolean;
  onAddTask: () => void;
}

export function KanbanEmptyColumn({
  label,
  isOver,
  onAddTask,
}: KanbanEmptyColumnProps): React.JSX.Element {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 4,
        px: 2,
        m: 1,
        border: '2px dashed',
        borderColor: isOver ? 'primary.main' : 'divider',
        borderRadius: 1.5,
        bgcolor: isOver ? 'rgba(0,82,204,0.06)' : 'transparent',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        minHeight: 120,
      }}
    >
      {isOver ? (
        <Typography variant="body2" color="primary.main" fontWeight={600} textAlign="center">
          Drop here to move to {label}
        </Typography>
      ) : (
        <>
          <InboxIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.disabled" textAlign="center">
            No tasks in {label}
          </Typography>
          <Button
            size="small"
            variant="text"
            startIcon={<AddIcon />}
            onClick={onAddTask}
            sx={{ fontSize: 12, color: 'text.secondary' }}
          >
            Add task
          </Button>
        </>
      )}
    </Box>
  );
}

KanbanEmptyColumn.displayName = 'KanbanEmptyColumn';
