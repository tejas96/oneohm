'use client';

import { useCallback, useState } from 'react';

import { showToast } from '@/components/ui';
import { getDownloadUrl } from '@/lib/api/storage';
import { extractFileKey } from '@/lib/utils';

interface DownloadableDoc {
  fileUrl: string;
  fileName: string;
}

export function useReportDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async (doc: DownloadableDoc) => {
    setIsDownloading(true);
    try {
      const fileKey = extractFileKey(doc.fileUrl);
      const url = await getDownloadUrl(fileKey, doc.fileName);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      showToast.error('Failed to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { download, isDownloading };
}
