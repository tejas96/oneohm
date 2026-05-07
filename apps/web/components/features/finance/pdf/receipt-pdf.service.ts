/**
 * Receipt PDF Service
 *
 * Generates and downloads a single-page receipt PDF using html2pdf.js.
 * Mirrors the off-screen render + jsPDF post-processing pattern used
 * by the quote PDF service.
 *
 * Page-break: receipts are designed to fit on one A4 page so we don't
 * stamp page-2+ headers like the quote PDF does. If a receipt grows
 * past one page (very long notes), html2pdf will paginate naturally.
 */

import { generateReceiptHtml, type ReceiptPdfData } from './receipt-pdf.template';

const PAGE_W_MM = 210;
const MARGIN_MM = 12;
// Render at the printable content width so html2pdf scales 1:1 and
// nothing gets clipped. 96 dpi → 3.7795 px/mm.
const CONTENT_PX = Math.round((PAGE_W_MM - 2 * MARGIN_MM) * 3.7795);

export async function downloadReceiptPdf(data: ReceiptPdfData): Promise<void> {
  const html = generateReceiptHtml(data);

  const html2pdf = (await import('html2pdf.js')).default;

  const container = document.createElement('div');
  container.style.cssText = `position:absolute;left:-9999px;top:0;width:${CONTENT_PX}px;background:white;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  const documentEl = (container.querySelector('.doc') as HTMLElement) ?? container;
  documentEl.style.maxWidth = `${CONTENT_PX}px`;
  documentEl.style.width = `${CONTENT_PX}px`;

  const safeNumber = data.receipt.paymentNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  const filename = `Receipt-${safeNumber}.pdf`;

  try {
    // html2pdf.js .d.ts is incomplete — `pagebreak` is a real runtime option.

    const pdfOptions: any = {
      margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        windowWidth: CONTENT_PX,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'avoid-all'] },
    };

    await html2pdf().set(pdfOptions).from(documentEl).save();
  } finally {
    document.body.removeChild(container);
  }
}
