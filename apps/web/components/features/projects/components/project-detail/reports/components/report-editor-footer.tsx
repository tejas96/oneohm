'use client';

import { Box, Button, CircularProgress } from '@mui/material';

interface ReportEditorFooterProps {
  onDownload: () => void;
  onSave: () => void;
  isDownloading: boolean;
  isSaving: boolean;
  disabled?: boolean;
}

export function ReportEditorFooter({
  onDownload,
  onSave,
  isDownloading,
  isSaving,
  disabled,
}: ReportEditorFooterProps) {
  const busy = isDownloading || isSaving;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'flex-end',
        gap: 1.5,
        p: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Button
        variant="outlined"
        onClick={onDownload}
        disabled={disabled || busy}
        startIcon={isDownloading ? <CircularProgress size={16} /> : undefined}
        sx={{ whiteSpace: 'nowrap', width: { xs: '100%', md: 'auto' } }}
      >
        Download PDF
      </Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={disabled || busy}
        startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{ whiteSpace: 'nowrap', width: { xs: '100%', md: 'auto' } }}
      >
        Save to project
      </Button>
    </Box>
  );
}
