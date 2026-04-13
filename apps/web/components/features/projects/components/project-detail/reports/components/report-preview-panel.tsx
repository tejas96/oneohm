'use client';

import { Box } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MUITypography } from '@/components/ui';

interface ReportPreviewPanelProps {
  html: string;
}

const DEBOUNCE_MS = 300;
const MIN_IFRAME_HEIGHT = 1123;

export function ReportPreviewPanel({ html }: ReportPreviewPanelProps) {
  const [debouncedHtml, setDebouncedHtml] = useState(html);
  const [iframeHeight, setIframeHeight] = useState(MIN_IFRAME_HEIGHT);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHtml(html), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [html]);

  const handleLoad = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.body) {
        const h = doc.body.scrollHeight;
        setIframeHeight(Math.max(h, MIN_IFRAME_HEIGHT));
      }
    } catch {
      // sandbox may block access — keep current height
    }
  }, []);

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
      <MUITypography variant="metaLabel">Preview</MUITypography>
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: 'grey.100',
          borderRadius: 1,
          p: 1,
          minHeight: 0,
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={debouncedHtml}
          sandbox="allow-same-origin"
          onLoad={handleLoad}
          style={{
            width: '100%',
            height: `${iframeHeight}px`,
            border: 'none',
            background: 'white',
            display: 'block',
          }}
          title="Report Preview"
        />
      </Box>
    </Box>
  );
}
