'use client';

import { useCallback } from 'react';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';


export function useDocumentDownload(): {
  download: (filePath: string) => void;
} {
  const download = useCallback((filePath: string) => {
    void (async () => {
      try {
        const { data } = await apiClient.get<{ url: string }>(
          `/storage/download-url/${encodeURIComponent(filePath)}`,
        );
        window.open(data.url, '_blank');
      } catch {
        showToast.error('Failed to download file');
      }
    })();
  }, []);

  return { download };
}
