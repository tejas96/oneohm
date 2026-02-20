'use client';

import { useCallback, useState } from 'react';


import { generateAndDownloadPdf } from '../services';
import type { QuotePdfData } from '../types';

import { getErrorMessage } from '@/lib/utils/error';

export function useQuotePdf() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = useCallback(async (data: QuotePdfData) => {
    try {
      setIsGenerating(true);
      setError(null);
      await generateAndDownloadPdf(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generatePdf, isGenerating, error };
}
