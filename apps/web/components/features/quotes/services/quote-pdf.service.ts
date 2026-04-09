/**
 * Quote PDF Service (Web)
 *
 * Generates and downloads a quote PDF using html2pdf.js.
 * Uses dynamic import for SSR safety.
 */

import type { QuotePdfData } from '../types';
import { generateQuoteHtml } from './quote-pdf.template';

export async function generateAndDownloadPdf(data: QuotePdfData): Promise<void> {
  const html = generateQuoteHtml(data);

  const html2pdf = (await import('html2pdf.js')).default;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  const sanitizedCustomerName = data.customer?.name
    ? data.customer.name
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_')
    : '';
  const filename = sanitizedCustomerName
    ? `${sanitizedCustomerName}-Quote.pdf`
    : `Quote-Draft-${Date.now()}.pdf`;

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from((container.querySelector('.document') as HTMLElement) || container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}
