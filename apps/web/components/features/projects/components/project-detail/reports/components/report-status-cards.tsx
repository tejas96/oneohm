'use client';

import { Box, ButtonBase, IconButton, Link, Tooltip } from '@mui/material';
import type { WorkspaceReport } from '@tejas96/shared/reports';
import { Download } from 'lucide-react';

import { TonePill } from '../../primitives';
import { REPORT_STATUS_META } from '../constants/report-status';
import { useReportDownload } from '../hooks/use-report-download';
import { isQuoteSourcedKey } from '../utils/fact-source';

import { formatDate } from '@/lib/utils';

interface ReportStatusCardsProps {
  reports: WorkspaceReport[];
  selectedId: string | null;
  onSelect: (reportId: string) => void;
  /** Picks the report and jumps the form to its first missing field. */
  onFillMissing: (report: WorkspaceReport) => void;
}

/** "7 to fill" or, when some of that comes from the quote/BOM, "7 to fill · 5 from the quote". */
function missingText(report: WorkspaceReport): string {
  const fromQuote = report.missing.filter((m) => isQuoteSourcedKey(m.key)).length;
  const base = `${report.missing.length} to fill`;
  return fromQuote > 0 ? `${base} · ${fromQuote} from the quote` : base;
}

export function ReportStatusCards({
  reports,
  selectedId,
  onSelect,
  onFillMissing,
}: ReportStatusCardsProps) {
  const { download, isDownloading } = useReportDownload();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${reports.length}, minmax(0, 1fr))` },
        gap: 1,
      }}
    >
      {reports.map((report) => {
        const meta = REPORT_STATUS_META[report.status];
        const selected = report.id === selectedId;
        return (
          <Box
            key={report.id}
            sx={{
              position: 'relative',
              borderRadius: 2,
              border: selected ? '2px solid' : '1px solid',
              borderColor: selected ? 'primary.main' : 'divider',
              bgcolor: 'background.paper',
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
            }}
          >
            <ButtonBase
              onClick={() => onSelect(report.id)}
              aria-pressed={selected}
              sx={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0.75,
              }}
            >
              <span className="pr-7 text-[13px] font-medium leading-tight">{report.name}</span>
              <TonePill label={meta.label} tone={meta.tone} dot />
            </ButtonBase>
            {report.status === 'missing' ? (
              <Link
                component="button"
                type="button"
                variant="caption"
                onClick={() => onFillMissing(report)}
                sx={{ fontSize: '11.5px', textAlign: 'left' }}
              >
                {missingText(report)}
              </Link>
            ) : (
              <span className="text-[11.5px] text-foreground-tertiary">
                {report.filed ? `Filed ${formatDate(report.filed.filedAt)}` : 'Not filed yet'}
              </span>
            )}
            {report.filed && (
              <Tooltip title="Download filed copy">
                <IconButton
                  size="small"
                  aria-label={`Download ${report.name}`}
                  disabled={isDownloading}
                  onClick={() =>
                    void download({
                      fileUrl: report.filed!.fileUrl,
                      fileName: report.filed!.fileName,
                    })
                  }
                  sx={{ position: 'absolute', top: 6, right: 6 }}
                >
                  <Download className="size-4" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
