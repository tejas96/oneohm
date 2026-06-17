'use client';

import DownloadIcon from '@mui/icons-material/Download';
import { Alert, Box, Button, CircularProgress, Divider } from '@mui/material';
import { DocumentEntityType } from '@tejas96/shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ReportPreviewPanel } from './report-preview-panel';
import { useGenerateReport } from '../hooks/use-generate-report';
import { useReportDownload } from '../hooks/use-report-download';
import { type ReportTemplate, GENERATE_STATUS_LABELS } from '../types/report.types';

import { useDocuments } from '@/components/features/documents/hooks';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUITypography,
} from '@/components/ui';
import type { DocumentRecord } from '@/lib/api/documents';

function getInitialFields(
  template: ReportTemplate,
  existingDoc: DocumentRecord | null,
): Record<string, string> {
  const defaults = { ...template.defaultFields } as Record<string, string>;
  if (!existingDoc?.metadata?.reportFields) return defaults;
  const saved = existingDoc.metadata.reportFields as Record<string, unknown>;
  // Merge: saved values win; new template fields fall back to defaults.
  // Cast needed because Object.fromEntries infers string | undefined from the
  // index signature even though every key is guaranteed to be present.
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [
      key,
      typeof saved[key] === 'string' ? saved[key] : (defaults[key] ?? ''),
    ]),
  ) as Record<string, string>;
}

interface ReportEditorModalProps {
  open: boolean;
  onClose: () => void;
  template: ReportTemplate;
  projectId: string;
}

export function ReportEditorModal({ open, onClose, template, projectId }: ReportEditorModalProps) {
  // Fetch documents first so existingDoc is available for the useState initializer.
  // In practice the cache is already warm (ReportTemplateCard uses the same query key),
  // so existingDoc will be non-null on the very first render.
  const { data: allDocs } = useDocuments(DocumentEntityType.PROJECT, projectId);
  const existingDoc = allDocs?.find((d) => d.tag === template.documentTag) ?? null;

  // hasHydratedRef guards the cold-cache hydration useEffect below.
  // It starts true when allDocs was already loaded at mount (warm cache — ~99% of opens),
  // meaning the useState initializer already used the correct saved fields.
  // It stays false only when allDocs was undefined at mount (cold cache / first page load),
  // allowing the useEffect to hydrate once when the query resolves.
  // This prevents post-generation cache invalidations from wiping the user's form.
  const hasHydratedRef = useRef(allDocs !== undefined);

  const [fields, setFields] = useState<Record<string, string>>(() =>
    getInitialFields(template, existingDoc),
  );
  const [previewHtml, setPreviewHtml] = useState<string>(() => template.generateHtml(fields));
  const [formKey, setFormKey] = useState(0);

  const { generate, status, errorMsg, isRunning, reset } = useGenerateReport(projectId);
  const { download, isDownloading } = useReportDownload();

  // One-shot hydration: restores saved fields when cache was empty on first render
  // (cold-load scenario). hasHydratedRef starts true when existingDoc was already
  // available at mount (warm cache), preventing an unnecessary remount of the form.
  useEffect(() => {
    if (hasHydratedRef.current || !existingDoc) return;
    hasHydratedRef.current = true;
    const restored = getInitialFields(template, existingDoc);
    setFields(restored);
    setPreviewHtml(template.generateHtml(restored));
    setFormKey((k) => k + 1);
  }, [existingDoc, template]);

  const handleFieldsChange = useCallback(
    (updated: Record<string, string>) => {
      setFields(updated);
      setPreviewHtml(template.generateHtml(updated));
    },
    [template],
  );

  const handleGenerate = useCallback(async () => {
    reset();
    await generate(template, fields);
  }, [generate, template, fields, reset]);

  const handleClose = useCallback(() => {
    if (isRunning) return;
    reset();
    onClose();
  }, [isRunning, reset, onClose]);

  const FormComponent = template.FormComponent;

  return (
    <MUIDialog
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      size="full"
      disableEscapeKeyDown={isRunning}
    >
      {/* ── Header ── */}
      <MUIDialogHeader>
        <MUIDialogTitle>{template.name}</MUIDialogTitle>
        <MUIDialogDescription>{template.description}</MUIDialogDescription>
      </MUIDialogHeader>

      {/* ── Body: split-view ── */}
      <MUIDialogBody
        sx={{
          p: 0,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '400px 1fr' },
        }}
      >
        {/* Left: form panel */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            borderRight: { md: '1px solid' },
            borderColor: { md: 'divider' },
            overflow: 'auto',
          }}
        >
          <Box sx={{ flex: 1, p: 3 }}>
            <FormComponent
              key={formKey}
              fields={fields}
              onChange={handleFieldsChange}
              disabled={isRunning}
            />
          </Box>

          {/* Inline alerts above footer */}
          {(status === 'success' || (status === 'error' && errorMsg)) && (
            <>
              <Divider />
              <Box sx={{ px: 3, pt: 2 }}>
                {status === 'success' && (
                  <Alert
                    severity="success"
                    action={
                      existingDoc ? (
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => existingDoc && void download(existingDoc)}
                          disabled={isDownloading}
                        >
                          Download
                        </Button>
                      ) : undefined
                    }
                  >
                    Report generated and saved successfully.
                  </Alert>
                )}
                {status === 'error' && errorMsg && (
                  <Alert severity="error" onClose={reset}>
                    {errorMsg}
                  </Alert>
                )}
              </Box>
            </>
          )}
        </Box>

        {/* Right: preview panel */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
            p: 2,
            bgcolor: 'grey.50',
          }}
        >
          <ReportPreviewPanel html={previewHtml} />
        </Box>
      </MUIDialogBody>

      {/* ── Footer: generate CTA ── */}
      <MUIDialogFooter>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {isRunning && (
            <MUITypography variant="finePrint">{GENERATE_STATUS_LABELS[status]}</MUITypography>
          )}
        </Box>
        <Button variant="outlined" size="medium" onClick={handleClose} disabled={isRunning}>
          Close
        </Button>
        <Button
          variant="contained"
          size="medium"
          disabled={isRunning}
          onClick={() => void handleGenerate()}
          startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isRunning ? 'Processing…' : existingDoc ? 'Regenerate Report' : 'Generate Report'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
