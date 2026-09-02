'use client';

import { REPORT_CATALOG } from '@tejas96/shared/reports';
import { FileCheck2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ProjectReportsData } from '../../../../hooks/use-project-reports';
import { plural } from '../../lib/derive';
import { CardLink, DetailCard, EmptyPane, Mono, Track } from '../../primitives';
import { ReportEditorDrawer } from '../../reports/components/report-editor-drawer';
import { ReportRow } from '../../reports/components/report-row';
import type { Panel } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';
import type { DocumentRecord } from '@/lib/api/documents';
import type { ReportCompletenessItem } from '@/lib/api/reports';

interface ReportsCardProps {
  reports: Panel<ProjectReportsData>;
  projectId: string;
  projectPath: string;
  className?: string;
}

/**
 * The DISCOM paperwork still outstanding.
 *
 * Deliberately lists only what is NOT filed. The Reports tab holds the full
 * catalogue with descriptions, dates and downloads; showing all four here as
 * well would be the same list twice, and a completed report needs nothing from
 * anyone. Rows share the tab's row component at its compact density.
 */
export function ReportsCard({
  reports,
  projectId,
  projectPath,
  className,
}: ReportsCardProps): React.JSX.Element {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const savedByTag = useMemo(() => {
    const map = new Map<string, DocumentRecord>();
    for (const doc of reports.data?.saved ?? []) {
      if (!map.has(doc.tag)) map.set(doc.tag, doc);
    }
    return map;
  }, [reports.data?.saved]);

  const completenessMap = useMemo(() => {
    const map = new Map<string, ReportCompletenessItem>();
    for (const r of reports.data?.reports ?? []) map.set(r.reportId, r);
    return map;
  }, [reports.data?.reports]);

  const totalCount = reports.data?.totalCount ?? REPORT_CATALOG.length;
  const completedCount = reports.data?.reports.filter((r) => r.isSaved && r.isComplete).length ?? 0;
  const donePct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  /** Only the reports that still need something done to them. */
  const outstanding = useMemo(
    () =>
      REPORT_CATALOG.filter((schema) => {
        const completeness = completenessMap.get(schema.id);
        return !(completeness?.isSaved && completeness.isComplete);
      }),
    [completenessMap],
  );

  return (
    <DetailCard
      label="Reports"
      aside={reports.data ? `${completedCount} of ${totalCount} filed` : undefined}
      action={<CardLink href={`${projectPath}?tab=reports`}>All reports</CardLink>}
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
          <div className="flex items-center gap-3 pb-3">
            <Track pct={donePct} tone={donePct >= 100 ? 'success' : 'accent'} height={6} />
            <Mono className="shrink-0 text-[12px] font-medium text-foreground-secondary">
              {Math.round(donePct)}%
            </Mono>
          </div>

          {outstanding.length === 0 ? (
            <EmptyPane
              icon={<FileCheck2 className="size-4" strokeWidth={2} />}
              tone="success"
              title="Every report is filed"
              description="The DISCOM submission pack for this project is complete."
            />
          ) : (
            <>
              <p className="pb-1 text-[11.5px] text-foreground-tertiary">
                {outstanding.length} {plural(outstanding.length, 'report')} still to file
              </p>
              {outstanding.map((schema) => {
                const completeness = completenessMap.get(schema.id);
                return (
                  <ReportRow
                    key={schema.id}
                    reportId={schema.id}
                    savedDoc={savedByTag.get(schema.documentTag) ?? null}
                    isComplete={completeness?.isComplete}
                    missingRequired={completeness?.missingRequired}
                    onOpen={setActiveReportId}
                    variant="compact"
                  />
                );
              })}
            </>
          )}
        </>
      )}

      <ReportEditorDrawer
        reportId={activeReportId}
        projectId={projectId}
        open={!!activeReportId}
        onClose={() => setActiveReportId(null)}
      />
    </DetailCard>
  );
}
