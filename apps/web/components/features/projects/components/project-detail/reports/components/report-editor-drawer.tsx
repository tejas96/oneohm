'use client';

import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { getReportSchema } from '@tejas96/shared/reports';
import { useCallback, useEffect, useState } from 'react';

import { ReportEditorFooter } from './report-editor-footer';
import { ReportPreviewPanel } from './report-preview-panel';
import { ReportSchemaForm } from './report-schema-form';
import { useReportEditor } from '../hooks/use-report-editor';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUITypography,
} from '@/components/ui';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

type ConfirmAction = 'close' | 'refresh';

interface ReportEditorDrawerProps {
  reportId: string | null;
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function ReportEditorDrawer({
  reportId,
  projectId,
  open,
  onClose,
}: ReportEditorDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tab, setTab] = useState(0);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const {
    fields,
    previewHtml,
    formVersion,
    loading,
    previewLoading,
    initError,
    isDirty,
    actionsDisabled,
    handleFieldsChange,
    refreshFromProject,
    retryInitialize,
    downloadPdf,
    saveToProject,
    isDownloading,
    isSaving,
  } = useReportEditor(projectId, reportId, open);

  const schema = reportId ? getReportSchema(reportId) : null;

  useEffect(() => {
    if (!open) setTab(0);
  }, [open]);

  useEffect(() => {
    setTab(0);
  }, [reportId]);

  const requestClose = useCallback(() => {
    if (isDownloading || isSaving) return;
    if (isDirty) {
      setConfirmAction('close');
      return;
    }
    onClose();
  }, [isDirty, isDownloading, isSaving, onClose]);

  const handleRefresh = useCallback(() => {
    if (isDirty) {
      setConfirmAction('refresh');
      return;
    }
    void refreshFromProject();
  }, [isDirty, refreshFromProject]);

  const handleConfirm = useCallback(() => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'close') {
      onClose();
    } else if (action === 'refresh') {
      void refreshFromProject();
    }
  }, [confirmAction, onClose, refreshFromProject]);

  if (!reportId || !schema) return null;

  const formPanel = loading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  ) : initError ? (
    <Alert severity="error" action={<Button onClick={() => void retryInitialize()}>Retry</Button>}>
      {initError}
    </Alert>
  ) : (
    <ReportSchemaForm
      reportId={reportId}
      fields={fields}
      formVersion={formVersion}
      onChange={handleFieldsChange}
      disabled={actionsDisabled || isDownloading || isSaving}
    />
  );

  const previewPanel = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
      <Alert severity="info" sx={{ py: 0.5, flexShrink: 0 }}>
        Preview and downloaded PDF use the same browser rendering. Minor spacing differences may
        still appear on very long multi-page tables.
      </Alert>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ReportPreviewPanel html={previewHtml} loading={previewLoading} />
      </Box>
    </Box>
  );

  const confirmCopy =
    confirmAction === 'refresh'
      ? {
          title: 'Refresh from project?',
          description:
            'This will replace all fields with project data. Unsaved changes will be lost.',
          confirmLabel: 'Refresh',
        }
      : {
          title: 'Close without saving?',
          description: 'You have unsaved changes. Close the editor anyway?',
          confirmLabel: 'Close',
        };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && requestClose()}>
        <SheetContent
          side="right"
          hideClose
          className="w-full max-w-full sm:max-w-[98vw] lg:max-w-[min(1440px,98vw)] p-0 flex flex-col h-full"
        >
          <SheetTitle className="sr-only">{schema.name}</SheetTitle>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
              p: 2,
              pr: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <MUITypography variant="sectionTitle">{schema.name}</MUITypography>
                {isDirty && (
                  <Chip label="Unsaved changes" size="small" color="warning" variant="outlined" />
                )}
                {previewLoading && <CircularProgress size={14} aria-label="Updating preview" />}
              </Box>
              <MUITypography variant="finePrint" color="text.secondary">
                {schema.description}
              </MUITypography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
              <IconButton
                onClick={handleRefresh}
                aria-label="Refresh from project"
                title="Refresh from project"
                size="small"
                disabled={loading || isDownloading || isSaving}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
              <IconButton onClick={requestClose} aria-label="Close report editor" size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {isMobile ? (
            <>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{ flexShrink: 0 }}
              >
                <Tab label="Details" />
                <Tab label="Preview" />
              </Tabs>
              <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Box
                  sx={{
                    display: tab === 0 ? 'block' : 'none',
                    height: '100%',
                    overflow: 'auto',
                    p: 2,
                  }}
                >
                  {formPanel}
                </Box>
                <Box
                  sx={{
                    display: tab === 1 ? 'flex' : 'none',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                    p: 2,
                  }}
                >
                  {previewPanel}
                </Box>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 360px) 1fr',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{ overflow: 'auto', p: 2, borderRight: '1px solid', borderColor: 'divider' }}
              >
                {formPanel}
              </Box>
              <Box
                sx={{
                  overflow: 'hidden',
                  p: 2,
                  bgcolor: 'grey.50',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {previewPanel}
              </Box>
            </Box>
          )}

          <ReportEditorFooter
            onDownload={() => void downloadPdf()}
            onSave={() => void saveToProject()}
            isDownloading={isDownloading}
            isSaving={isSaving}
            disabled={actionsDisabled}
          />
        </SheetContent>
      </Sheet>

      <MUIDialog
        open={confirmAction !== null}
        onOpenChange={(isOpen) => !isOpen && setConfirmAction(null)}
        size="sm"
      >
        <MUIDialogHeader>
          <MUIDialogTitle>{confirmCopy.title}</MUIDialogTitle>
          <MUIDialogDescription>{confirmCopy.description}</MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>{null}</MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outlined" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button variant="contained" color="warning" onClick={handleConfirm}>
            {confirmCopy.confirmLabel}
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </>
  );
}
