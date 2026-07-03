'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { getReportSchema, REPORT_CATALOG } from '@tejas96/shared/reports';
import { DocumentEntityType } from '@tejas96/shared/types';
import { useMemo, useState } from 'react';

import { useReportDownload } from '../hooks/use-report-download';

import { useDocuments } from '@/components/features/documents/hooks';
import { MUITypography } from '@/components/ui/mui-typography';
import type { DocumentRecord } from '@/lib/api/documents';
import { formatDate } from '@/lib/utils/format';

interface ReportChecklistRowProps {
  reportId: string;
  savedDoc: DocumentRecord | null;
  onOpen: (reportId: string) => void;
}

export function ReportChecklistRow({ reportId, savedDoc, onOpen }: ReportChecklistRowProps) {
  const schema = getReportSchema(reportId);
  const { download, isDownloading } = useReportDownload();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <TableRow
      hover
      tabIndex={0}
      role="button"
      sx={{ cursor: 'pointer' }}
      onClick={() => onOpen(reportId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(reportId);
        }
      }}
    >
      <TableCell sx={{ width: 140 }}>
        <Chip
          label={savedDoc ? 'Saved to project' : 'Not saved'}
          color={savedDoc ? 'success' : 'default'}
          size="small"
          variant={savedDoc ? 'filled' : 'outlined'}
        />
      </TableCell>
      <TableCell>
        <MUITypography variant="body" fontWeight={600}>
          {schema.name}
        </MUITypography>
        <MUITypography
          variant="finePrint"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.5 }}
        >
          {schema.description}
        </MUITypography>
      </TableCell>
      <TableCell sx={{ width: 120, whiteSpace: 'nowrap' }}>
        {savedDoc ? formatDate(savedDoc.updatedAt, 'short') : '—'}
      </TableCell>
      <TableCell
        sx={{ width: 132, whiteSpace: 'nowrap' }}
        align="right"
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Button size="small" variant="contained" onClick={() => onOpen(reportId)}>
            Open
          </Button>
          <IconButton
            size="small"
            aria-label="More actions"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
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
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onOpen(reportId);
            }}
          >
            {savedDoc ? 'Re-save from editor' : 'Open to save'}
          </MenuItem>
        </Menu>
      </TableCell>
    </TableRow>
  );
}

interface ReportChecklistProps {
  projectId: string;
  onOpenReport: (reportId: string) => void;
}

export function ReportChecklist({ projectId, onOpenReport }: ReportChecklistProps) {
  const { data: docs } = useDocuments(DocumentEntityType.PROJECT, projectId);

  const savedByTag = useMemo(() => {
    const map = new Map<string, DocumentRecord>();
    for (const doc of docs ?? []) {
      if (!map.has(doc.tag)) map.set(doc.tag, doc);
    }
    return map;
  }, [docs]);

  const savedCount = REPORT_CATALOG.filter((s) => savedByTag.has(s.documentTag)).length;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <MUITypography variant="sectionTitle">Project Reports</MUITypography>
        <MUITypography variant="finePrint" color="text.secondary">
          {savedCount} of {REPORT_CATALOG.length} saved to project
        </MUITypography>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell>Report</TableCell>
            <TableCell>Last saved</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {REPORT_CATALOG.map((schema) => (
            <ReportChecklistRow
              key={schema.id}
              reportId={schema.id}
              savedDoc={savedByTag.get(schema.documentTag) ?? null}
              onOpen={onOpenReport}
            />
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
