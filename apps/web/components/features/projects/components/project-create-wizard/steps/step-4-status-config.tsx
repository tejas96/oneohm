'use client';

import TuneIcon from '@mui/icons-material/Tune';
import type { UseFormReturn } from 'react-hook-form';

import type { ProjectCreateFormData } from '../../../schemas/project-create.schema';
import { ProjectStatusConfigStep } from '../project-status-config-step';

import { MUITypography } from '@/components/ui';

// ── Props ──────────────────────────────────────────────────────

interface Step4StatusConfigProps {
  form: UseFormReturn<ProjectCreateFormData>;
}

// ── Component ─────────────────────────────────────────────────

export function Step4StatusConfig({ form }: Step4StatusConfigProps): React.JSX.Element {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <TuneIcon className="text-primary" fontSize="small" />
        </div>
        <div>
          <MUITypography variant="sectionTitle">Project Statuses</MUITypography>
          <MUITypography variant="body" className="text-foreground-secondary">
            Configure the task statuses for this project. These define the columns in your Kanban
            board.
          </MUITypography>
        </div>
      </div>

      <ProjectStatusConfigStep form={form} />
    </div>
  );
}
