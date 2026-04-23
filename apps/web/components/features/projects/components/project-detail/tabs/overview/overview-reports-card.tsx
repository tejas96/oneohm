'use client';

import { Download, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useProjectReports } from '../../../../hooks';
import { ReportEditorModal } from '../../reports/components/report-editor-page';
import { useReportDownload } from '../../reports/hooks/use-report-download';
import { REPORT_REGISTRY } from '../../reports/registry/report-registry';
import type { ReportTemplate } from '../../reports/types/report.types';

import { Button, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/utils/format';

interface OverviewReportsCardProps {
  projectId: string;
  isActive: boolean;
}

export function OverviewReportsCard({
  projectId,
  isActive,
}: OverviewReportsCardProps): React.ReactElement {
  const { data, isLoading } = useProjectReports(projectId, { enabled: isActive });
  const { download, isDownloading } = useReportDownload();
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);

  const templateByTag = useMemo(
    () => new Map(REPORT_REGISTRY.map((template) => [template.documentTag, template])),
    [],
  );

  return (
    <div className="rounded-xl border border-border-light/70 bg-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Reports</p>
        <span className="text-[11px] text-foreground-secondary">
          {data?.generated.length ?? 0} generated
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : data && data.generated.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {data.generated.map((doc) => {
            const template = templateByTag.get(
              doc.tag as (typeof REPORT_REGISTRY)[number]['documentTag'],
            );
            return (
              <div
                key={doc.id}
                className="rounded-lg border border-border-light p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-foreground truncate">
                      {template?.name ?? doc.fileName}
                    </p>
                    <p className="text-[10px] text-foreground-secondary mt-0.5">
                      {formatDate(doc.updatedAt, 'short')}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5 pl-[42px]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => void download(doc)}
                    disabled={isDownloading}
                  >
                    <Download className="size-3 mr-1" />
                    Download
                  </Button>
                  {template && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setActiveTemplate(template)}
                    >
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(data?.available ?? REPORT_REGISTRY).map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setActiveTemplate(template)}
              className="text-left rounded-lg border border-border-light p-3 hover:bg-muted hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground truncate">
                    {template.name}
                  </p>
                  <p className="text-[10px] text-foreground-secondary mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeTemplate && (
        <ReportEditorModal
          key={activeTemplate.id}
          open={!!activeTemplate}
          onClose={() => setActiveTemplate(null)}
          template={activeTemplate}
          projectId={projectId}
        />
      )}
    </div>
  );
}
