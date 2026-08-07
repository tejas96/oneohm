'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentEntityType, FileCategory } from '@tejas96/shared/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { downloadReportPdf, renderReportPdfBlob } from '../utils/render-report-pdf';

import { documentKeys } from '@/components/features/documents/hooks';
import { projectReportKeys } from '@/components/features/projects/hooks/use-project-reports';
import { showToast } from '@/components/ui';
import { initializeReport, previewReport, saveReport } from '@/lib/api/reports';
import { deleteFile, uploadFile } from '@/lib/api/storage';

const PREVIEW_DEBOUNCE_MS = 400;

export function useReportEditor(projectId: string, reportId: string | null, open: boolean) {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewHtmlRef = useRef('');
  const initGenRef = useRef(0);
  const previewGenRef = useRef(0);

  const context = useMemo(
    () => ({
      entityType: DocumentEntityType.PROJECT,
      entityId: projectId,
    }),
    [projectId],
  );

  const resetEditorState = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
    initGenRef.current += 1;
    previewGenRef.current += 1;
    setFields({});
    setPreviewHtml('');
    previewHtmlRef.current = '';
    setInitialSnapshot('');
    setPreviewLoading(false);
    setLoading(false);
    setInitError(null);
    setIsReady(false);
  }, []);

  const loadInitialize = useCallback(
    async (ignoreSavedDraft = false) => {
      if (!reportId || !projectId) return;

      const gen = ++initGenRef.current;
      previewGenRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;

      setLoading(true);
      setInitError(null);
      setIsReady(false);
      setFields({});
      setPreviewHtml('');
      previewHtmlRef.current = '';

      try {
        const result = await initializeReport(
          { reportId, context, ignoreSavedDraft },
        );
        if (gen !== initGenRef.current) return;

        setFields(result.fields);
        setPreviewHtml(result.html);
        previewHtmlRef.current = result.html;
        setInitialSnapshot(JSON.stringify(result.fields));
        setFormVersion((v) => v + 1);
        setIsReady(true);
      } catch (err) {
        if (gen !== initGenRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to load report';
        setInitError(message);
        showToast.error(message);
      } finally {
        if (gen === initGenRef.current) {
          setLoading(false);
        }
      }
    },
    [reportId, projectId, context],
  );

  useEffect(() => {
    if (open && reportId) {
      void loadInitialize(false);
    }
  }, [open, reportId, loadInitialize]);

  useEffect(() => {
    if (!open) {
      resetEditorState();
    }
  }, [open, resetEditorState]);

  const fetchLatestPreviewHtml = useCallback(async (): Promise<string> => {
    if (!reportId) throw new Error('No report selected');

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;

    const result = await previewReport({ reportId, context, fields });
    previewHtmlRef.current = result.html;
    setPreviewHtml(result.html);
    return result.html;
  }, [reportId, context, fields]);

  const schedulePreview = useCallback(
    (nextFields: Record<string, string>) => {
      if (!reportId || !isReady) return;

      const activeReportId = reportId;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        void (async () => {
          const previewGen = ++previewGenRef.current;
          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;
          setPreviewLoading(true);

          try {
            const result = await previewReport(
              { reportId: activeReportId, context, fields: nextFields },
              controller.signal,
            );

            if (
              controller.signal.aborted ||
              previewGen !== previewGenRef.current ||
              activeReportId !== reportId
            ) {
              return;
            }

            if (result.html !== previewHtmlRef.current) {
              previewHtmlRef.current = result.html;
              setPreviewHtml(result.html);
            }
          } catch (err) {
            if (controller.signal.aborted) return;
            showToast.error(err instanceof Error ? err.message : 'Failed to update preview');
          } finally {
            if (!controller.signal.aborted && previewGen === previewGenRef.current) {
              setPreviewLoading(false);
            }
          }
        })();
      }, PREVIEW_DEBOUNCE_MS);
    },
    [reportId, context],
  );

  const handleFieldsChange = useCallback(
    (updated: Record<string, string>) => {
      setFields(updated);
      schedulePreview(updated);
    },
    [schedulePreview],
  );

  const isDirty = isReady && initialSnapshot !== '' && JSON.stringify(fields) !== initialSnapshot;
  const actionsDisabled = loading || !isReady || !!initError;

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) throw new Error('No report selected');
      if (!isReady) throw new Error('Report is not ready');
      const html = await fetchLatestPreviewHtml();
      await downloadReportPdf(html, `${reportId}.pdf`);
    },
    onSuccess: () => {
      showToast.success('PDF downloaded');
    },
    onError: (err: Error) => showToast.error(err.message || 'Failed to generate PDF'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) throw new Error('No report selected');
      if (!isReady) throw new Error('Report is not ready');

      const html = await fetchLatestPreviewHtml();
      const blob = await renderReportPdfBlob(html);
      const pdfFile = new File([blob], `${reportId}.pdf`, { type: 'application/pdf' });

      const upload = await uploadFile({
        file: pdfFile,
        category: FileCategory.PROJECT,
        entityId: projectId,
        entityType: 'project',
        subCategory: reportId,
      });

      try {
        return await saveReport(
          {
            reportId,
            context,
            fields,
            file: {
              fileKey: upload.fileKey,
              publicUrl: upload.publicUrl,
              fileSizeBytes: blob.size,
            },
          },
        );
      } catch (err) {
        try {
          await deleteFile(upload.fileKey);
        } catch {
          /* best-effort cleanup */
        }
        throw err;
      }
    },
    onSuccess: () => {
      showToast.success('Report saved to project');
      setInitialSnapshot(JSON.stringify(fields));
      void queryClient.invalidateQueries({ queryKey: documentKeys.all() });
      void queryClient.invalidateQueries({
        queryKey: projectReportKeys.byProject(projectId),
      });
    },
    onError: (err: Error) => showToast.error(err.message || 'Failed to save report'),
  });

  return {
    fields,
    previewHtml,
    formVersion,
    loading,
    previewLoading,
    initError,
    isReady,
    isDirty,
    actionsDisabled,
    handleFieldsChange,
    refreshFromProject: () => loadInitialize(true),
    retryInitialize: () => loadInitialize(false),
    downloadPdf: generateMutation.mutateAsync,
    saveToProject: saveMutation.mutateAsync,
    isDownloading: generateMutation.isPending,
    isSaving: saveMutation.isPending,
  };
}
