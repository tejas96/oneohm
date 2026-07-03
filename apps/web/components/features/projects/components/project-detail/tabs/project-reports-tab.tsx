'use client';

import { useState } from 'react';

import { ReportChecklist } from '../reports/components/report-checklist';
import { ReportEditorDrawer } from '../reports/components/report-editor-drawer';

interface ProjectReportsTabProps {
  projectId: string;
}

export function ProjectReportsTab({ projectId }: ProjectReportsTabProps): React.JSX.Element {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  return (
    <>
      <ReportChecklist projectId={projectId} onOpenReport={setActiveReportId} />
      <ReportEditorDrawer
        reportId={activeReportId}
        projectId={projectId}
        open={!!activeReportId}
        onClose={() => setActiveReportId(null)}
      />
    </>
  );
}
