'use client';

import { Menu, MenuItem } from '@mui/material';
import { getReportSchema } from '@tejas96/shared/reports';
import { MoreVertical } from 'lucide-react';
import React, { useState } from 'react';

import { Mono, ROW_BLEED, TonePill, type Tone } from '../../primitives';
import { useReportDownload } from '../hooks/use-report-download';

import type { DocumentRecord } from '@/lib/api/documents';
import { cn, formatDate } from '@/lib/utils';

export interface ReportRowProps {
  reportId: string;
  savedDoc: DocumentRecord | null;
  isComplete?: boolean;
  missingRequired?: number;
  onOpen: (reportId: string) => void;
  /**
   * `full` adds the report's description, its last-saved date and a menu for
   * downloading the filed PDF. `compact` is the Overview glance: state and
   * name only.
   */
  variant?: 'compact' | 'full';
}

interface Status {
  label: string;
  tone: Tone;
}

function statusOf(
  savedDoc: DocumentRecord | null,
  isComplete: boolean | undefined,
  missingRequired: number | undefined,
): Status {
  if (!savedDoc) return { label: 'Not saved', tone: 'neutral' };
  if (isComplete) return { label: 'Complete', tone: 'success' };
  const missing = missingRequired ?? 0;
  return {
    label: missing > 0 ? `${missing} missing` : 'Incomplete',
    tone: 'warning',
  };
}

/**
 * One required report.
 *
 * The single row implementation for both places a report is listed — the
 * Overview's Reports card and the Reports tab. They differ only in how much
 * they show, which is what `variant` controls; two components drawing the same
 * list is how the two drifted apart before.
 *
 * The whole row opens the editor. That is the only thing anyone does here, so
 * it should not need a button to aim at.
 */
export function ReportRow({
  reportId,
  savedDoc,
  isComplete,
  missingRequired,
  onOpen,
  variant = 'full',
}: ReportRowProps): React.JSX.Element {
  const schema = getReportSchema(reportId);
  const { download, isDownloading } = useReportDownload();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const status = statusOf(savedDoc, isComplete, missingRequired);
  const full = variant === 'full';

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl transition-colors duration-fast',
        ROW_BLEED,
        full ? 'py-2.5 even:bg-surface-alt' : 'py-1.5',
        'hover:bg-background-tertiary',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(reportId)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <TonePill label={status.label} tone={status.tone} dot className="w-[92px] justify-center" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground transition-colors group-hover:text-primary-dark">
            {schema.name}
          </span>
          {full ? (
            <span className="mt-0.5 block truncate text-[11.5px] text-foreground-tertiary">
              {schema.description}
            </span>
          ) : null}
        </span>
      </button>

      {full ? (
        <Mono className="hidden w-[104px] shrink-0 text-right text-[11.5px] text-foreground-secondary sm:block">
          {savedDoc ? formatDate(savedDoc.updatedAt, 'short') : '—'}
        </Mono>
      ) : null}

      {full ? (
        <>
          <button
            type="button"
            aria-label={`More actions for ${schema.name}`}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground-tertiary transition-colors duration-fast hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <MoreVertical className="size-4" />
          </button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { sx: { borderRadius: 'var(--radius-rf-lg)', mt: 0.5 } } }}
          >
            {savedDoc ? (
              <MenuItem
                dense
                disabled={isDownloading}
                onClick={() => {
                  setAnchorEl(null);
                  void download(savedDoc);
                }}
              >
                Download the filed PDF
              </MenuItem>
            ) : null}
            <MenuItem
              dense
              onClick={() => {
                setAnchorEl(null);
                onOpen(reportId);
              }}
            >
              {savedDoc ? 'Open and re-save' : 'Open to fill in'}
            </MenuItem>
          </Menu>
        </>
      ) : null}
    </div>
  );
}
