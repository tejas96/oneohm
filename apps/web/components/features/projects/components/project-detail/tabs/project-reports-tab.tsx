'use client';

import { Alert, Box } from '@mui/material';
import { useIsMutating } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { projectReportKeys, useProjectReports } from '../../../hooks';
import { DetailCard, TonePill } from '../primitives';
import { ReportFactsForm } from '../reports/components/report-facts-form';
import { ReportPreviewPanel } from '../reports/components/report-preview-panel';
import { ReportStatusCards } from '../reports/components/report-status-cards';
import { ALL_REPORTS, ReportsToolbar } from '../reports/components/reports-toolbar';
import { useGenerateReports } from '../reports/hooks/use-generate-reports';
import { useReportFactSaves } from '../reports/hooks/use-report-fact-saves';
import { useReportRender } from '../reports/hooks/use-report-render';

import { Skeleton } from '@/components/ui/skeleton';
import { useCan, useGatedAction } from '@/lib/rbac';

interface ProjectReportsTabProps {
  projectId: string;
}

/**
 * The DISCOM paperwork. Every fact is shown once and printed by every report
 * that needs it. Hand-typed, customer and site facts are edited in place;
 * quote, BOM and company facts are locked. Nothing here navigates away.
 */
export function ProjectReportsTab({ projectId }: ProjectReportsTabProps): React.JSX.Element {
  const workspaceQuery = useProjectReports(projectId);
  const workspace = workspaceQuery.data;
  const [picked, setPicked] = useState<string>(ALL_REPORTS);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const { generate, runningId, outcomes, clearOutcomes } = useGenerateReports(projectId);
  const savingFacts = useIsMutating({ mutationKey: projectReportKeys.saveFacts(projectId) }) > 0;
  // Owned here, not by the form: held utility values must survive Preview, picking and generating.
  const canEdit = useCan().can('projects.edit');
  const saves = useReportFactSaves(
    projectId,
    workspace?.facts ?? [],
    canEdit && !(workspace?.locked ?? false),
  );
  const heldCount = saves.held.size;

  const reports = workspace?.reports ?? [];
  const pickedId = picked === ALL_REPORTS ? null : picked;

  const previewId =
    pickedId ?? reports.find((r) => r.status !== 'filed')?.id ?? reports[0]?.id ?? null;
  const previewReport = reports.find((r) => r.id === previewId);
  const render = useReportRender(
    projectId,
    mode === 'preview' ? previewId : null,
    workspaceQuery.dataUpdatedAt,
  );

  const targets = useMemo(
    () =>
      pickedId
        ? reports.filter((r) => r.id === pickedId)
        : reports.filter((r) => r.status !== 'filed'),
    [pickedId, reports],
  );

  const runGenerate = useGatedAction(
    'projects.edit',
    () => {
      clearOutcomes();
      void generate(targets);
    },
    'Generate reports',
  );

  const pendingCount = workspace?.pendingCount ?? 0;
  const locked = workspace?.locked ?? false;

  return (
    <DetailCard
      label="Reports"
      action={
        workspace && !locked ? (
          pendingCount > 0 ? (
            <TonePill label={`${pendingCount} still to file`} tone="warning" dot />
          ) : (
            <TonePill label="All filed" tone="success" dot />
          )
        ) : null
      }
      isError={workspaceQuery.isError}
      onRetry={() => void workspaceQuery.refetch()}
      errorHeight={200}
    >
      {workspaceQuery.isLoading || !workspace ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {locked && (
            <Alert severity="info" sx={{ py: 0 }}>
              This project is cancelled. Its reports are read-only.
            </Alert>
          )}

          <ReportsToolbar
            reports={reports}
            picked={picked}
            onPick={setPicked}
            mode={mode}
            onToggleMode={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
            onGenerate={runGenerate.onGatedClick}
            generating={runningId !== null}
            runningName={reports.find((r) => r.id === runningId)?.name ?? null}
            canGenerate={!locked && targets.length > 0 && !savingFacts && heldCount === 0}
            blockedReason={
              heldCount > 0
                ? `Finish the site's utility details first — ${heldCount} ${
                    heldCount === 1 ? 'change' : 'changes'
                  } not saved yet`
                : undefined
            }
            hideGenerate={locked}
          />

          <ReportStatusCards
            reports={reports}
            selectedId={pickedId}
            onSelect={(id) => setPicked((current) => (current === id ? ALL_REPORTS : id))}
          />

          {outcomes.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {outcomes.map((o) => (
                <Alert key={o.reportId} severity={o.ok ? 'success' : 'warning'} sx={{ py: 0 }}>
                  <strong>{o.name}</strong> — {o.message}
                </Alert>
              ))}
            </Box>
          )}

          {mode === 'edit' ? (
            <ReportFactsForm
              workspace={workspace}
              reportId={pickedId}
              disabled={runningId !== null}
              saves={saves}
            />
          ) : (
            <Box
              sx={{ height: 'min(80vh, 1200px)', display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              {previewReport?.pages && (
                <p className="text-[12px] text-foreground-secondary">
                  {previewReport.name} must print on exactly {previewReport.pages} pages. Generate
                  checks this and files nothing if it does not.
                </p>
              )}
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ReportPreviewPanel html={render.data?.html ?? ''} loading={render.isFetching} />
              </Box>
            </Box>
          )}
        </Box>
      )}
    </DetailCard>
  );
}
