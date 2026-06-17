'use client';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, Paper, Typography } from '@mui/material';
import { TaskPriority } from '@tejas96/shared/types';
import React from 'react';

export const PRIORITY_ICON: Record<string, React.ReactNode> = {
  [TaskPriority.URGENT]: <KeyboardDoubleArrowUpIcon sx={{ fontSize: 14 }} />,
  [TaskPriority.HIGH]: <KeyboardDoubleArrowUpIcon sx={{ fontSize: 14, opacity: 0.75 }} />,
  [TaskPriority.MEDIUM]: <RemoveIcon sx={{ fontSize: 14 }} />,
  [TaskPriority.NORMAL]: <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />,
  [TaskPriority.LOW]: <KeyboardDoubleArrowDownIcon sx={{ fontSize: 14 }} />,
};

export const PRIORITY_FALLBACK_ICON = <RemoveIcon sx={{ fontSize: 14 }} />;

interface CardPreviewProps {
  code: string;
  name: string;
  priorityColor: string;
}

export function CardPreview({ code, name, priorityColor }: CardPreviewProps): React.JSX.Element {
  return (
    <Paper
      elevation={8}
      sx={{
        width: 260,
        p: 1.5,
        borderRadius: 1.5,
        opacity: 0.95,
        transform: 'rotate(1.5deg)',
        bgcolor: 'background.paper',
        pointerEvents: 'none',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: priorityColor,
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 600 }}
        >
          {code}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          mt: 0.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          fontWeight: 500,
        }}
      >
        {name}
      </Typography>
    </Paper>
  );
}

CardPreview.displayName = 'CardPreview';
