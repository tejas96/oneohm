import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

/**
 * Stream a server-generated file (CSV, etc.) and trigger a browser
 * download. Built for the Part 6 `/inventory/export/<resource>.csv`
 * endpoints but resource-agnostic.
 *
 * Why use the existing `apiClient` instead of raw fetch:
 *   * Authorization header + 401-with-refresh interceptor "just work".
 *   * Same baseURL + timeout the rest of the FDAL uses.
 *   * Axios surfaces typed AxiosError with `response.status` so we can
 *     map 413 -> a typed `PayloadTooLargeError` for the caller's UI.
 *
 * Filename precedence: explicit `filename` > server-supplied
 * `Content-Disposition; filename="..."` > path tail. The exporter
 * always sends a Content-Disposition with an ISO date suffix so the
 * server-supplied path is the right default.
 *
 * Browser-only: throws on SSR. Callers should only invoke this from
 * event handlers; in React server components there's nothing to
 * "click".
 */

export class PayloadTooLargeError extends Error {
  readonly status = 413;
  constructor(message = 'Export exceeds the row limit. Apply more filters and try again.') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

interface DownloadFromUrlOptions {
  /** API path relative to the apiClient baseURL, e.g. `inventory/export/purchase-orders.csv` */
  path: string;
  /** Organization id for the X-Organization-Id header. Pass from useOrgContext(). */
  organizationId: string;
  /** Optional query params; arrays are repeated, undefined values dropped. */
  params?: Record<string, string | number | boolean | undefined>;
  /**
   * Optional override. If absent, the helper reads the server's
   * Content-Disposition header, falling back to the path tail.
   */
  filename?: string;
  /** Optional extra request headers (e.g. Accept). */
  headers?: Record<string, string>;
}

const FILENAME_RE = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

function parseFilenameFromContentDisposition(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = FILENAME_RE.exec(header);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function fallbackFilenameFromPath(path: string): string {
  const tail = path.split('/').pop() ?? 'download';
  return tail.split('?')[0] || 'download';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Read a Blob as text without leaning on `await blob.text()` — that
 * method exists in modern browsers but the type narrowing is cleaner
 * via FileReader, and FileReader is supported everywhere we care about.
 */
async function blobToText(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsText(blob);
  });
}

/**
 * Try to extract a useful error message from an axios error whose
 * response was returned as a Blob (because we asked for `responseType:
 * 'blob'`). Falls back to the axios `message`.
 */
async function extractBlobErrorMessage(err: AxiosError): Promise<string> {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await blobToText(data);
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) return parsed.message;
      } catch {
        if (text) return text;
      }
    } catch {
      // fall through
    }
  }
  return err.message || 'Download failed';
}

export async function downloadFromUrl(options: DownloadFromUrlOptions): Promise<void> {
  if (!isBrowser()) {
    throw new Error('downloadFromUrl can only be called in the browser');
  }
  if (!options.organizationId) {
    throw new Error('organizationId is required to download an organization-scoped resource');
  }

  let response;
  try {
    response = await apiClient.get<Blob>(options.path, {
      params: options.params,
      headers: {
        'X-Organization-Id': options.organizationId,
        ...(options.headers ?? {}),
      },
      responseType: 'blob',
    });
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response?.status === 413) {
      const msg = await extractBlobErrorMessage(axiosErr);
      throw new PayloadTooLargeError(msg);
    }
    const msg = axiosErr.isAxiosError ? await extractBlobErrorMessage(axiosErr) : String(err);
    throw new Error(msg);
  }

  const blob = response.data;
  const headers = response.headers as Record<string, string | undefined>;
  const contentDispHeader = headers['content-disposition'] ?? headers['Content-Disposition'];

  const filename =
    options.filename ??
    parseFilenameFromContentDisposition(contentDispHeader) ??
    fallbackFilenameFromPath(options.path);

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Defer revoke so the browser has a tick to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
