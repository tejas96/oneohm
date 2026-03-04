'use client';

import { useCallback } from 'react';

import { showToast } from '@/components/ui/sonner';
import { getDownloadUrl } from '@/lib/api/storage';

export function useDocumentDownload(): {
  download: (filePath: string, fileName?: string) => void;
} {
  const download = useCallback((filePath: string, fileName?: string) => {
    void (async () => {
      try {
        const presignedUrl = await getDownloadUrl(filePath, fileName);

        const link = document.createElement('a');
        link.href = presignedUrl;
        if (fileName) link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        showToast.error('Failed to download file');
      }
    })();
  }, []);

  return { download };
}
