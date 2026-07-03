'use client';

import { Box } from '@mui/material';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { REPORT_A4_HEIGHT_PX, REPORT_A4_WIDTH_PX } from '../constants/report-a4.constants';
import { ensureReportFontsReady } from '../utils/report-fonts';

import { MUITypography } from '@/components/ui';

interface ReportPreviewPanelProps {
  html: string;
  loading?: boolean;
}

function writeIframeHtml(iframe: HTMLIFrameElement, html: string): Document | null {
  const doc = iframe.contentDocument;
  if (!doc) return null;
  doc.open();
  doc.write(html);
  doc.close();
  return doc;
}

export function ReportPreviewPanel({ html, loading = false }: ReportPreviewPanelProps) {
  const [contentHeight, setContentHeight] = useState(REPORT_A4_HEIGHT_PX);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastHtmlRef = useRef('');

  const measureHeight = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.body) {
        const h = Math.max(doc.body.scrollHeight, REPORT_A4_HEIGHT_PX);
        setContentHeight(h);
      }
    } catch {
      // sandbox may block access
    }
  }, []);

  const recomputeScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const available = container.clientWidth - 16;
    if (available <= 0) return;
    const next = Math.min(available / REPORT_A4_WIDTH_PX, 1);
    setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
  }, []);

  // Inject HTML into a stable iframe — avoids srcDoc attribute churn and full remounts.
  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html || html === lastHtmlRef.current) return;
    lastHtmlRef.current = html;

    const doc = writeIframeHtml(iframe, html);
    if (doc) {
      void ensureReportFontsReady(doc).then(() => measureHeight());
    } else {
      measureHeight();
    }
  }, [html, measureHeight]);

  useLayoutEffect(() => {
    recomputeScale();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => recomputeScale());
    observer.observe(container);
    return () => observer.disconnect();
  }, [recomputeScale]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minHeight: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MUITypography variant="metaLabel">Preview</MUITypography>
        {loading && (
          <MUITypography variant="finePrint" color="text.secondary" aria-live="polite">
            Updating…
          </MUITypography>
        )}
      </Box>
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarGutter: 'stable',
          bgcolor: 'grey.100',
          borderRadius: 1,
          p: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            width: REPORT_A4_WIDTH_PX * scale,
            height: contentHeight * scale,
            mx: 'auto',
          }}
        >
          <iframe
            ref={iframeRef}
            sandbox="allow-same-origin"
            style={{
              width: `${REPORT_A4_WIDTH_PX}px`,
              height: `${contentHeight}px`,
              border: 'none',
              background: 'white',
              display: 'block',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            title="Report Preview"
          />
        </Box>
      </Box>
    </Box>
  );
}

export { REPORT_A4_WIDTH_PX, REPORT_A4_HEIGHT_PX } from '../constants/report-a4.constants';
