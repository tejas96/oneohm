'use client';

import { REPORT_CATALOG } from '@tejas96/shared/reports';
import { useMemo, useState } from 'react';

import { useProjectReports } from '../../../hooks';
import { ColumnHeader, DetailCard, Mono, ROW_BLEED, TonePill, Track } from '../primitives';
import { ReportEditorDrawer } from '../reports/components/report-editor-drawer';
import { ReportRow } from '../reports/components/report-row';

import { Skeleton } from '@/components/ui/skeleton';
import type { DocumentRecord } from '@/lib/api/documents';
import type { ReportCompletenessItem } from '@/lib/api/reports';
import { cn } from '@/lib/utils';

interface ProjectReportsTabProps {
  projectId: string;
}

/**
 * The DISCOM paperwork.
 *
 * This drawer is the only place in the product that holds the sanction number,
 * the ALMM model number, earthing and lightning-arrester details, the CMC
 * period, the DCR application number and the module serials. Without a saved
 * report there is no submission, which is why the tab leads with how many are
 * still outstanding rather than with the list.
 */
export function ProjectReportsTab({ projectId }: ProjectReportsTabProps): React.JSX.Element {
  const { data: reportsData, isLoading, isError, refetch } = useProjectReports(projectId);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const savedByTag = useMemo(() => {
    const map = new Map<string, DocumentRecord>();
    for (const doc of reportsData?.saved ?? []) {
      if (!map.has(doc.tag)) map.set(doc.tag, doc);
    }
    return map;
  }, [reportsData?.saved]);

  const completenessMap = useMemo(() => {
    const map = new Map<string, ReportCompletenessItem>();
    for (const r of reportsData?.reports ?? []) map.set(r.reportId, r);
    return map;
  }, [reportsData?.reports]);

  const totalCount = reportsData?.totalCount ?? REPORT_CATALOG.length;
  const completedCount = reportsData?.reports.filter((r) => r.isSaved && r.isComplete).length ?? 0;
  const pendingCount = reportsData?.pendingCount ?? 0;
  const donePct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <>
      <DetailCard
        label="Reports"
        aside={reportsData ? `${completedCount} of ${totalCount} complete` : undefined}
        action={
          pendingCount > 0 ? (
            <TonePill
              label={`${pendingCount} still to file`}
              tone={completedCount === 0 ? 'danger' : 'warning'}
              dot
            />
          ) : reportsData ? (
            <TonePill label="All filed" tone="success" dot />
          ) : null
        }
        isError={isError}
        onRetry={() => {
          void refetch();
        }}
        errorHeight={200}
      >
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 pb-4">
              <Track pct={donePct} tone={donePct >= 100 ? 'success' : 'accent'} height={6} />
              <Mono className="shrink-0 text-[12px] font-medium text-foreground-secondary">
                {Math.round(donePct)}%
              </Mono>
            </div>

            <div className={cn('hidden items-center gap-3 pb-1.5 sm:flex', ROW_BLEED)} aria-hidden>
              <ColumnHeader className="w-[92px] text-center">State</ColumnHeader>
              <ColumnHeader className="flex-1">Report</ColumnHeader>
              <ColumnHeader className="w-[104px] text-right">Last saved</ColumnHeader>
              <span className="w-7 shrink-0" />
            </div>

            {REPORT_CATALOG.map((schema) => {
              const completeness = completenessMap.get(schema.id);
              return (
                <ReportRow
                  key={schema.id}
                  reportId={schema.id}
                  savedDoc={savedByTag.get(schema.documentTag) ?? null}
                  isComplete={completeness?.isComplete}
                  missingRequired={completeness?.missingRequired}
                  onOpen={setActiveReportId}
                  variant="full"
                />
              );
            })}

            <p className="pt-4 text-[11.5px] leading-relaxed text-foreground-tertiary">
              Saving a report files its PDF against this project and replaces the previous copy.
              Download the filed version first if you need to keep it.
            </p>
          </>
        )}
      </DetailCard>

      <ReportEditorDrawer
        reportId={activeReportId}
        projectId={projectId}
        open={!!activeReportId}
        onClose={() => setActiveReportId(null)}
      />
    </>
  );
}
