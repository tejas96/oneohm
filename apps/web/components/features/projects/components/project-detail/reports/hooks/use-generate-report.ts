'use client';

import { DocumentCategory, DocumentEntityType, FileCategory } from '@oneohm-epc/shared/types';
import { useCallback, useRef, useState } from 'react';

import type { GenerateStatus, ReportTemplate } from '../types/report.types';

import { useUploadDocument } from '@/components/features/documents/hooks';
import { showToast } from '@/components/ui';
import { deleteDocument, getDocuments } from '@/lib/api/documents';
import { deleteFile, uploadFile } from '@/lib/api/storage';
import { useOrgContext } from '@/lib/hooks/core';
import { extractFileKey } from '@/lib/utils';

export function useGenerateReport(projectId: string) {
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { organizationId } = useOrgContext();
  const uploadMutation = useUploadDocument();

  // Stable ref so generate() callback doesn't re-create on mutation state changes
  const uploadMutateRef = useRef(uploadMutation.mutateAsync);
  uploadMutateRef.current = uploadMutation.mutateAsync;

  // Guard against rapid double-click races before UI disabled state propagates
  const pipelineRunningRef = useRef(false);

  const generate = useCallback(
    async <T>(template: ReportTemplate<T>, fields: T): Promise<void> => {
      if (!projectId || pipelineRunningRef.current) return;

      pipelineRunningRef.current = true;
      setStatus('generating');
      setErrorMsg(null);
      let container: HTMLDivElement | null = null;

      try {
        // 1. Build HTML string
        const html = template.generateHtml(fields);

        // 2. Inject into off-screen div — same pattern as quote-pdf.service.ts.
        //    Target the inner content element (template.contentSelector) so html2canvas
        //    captures only the styled page div, not the outer wrapper.
        const html2pdf = (await import('html2pdf.js')).default;
        container = document.createElement('div');
        container.style.cssText = 'position:absolute;left:-9999px;top:0;';
        container.innerHTML = html;
        document.body.appendChild(container);

        const target =
          (container.querySelector(template.contentSelector) as HTMLElement) ?? container;

        // A4 at 96dpi ≈ 794 × 1123px. Providing explicit dimensions prevents
        // html2canvas from spawning an internal cross-origin iframe to measure
        // fonts, which would throw a SecurityError in same-site strict contexts.
        const A4_W_PX = 794;
        const A4_H_PX = 1123;

        const pdfBlob = (await html2pdf()
          .set({
            margin: 0,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              letterRendering: true,
              logging: false,
              windowWidth: A4_W_PX,
              windowHeight: A4_H_PX * 2, // both pages tall
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            // Cut at the explicit .pdf-page-break element; also honour
            // page-break-inside:avoid on table rows and paragraphs.
            // @ts-expect-error — 'pagebreak' is a valid html2pdf.js option but
            // is missing from the community @types/html2pdf.js type definitions.
            pagebreak: { mode: ['css', 'legacy'], after: '.pdf-page-break' },
          })
          .from(target)
          .toPdf()
          .output('blob')) as Blob;

        document.body.removeChild(container);
        container = null;

        // 3. Delete ALL existing docs for this template FIRST so we never
        //    accumulate duplicates. Direct API calls bypass TanStack cache.
        setStatus('uploading');
        const existing = await getDocuments({
          entityType: DocumentEntityType.PROJECT,
          entityId: projectId,
          tag: template.documentTag,
          organizationId,
        });

        if (existing.length > 0) {
          await Promise.allSettled(
            existing.map(async (doc) => {
              const fileKey = extractFileKey(doc.fileUrl);
              if (fileKey) {
                try {
                  await deleteFile(fileKey);
                } catch {
                  /* already gone */
                }
              }
              await deleteDocument(doc.id, organizationId, { permanent: true });
            }),
          );
        }

        // 4. Upload new PDF to storage
        const fileName = `${template.id}-${projectId}-${Date.now()}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const uploadResult = await uploadFile({
          file,
          category: FileCategory.PROJECT,
          entityId: projectId,
          entityType: 'project',
          subCategory: template.id,
        });

        // 5. Create the single new DB record.
        setStatus('saving');
        await uploadMutateRef.current({
          entityType: DocumentEntityType.PROJECT,
          entityId: projectId,
          category: DocumentCategory.REPORT,
          tag: template.documentTag,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.publicUrl,
          fileSizeBytes: file.size,
          mimeType: 'application/pdf',
          metadata: { reportFields: fields as Record<string, string> },
        });

        setStatus('success');
        showToast.success('Report generated successfully');
      } catch (err) {
        if (container) {
          try {
            document.body.removeChild(container);
          } catch {
            // already removed
          }
        }
        const msg = err instanceof Error ? err.message : 'Failed to generate report';
        setErrorMsg(msg);
        setStatus('error');
        showToast.error(msg);
      } finally {
        pipelineRunningRef.current = false;
      }
    },
    [projectId, organizationId],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMsg(null);
  }, []);

  return {
    generate,
    status,
    errorMsg,
    isRunning: status === 'generating' || status === 'uploading' || status === 'saving',
    reset,
  };
}
