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
import { useMemo, useState } from 'react';

import { useReportDownload } from '../hooks/use-report-download';

import { useProjectReports } from '@/components/features/projects/hooks';
import { MUITypography } from '@/components/ui/mui-typography';
import type { DocumentRecord } from '@/lib/api/documents';
import type { ReportCompletenessItem } from '@/lib/api/reports';
import { formatDate } from '@/lib/utils/format';

interface ReportChecklistRowProps {
  reportId: string;
  savedDoc: DocumentRecord | null;
  isComplete?: boolean;
  missingRequired?: number;
  onOpen: (reportId: string) => void;
}

export function ReportChecklistRow({
  reportId,
  savedDoc,
  isComplete,
  missingRequired,
  onOpen,
}: ReportChecklistRowProps) {
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
      <TableCell sx={{ width: 180 }}>
        {!savedDoc ? (
          <Chip
            label="Not saved"
            color="default"
            size="small"
            variant="outlined"
            sx={{ minWidth: 92 }}
          />
        ) : isComplete ? (
          <Chip
            label="Complete"
            color="success"
            size="small"
            variant="filled"
            sx={{ minWidth: 92 }}
          />
        ) : (
          <Chip
            label={`Incomplete (${missingRequired} pending)`}
            color="warning"
            size="small"
            variant="outlined"
            sx={{ minWidth: 92 }}
          />
        )}
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
          {[
            savedDoc && (
              <MenuItem
                key="download"
                disabled={isDownloading}
                onClick={() => {
                  setAnchorEl(null);
                  void download(savedDoc);
                }}
              >
                Download saved PDF
              </MenuItem>
            ),
            <MenuItem
              key="open"
              onClick={() => {
                setAnchorEl(null);
                onOpen(reportId);
              }}
            >
              {savedDoc ? 'Re-save from editor' : 'Open to save'}
            </MenuItem>,
          ].filter(Boolean)}
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
  const { data: reportsData } = useProjectReports(projectId);

  const savedByTag = useMemo(() => {
    const map = new Map<string, DocumentRecord>();
    for (const doc of reportsData?.saved ?? []) {
      if (!map.has(doc.tag)) map.set(doc.tag, doc);
    }
    return map;
  }, [reportsData?.saved]);

  const completenessMap = useMemo(() => {
    const map = new Map<string, ReportCompletenessItem>();
    for (const r of reportsData?.reports ?? []) {
      map.set(r.reportId, r);
    }
    return map;
  }, [reportsData?.reports]);

  const totalCount = reportsData?.totalCount ?? REPORT_CATALOG.length;
  const pendingCount = reportsData?.pendingCount ?? 0;
  const completedCount = reportsData?.reports.filter((r) => r.isSaved && r.isComplete).length ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <MUITypography variant="sectionTitle">Project Reports</MUITypography>
        <MUITypography variant="finePrint" color="text.secondary">
          {completedCount} of {totalCount} reports complete · {pendingCount} pending
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
          {REPORT_CATALOG.map((schema) => {
            const completeness = completenessMap.get(schema.id);
            return (
              <ReportChecklistRow
                key={schema.id}
                reportId={schema.id}
                savedDoc={savedByTag.get(schema.documentTag) ?? null}
                isComplete={completeness?.isComplete}
                missingRequired={completeness?.missingRequired}
                onOpen={onOpenReport}
              />
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
