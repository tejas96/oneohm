'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceReport } from '@tejas96/shared/reports';
import { FileCategory } from '@tejas96/shared/types';
import { useCallback, useState } from 'react';

import { renderReportPdf } from '../utils/render-report-pdf';

import { documentKeys } from '@/components/features/documents/hooks';
import { projectReportKeys } from '@/components/features/projects/hooks/use-project-reports';
import { fileReport, renderReport } from '@/lib/api/reports';
import { deleteFile, uploadFile } from '@/lib/api/storage';

export interface GenerateOutcome {
  reportId: string;
  name: string;
  ok: boolean;
  message: string;
}

async function generateOne(projectId: string, report: WorkspaceReport): Promise<GenerateOutcome> {
  const { html, pages } = await renderReport(projectId, report.id);
  const pdf = await renderReportPdf(html);

  if (pages && pdf.pages !== pages) {
    throw new Error(`${report.name} came out as ${pdf.pages} pages, expected ${pages}. Nothing was filed.`);
  }

  const upload = await uploadFile({
    file: new File([pdf.blob], `${report.id}.pdf`, { type: 'application/pdf' }),
    category: FileCategory.PROJECT,
    entityId: projectId,
    entityType: 'project',
    subCategory: report.id,
  });

  try {
    await fileReport(projectId, report.id, {
      fileKey: upload.fileKey,
      publicUrl: upload.publicUrl,
      fileSizeBytes: pdf.blob.size,
    });
  } catch (err) {
    try {
      await deleteFile(upload.fileKey);
    } catch {
      /* best-effort cleanup */
    }
    throw err;
  }

  return { reportId: report.id, name: report.name, ok: true, message: 'Filed' };
}

/**
 * Generates one after another: html2pdf mounts a hidden frame per run and
 * parallel runs fight over fonts and layout. A failure is recorded and the
 * rest still run; a report with missing facts is skipped by name.
 */
export function useGenerateReports(projectId: string) {
  const queryClient = useQueryClient();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<GenerateOutcome[]>([]);

  const generate = useCallback(
    async (reports: WorkspaceReport[]): Promise<GenerateOutcome[]> => {
      const results: GenerateOutcome[] = [];
      setOutcomes([]);

      for (const report of reports) {
        if (report.status === 'missing') {
          results.push({
            reportId: report.id,
            name: report.name,
            ok: false,
            message: `Skipped — missing ${report.missing.map((m) => m.label).join(', ')}`,
          });
          continue;
        }
        setRunningId(report.id);
        try {
          results.push(await generateOne(projectId, report));
        } catch (err) {
          const axiosMessage = (err as { response?: { data?: { message?: string } } }).response
            ?.data?.message;
          results.push({
            reportId: report.id,
            name: report.name,
            ok: false,
            message: axiosMessage ?? (err instanceof Error ? err.message : 'Failed'),
          });
        }
      }

      setRunningId(null);
      setOutcomes(results);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectReportKeys.all() }),
        queryClient.invalidateQueries({ queryKey: documentKeys.all() }),
      ]);
      return results;
    },
    [projectId, queryClient],
  );

  return { generate, runningId, outcomes, clearOutcomes: () => setOutcomes([]) };
}
