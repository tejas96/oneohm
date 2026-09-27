'use client';

import type { AxiosError } from 'axios';
import { useCallback, useState } from 'react';

import { showToast } from '@/components/ui';
import { printDocuments } from '@/lib/api/documents';

/**
 * Safari, and every iPhone/iPad browser (all of them run Safari's engine).
 * Not Chrome, Edge or Firefox on a computer, whose user agents also say "Safari".
 */
function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || /^((?!chrome|chromium|edg|android).)*safari/i.test(ua);
}

/** A blob error body is JSON text: read the server's message out of it. */
async function errorMessage(err: unknown): Promise<string> {
  const data = (err as AxiosError<Blob>).response?.data;
  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text()) as { message?: string | string[] };
      const message = Array.isArray(body.message) ? body.message.join('; ') : body.message;
      if (message) return message;
    } catch {
      /* not JSON */
    }
  }
  return 'Could not prepare the documents for printing. Try again.';
}

/**
 * Prints documents as one job: the server joins them into one PDF in the
 * order given, and a hidden frame opens the browser's print window for it,
 * so the printer gets every page one after another from a single Print.
 * Safari gets the PDF in a new tab instead, and Print is pressed there.
 */
export function usePrintDocuments(): {
  print: (ids: string[]) => Promise<boolean>;
  printing: boolean;
} {
  const [printing, setPrinting] = useState(false);

  const print = useCallback(async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false;
    // Safari prints a PDF in a frame as a blank page, with no error. There the
    // PDF opens in a tab instead; the tab is opened now, while this is still
    // the user's click, or the popup blocker stops it after the wait.
    const tab = isSafari() ? window.open('', '_blank') : null;
    setPrinting(true);
    try {
      const blob = await printDocuments(ids);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));

      if (tab) {
        tab.location.href = url;
        window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
        return true;
      }

      const frame = document.createElement('iframe');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      frame.src = url;
      frame.onload = () => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      };
      document.body.appendChild(frame);
      // The print window reads the frame while it is open; clean up well after.
      window.setTimeout(
        () => {
          frame.remove();
          URL.revokeObjectURL(url);
        },
        10 * 60 * 1000,
      );
      return true;
    } catch (err) {
      tab?.close();
      showToast.error(await errorMessage(err));
      return false;
    } finally {
      setPrinting(false);
    }
  }, []);

  return { print, printing };
}
