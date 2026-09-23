'use client';

import type { ReportWorkspace } from '@tejas96/shared/reports';
import { FileCheck2 } from 'lucide-react';
import NextLink from 'next/link';

import { CardLink, DetailCard, EmptyPane, TonePill, Track } from '../../primitives';
import { REPORT_STATUS_META } from '../../reports/constants/report-status';
import type { Panel } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';

interface ReportsCardProps {
  reports: Panel<ReportWorkspace>;
  projectPath: string;
  className?: string;
}

/**
 * The DISCOM paperwork still outstanding — only what is not filed or is out
 * of date. The Reports tab holds the full set; this card links there.
 */
export function ReportsCard({
  reports,
  projectPath,
  className,
}: ReportsCardProps): React.JSX.Element {
  const all = reports.data?.reports ?? [];
  const outstanding = all.filter((r) => r.status !== 'filed');
  const filedCount = all.length - outstanding.length;
  const donePct = all.length > 0 ? (filedCount / all.length) * 100 : 0;
  const tabHref = `${projectPath}?tab=reports`;

  return (
    <DetailCard
      label="Reports"
      aside={reports.data ? `${filedCount} of ${all.length} filed` : undefined}
      action={<CardLink href={tabHref}>All reports</CardLink>}
      isError={reports.isError}
      onRetry={reports.refetch}
      className={className}
    >
      {reports.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-1.5 w-full rounded-pill" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="pb-3">
            <Track pct={donePct} tone={donePct >= 100 ? 'success' : 'accent'} height={6} />
          </div>

          {outstanding.length === 0 ? (
            <EmptyPane
              icon={<FileCheck2 className="size-4" strokeWidth={2} />}
              tone="success"
              title="Every report is filed"
              description="The DISCOM submission pack for this project is complete."
            />
          ) : (
            outstanding.map((report) => {
              const meta = REPORT_STATUS_META[report.status];
              return (
                <NextLink
                  key={report.id}
                  href={tabHref}
                  className="flex items-center justify-between gap-3 rounded-lg py-2 hover:bg-background-tertiary"
                >
                  <span className="truncate text-[13px]">{report.name}</span>
                  <TonePill label={meta.label} tone={meta.tone} dot />
                </NextLink>
              );
            })
          )}
        </>
      )}
    </DetailCard>
  );
}
