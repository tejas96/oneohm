'use client';

import { Box } from '@mui/material';
import { FileText } from 'lucide-react';

import { ReportTemplateCard } from './report-template-card';
import { REPORT_REGISTRY } from '../registry/report-registry';
import type { ReportTemplate } from '../types/report.types';

import { EmptyState } from '@/components/shared';
import { MUITypography } from '@/components/ui';

interface ReportTemplateGridProps {
  projectId: string;
  onSelectTemplate: (template: ReportTemplate) => void;
}

export function ReportTemplateGrid({ projectId, onSelectTemplate }: ReportTemplateGridProps) {
  if (REPORT_REGISTRY.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="w-full h-full" />}
        iconColor="muted"
        title="No report templates"
        description="No report templates have been configured yet."
      />
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <MUITypography variant="sectionTitle">Reports</MUITypography>
        <MUITypography variant="body" sx={{ mt: 0.5 }}>
          Generate and download official project documents.
        </MUITypography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 2,
        }}
      >
        {REPORT_REGISTRY.map((template) => (
          <ReportTemplateCard
            key={template.id}
            template={template}
            projectId={projectId}
            onGenerate={onSelectTemplate}
          />
        ))}
      </Box>
    </Box>
  );
}
