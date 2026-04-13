'use client';

import React, { useState } from 'react';

import { ReportEditorModal } from '../reports/components/report-editor-page';
import { ReportTemplateGrid } from '../reports/components/report-template-grid';
import type { ReportTemplate } from '../reports/types/report.types';

interface ProjectReportsTabProps {
  projectId: string;
}

export function ProjectReportsTab({ projectId }: ProjectReportsTabProps): React.JSX.Element {
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);

  return (
    <>
      <ReportTemplateGrid projectId={projectId} onSelectTemplate={setActiveTemplate} />

      {activeTemplate && (
        <ReportEditorModal
          key={activeTemplate.id}
          open={!!activeTemplate}
          onClose={() => setActiveTemplate(null)}
          template={activeTemplate}
          projectId={projectId}
        />
      )}
    </>
  );
}
