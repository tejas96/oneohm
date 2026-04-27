'use client';

import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import React from 'react';

interface KanbanColumnHeaderProps {
  label: string;
  color: string;
  count: number;
  isOver: boolean;
  onAddTask: () => void;
}

export function KanbanColumnHeader({
  label,
  color,
  count,
  isOver,
  onAddTask,
}: KanbanColumnHeaderProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.5,
        py: 1,
        position: 'sticky',
        top: 0,
        zIndex: 1,
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: color,
            flexShrink: 0,
            transition: 'transform 0.15s ease',
            transform: isOver ? 'scale(1.3)' : 'scale(1)',
          }}
        />
        <Typography
          variant="overline"
          sx={{
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 0.5,
            color: 'text.primary',
          }}
        >
          {label}
        </Typography>
        <Chip
          label={count}
          size="small"
          sx={{
            height: 18,
            fontSize: 11,
            fontWeight: 600,
            bgcolor: isOver ? 'primary.main' : 'action.hover',
            color: isOver ? 'primary.contrastText' : 'text.secondary',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Box>
      <Tooltip title={`Create task in ${label}`} placement="top">
        <Button
          size="small"
          variant="text"
          onClick={onAddTask}
          sx={{
            minWidth: 0,
            p: 0.5,
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </Button>
      </Tooltip>
    </Box>
  );
}

KanbanColumnHeader.displayName = 'KanbanColumnHeader';
