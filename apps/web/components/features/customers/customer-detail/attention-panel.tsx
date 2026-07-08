'use client';

import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import type { JSX } from 'react';

export interface AttentionItem {
  id: string;
  label: string;
  tab?: string;
}

interface CustomerAttentionPanelProps {
  items: AttentionItem[];
  onViewAll?: () => void;
}

export function CustomerAttentionPanel({
  items,
  onViewAll,
}: CustomerAttentionPanelProps): JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <Alert
      severity="warning"
      icon={<WarningAmberOutlinedIcon fontSize="small" />}
      sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box>
          <AlertTitle sx={{ mb: 0.25, fontSize: '0.8125rem' }}>Needs attention</AlertTitle>
          <Box component="span" sx={{ fontSize: '0.75rem' }}>
            {items.map((item) => item.label).join(' · ')}
          </Box>
        </Box>
        {onViewAll && (
          <Button
            size="small"
            onClick={onViewAll}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            View all
          </Button>
        )}
      </Box>
    </Alert>
  );
}
