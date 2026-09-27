'use client';

import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { Save } from 'lucide-react';

interface ReportsSaveBarProps {
  changedCount: number;
  saving: boolean;
  /** Save was pressed and something could not be sent or failed: the fields say what. */
  failed: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/** Sticks to the top of the Reports tab while anything is unsaved. */
export function ReportsSaveBar({
  changedCount,
  saving,
  failed,
  onDiscard,
  onSave,
}: ReportsSaveBarProps): React.JSX.Element | null {
  if (changedCount === 0 && !failed) return null;
  return (
    <Box
      role="region"
      aria-label="Unsaved changes"
      sx={{
        position: 'sticky',
        top: 'calc(var(--header-height, 48px) + 8px)',
        zIndex: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        border: 1,
        borderColor: failed ? 'error.main' : 'warning.main',
        bgcolor: 'background.paper',
        boxShadow: 2,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {changedCount === 1 ? '1 unsaved change' : `${changedCount} unsaved changes`}
      </Typography>
      {failed && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          Not saved — fix the fields marked in red.
        </Typography>
      )}
      <Box sx={{ flex: 1 }} />
      <Button variant="text" color="inherit" onClick={onDiscard} disabled={saving}>
        Discard
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={saving || changedCount === 0}
        startIcon={
          saving ? <CircularProgress size={14} color="inherit" /> : <Save className="size-4" />
        }
      >
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </Box>
  );
}
