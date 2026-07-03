'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, Button, Chip, IconButton, Menu, MenuItem } from '@mui/material';
import { getReportSchema } from '@tejas96/shared/reports';
import { useState } from 'react';

import { useReportDownload } from '../hooks/use-report-download';

import { MUITypography } from '@/components/ui';
import type { DocumentRecord } from '@/lib/api/documents';
import { formatDate } from '@/lib/utils/format';

interface ReportChecklistCompactRowProps {
  reportId: string;
  savedDoc: DocumentRecord | null;
  onOpen: (reportId: string) => void;
}

export function ReportChecklistCompactRow({
  reportId,
  savedDoc,
  onOpen,
}: ReportChecklistCompactRowProps) {
  const schema = getReportSchema(reportId);
  const { download, isDownloading } = useReportDownload();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
      <Chip
        label={savedDoc ? 'Saved' : 'Not saved'}
        color={savedDoc ? 'success' : 'default'}
        size="small"
        variant={savedDoc ? 'filled' : 'outlined'}
        sx={{ minWidth: 88 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <MUITypography variant="body" fontWeight={600} noWrap>
          {schema.name}
        </MUITypography>
        {savedDoc && (
          <MUITypography variant="finePrint" color="text.secondary">
            {formatDate(savedDoc.updatedAt, 'short')}
          </MUITypography>
        )}
      </Box>
      <Button size="small" variant="outlined" onClick={() => onOpen(reportId)}>
        Open
      </Button>
      <IconButton
        size="small"
        aria-label="More actions"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {savedDoc && (
          <MenuItem
            disabled={isDownloading}
            onClick={() => {
              setAnchorEl(null);
              void download(savedDoc);
            }}
          >
            Download saved PDF
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
