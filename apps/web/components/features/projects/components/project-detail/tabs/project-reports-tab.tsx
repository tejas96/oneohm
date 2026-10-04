'use client';

import { Alert, Box } from '@mui/material';
import {
  isGeneratableStatus,
  isPendingStatus,
  type WorkspaceFact,
  type WorkspaceReport,
} from '@tejas96/shared/reports';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useProjectReports } from '../../../hooks';
import { DetailCard, TonePill } from '../primitives';
import { ReportFactsForm } from '../reports/components/report-facts-form';
import { ReportPreviewPanel } from '../reports/components/report-preview-panel';
import { ReportStatusCards } from '../reports/components/report-status-cards';
import { ReportsSaveBar } from '../reports/components/reports-save-bar';
import { ALL_REPORTS, ReportsToolbar } from '../reports/components/reports-toolbar';
import { useGenerateReports } from '../reports/hooks/use-generate-reports';
import { useReportFactDrafts } from '../reports/hooks/use-report-fact-drafts';
import { useReportRender } from '../reports/hooks/use-report-render';
import { isQuoteSourcedKey } from '../reports/utils/fact-source';

import { Skeleton } from '@/components/ui/skeleton';
import { useCan, useGatedAction } from '@/lib/rbac';

/** The workspace fact a missing key shows on: itself, or the visible part it composes into. */
function findFillTarget(facts: WorkspaceFact[], key: string): WorkspaceFact | undefined {
  return (
    facts.find((f) => f.key === key) ??
    facts.find((f) => (f.covers as readonly string[]).includes(key))
  );
}

interface ProjectReportsTabProps {
  projectId: string;
}

/**
 * The DISCOM paperwork. Every fact is shown once and printed by every report
 * that needs it. Hand-typed, customer, site and quote facts are edited in
 * place and saved together with Save; BOM and company facts are locked.
 * Nothing here navigates away.
 */
export function ProjectReportsTab({ projectId }: ProjectReportsTabProps): React.JSX.Element {
  const workspaceQuery = useProjectReports(projectId);
  const workspace = workspaceQuery.data;
  const [picked, setPicked] = useState<string>(ALL_REPORTS);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const { generate, runningId, runningIndex, runningTotal, outcomes, skipped, clearOutcomes } =
    useGenerateReports(projectId);
  // Owned here, not by the form: drafts must survive Preview, picking and generating.
  const canEdit = useCan().can('projects.edit');
  const rawDrafts = useReportFactDrafts(
    projectId,
    workspace?.facts ?? [],
    canEdit && !(workspace?.locked ?? false),
  );
  // A run's outcome lines describe a past run: any new edit makes them stale.
  const drafts = useMemo(
    () => ({
      ...rawDrafts,
      change: (fact: WorkspaceFact, raw: string) => {
        clearOutcomes();
        rawDrafts.change(fact, raw);
      },
    }),
    [rawDrafts, clearOutcomes],
  );
  const unsavedCount = drafts.changedKeys.size;
  const [saveFailed, setSaveFailed] = useState(false);
  const runSave = (): void => {
    void drafts.saveAll().then((ok) => setSaveFailed(!ok));
  };
  const discardAll = (): void => {
    drafts.discardAll();
    setSaveFailed(false);
  };

  const reports = workspace?.reports ?? [];
  const pickedId = picked === ALL_REPORTS ? null : picked;

  const previewId =
    pickedId ?? reports.find((r) => isPendingStatus(r.status))?.id ?? reports[0]?.id ?? null;
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
        : reports.filter((r) => isPendingStatus(r.status)),
    [pickedId, reports],
  );
  // What Generate would actually send: missing reports never go, they only get named in the skipped line.
  const sendableTargets = useMemo(
    () => targets.filter((r) => isGeneratableStatus(r.status)),
    [targets],
  );
  const allTargetsMissing = targets.length > 0 && sendableTargets.length === 0;

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

  const unsavedReason = unsavedCount > 0 ? 'Save your changes first' : undefined;
  const notNeeded = targets.length === 1 && targets[0]?.status === 'not_needed' ? targets[0] : null;
  const missingReason = notNeeded
    ? `Not needed: ${notNeeded.notNeededReason ?? 'it does not apply to this project'}`
    : allTargetsMissing
      ? `Fill in the missing details first${targets.length > 1 ? ` — ${targets.length} reports` : ''}`
      : undefined;
  // Unsaved changes take precedence: Generate would print the stored values, not them.
  const blockedReason = unsavedReason ?? missingReason;

  const runningReport = reports.find((r) => r.id === runningId);
  const generateLabel =
    runningId !== null
      ? `Filing ${runningReport?.shortName ?? runningReport?.name ?? ''} (${runningIndex} of ${runningTotal})…`
      : pickedId
        ? `Generate ${reports.find((r) => r.id === pickedId)?.shortName ?? 'report'}`
        : sendableTargets.length === 0
          ? 'Generate all'
          : `Generate ${sendableTargets.length} ready report${sendableTargets.length === 1 ? '' : 's'}`;

  const filedCount = outcomes.filter((o) => o.ok).length;
  const failedOutcomes = outcomes.filter((o) => !o.ok);
  const summaryParts = [
    filedCount > 0 ? `${filedCount} filed` : null,
    failedOutcomes.length > 0 ? `${failedOutcomes.length} failed` : null,
  ].filter((p): p is string => p !== null);
  const skippedFromQuote = skipped.reduce(
    (sum, r) => sum + r.missing.filter((m) => isQuoteSourcedKey(m.key)).length,
    0,
  );
  const skippedLine =
    skipped.length > 0
      ? `Skipped — need details: ${skipped.map((r) => r.shortName).join(', ')}${
          skippedFromQuote > 0 ? ` (${skippedFromQuote} from the quote)` : ''
        }`
      : null;

  const formRef = useRef<HTMLDivElement>(null);
  const [fillTarget, setFillTarget] = useState<{ key: string; token: number } | null>(null);

  const handleFillMissing = (report: WorkspaceReport): void => {
    clearOutcomes();
    setPicked(report.id);
    setMode('edit');
    const key = report.missing[0]?.key;
    if (key) setFillTarget({ key, token: Date.now() });
  };

  // Waits for the report pick and the edit form to render before scrolling: both
  // land in the same batched update as `fillTarget`, but the DOM needs a paint.
  useEffect(() => {
    if (!fillTarget || !workspace) return;
    const target = findFillTarget(workspace.facts, fillTarget.key);
    if (!target) return;

    let frame = 0;
    let tries = 0;
    const attempt = (): void => {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-fact-key="${target.key}"]`);
      if (!el) {
        if (tries++ < 30) frame = requestAnimationFrame(attempt);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const readOnly = !canEdit || runningId !== null;
      const focusable =
        target.editable && !readOnly
          ? el.querySelector<HTMLElement>('input, textarea, [role="combobox"]')
          : el.querySelector<HTMLElement>('button[aria-label^="About "]');
      focusable?.focus();
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [fillTarget, workspace, canEdit, runningId]);

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
            generateLabel={generateLabel}
            canGenerate={
              !locked &&
              targets.length > 0 &&
              !drafts.saving &&
              unsavedCount === 0 &&
              !allTargetsMissing
            }
            blockedReason={blockedReason}
            hideGenerate={locked}
          />

          <ReportsSaveBar
            changedCount={unsavedCount}
            saving={drafts.saving}
            failed={saveFailed && [...drafts.changedKeys].some((key) => drafts.errorFor(key))}
            onDiscard={discardAll}
            onSave={runSave}
          />

          <ReportStatusCards
            reports={reports}
            selectedId={pickedId}
            onSelect={(id) => setPicked((current) => (current === id ? ALL_REPORTS : id))}
            onFillMissing={handleFillMissing}
          />

          {(summaryParts.length > 0 || skippedLine) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {summaryParts.length > 0 && (
                <Alert severity={failedOutcomes.length > 0 ? 'warning' : 'success'} sx={{ py: 0 }}>
                  {summaryParts.join(' · ')}
                </Alert>
              )}
              {skippedLine && (
                <Alert severity="warning" sx={{ py: 0 }}>
                  {skippedLine}
                </Alert>
              )}
              {failedOutcomes.map((o) => (
                <Alert key={o.reportId} severity="error" sx={{ py: 0 }}>
                  <strong>{o.name}</strong> — {o.message}
                </Alert>
              ))}
            </Box>
          )}

          {mode === 'edit' ? (
            <Box ref={formRef}>
              <ReportFactsForm
                workspace={workspace}
                reportId={pickedId}
                disabled={runningId !== null}
                drafts={drafts}
              />
            </Box>
          ) : (
            <Box
              sx={{ height: 'min(80vh, 1200px)', display: 'flex', flexDirection: 'column', gap: 1 }}
            >
              {unsavedCount > 0 && (
                <Alert severity="warning" sx={{ py: 0 }}>
                  The preview shows saved values. Save your changes to see them here.
                </Alert>
              )}
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
