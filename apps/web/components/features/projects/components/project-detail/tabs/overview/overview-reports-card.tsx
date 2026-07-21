'use client';

import { REPORT_CATALOG } from '@tejas96/shared/reports';
import { useMemo, useState } from 'react';

import { useProjectReports } from '../../../../hooks';
import { ReportChecklistCompactRow } from '../../reports/components/report-checklist-compact-row';
import { ReportEditorDrawer } from '../../reports/components/report-editor-drawer';

import { Skeleton } from '@/components/ui';
import type { DocumentRecord } from '@/lib/api/documents';
import type { ReportCompletenessItem } from '@/lib/api/reports';

interface OverviewReportsCardProps {
  projectId: string;
  isActive: boolean;
}

export function OverviewReportsCard({
  projectId,
  isActive,
}: OverviewReportsCardProps): React.ReactElement {
  const { data: reportsData, isLoading } = useProjectReports(projectId, { enabled: isActive });
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
    for (const r of reportsData?.reports ?? []) {
      map.set(r.reportId, r);
    }
    return map;
  }, [reportsData?.reports]);

  const totalCount = reportsData?.totalCount ?? REPORT_CATALOG.length;
  const completedCount = reportsData?.reports.filter((r) => r.isSaved && r.isComplete).length ?? 0;

  return (
    <div className="rounded-xl shadow-e2/70 bg-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Reports</p>
        <span className="text-[11px] text-foreground-secondary">
          {completedCount} of {totalCount} complete
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {REPORT_CATALOG.map((schema) => {
            const completeness = completenessMap.get(schema.id);
            return (
              <ReportChecklistCompactRow
                key={schema.id}
                reportId={schema.id}
                savedDoc={savedByTag.get(schema.documentTag) ?? null}
                isComplete={completeness?.isComplete}
                missingRequired={completeness?.missingRequired}
                onOpen={setActiveReportId}
              />
            );
          })}
        </div>
      )}

      <ReportEditorDrawer
        reportId={activeReportId}
        projectId={projectId}
        open={!!activeReportId}
        onClose={() => setActiveReportId(null)}
      />
    </div>
  );
}
