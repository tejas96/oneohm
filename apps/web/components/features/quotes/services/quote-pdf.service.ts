/**
 * Quote PDF Service (Web)
 *
 * Generates and downloads a quote PDF using html2pdf.js.
 * Uses dynamic import for SSR safety.
 *
 * Page-break strategy:
 *  - html2pdf pagebreak mode 'css' honours break-inside/break-after set in the
 *    template CSS on every .pdf-block element.
 *  - A compact brand strip is stamped onto pages 2+ via jsPDF post-processing
 *    so the reader always knows which document they're on.
 */

import type { QuotePdfData } from '../types';
import { generateQuoteHtml } from './quote-pdf.template';

// A4 page dimensions in mm
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 10; // uniform margin
// Content width = A4 width - 2 × margin = 190mm.
// At 96 dpi (3.7795 px/mm) that's ~718px. We render the HTML at this
// pixel width so html2pdf scales 1:1 with the printable area and
// nothing gets clipped on the right.
const CONTENT_PX = Math.round((PAGE_W_MM - 2 * MARGIN_MM) * 3.7795);

export async function generateAndDownloadPdf(data: QuotePdfData): Promise<void> {
  const html = generateQuoteHtml(data);

  const html2pdf = (await import('html2pdf.js')).default;

  // Mount off-screen at the printable content width so nothing gets
  // clipped when html2pdf adds page margins.
  const container = document.createElement('div');
  container.style.cssText = `position:absolute;left:-9999px;top:0;width:${CONTENT_PX}px;background:white;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  const documentEl = (container.querySelector('.document') as HTMLElement) ?? container;
  documentEl.style.maxWidth = `${CONTENT_PX}px`;
  documentEl.style.width = `${CONTENT_PX}px`;

  const sanitizedCustomerName = data.customer?.name
    ? data.customer.name
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_')
    : '';
  const filename = sanitizedCustomerName
    ? `${sanitizedCustomerName}-Quote.pdf`
    : `Quote-Draft-${Date.now()}.pdf`;

  const companyName: string = data.orgConfig?.companyName ?? 'OneOhm';
  const quoteNumber: string = data.quoteNumber ?? 'DRAFT';

  try {
    // html2pdf.js type definitions are incomplete — 'pagebreak' is a real
    // runtime option not reflected in the bundled .d.ts file.

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
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      // 'css' mode reads break-inside/break-after from stylesheet.
      // 'avoid-all' broadly prevents splitting any block element.
      pagebreak: {
        mode: ['css', 'avoid-all'],
        avoid: [
          '.pdf-block',
          '.parties',
          '.system-overview',
          '.subsidy-box',
          '.payment-milestone',
          '.bank-info',
          '.signatures',
          '.terms-block',
          '.bom-category-group',
        ],
      },
    };

    const worker = html2pdf().set(pdfOptions);

    // Render to jsPDF instance so we can post-process
    const pdf = await worker.from(documentEl).toPdf().get('pdf');

    const totalPages: number = (
      pdf as { internal: { getNumberOfPages(): number } }
    ).internal.getNumberOfPages();

    // Stamp a thin header bar on pages 2+
    if (totalPages > 1) {
      const headerH = 8; // mm
      const fontSize = 7;

      for (let p = 2; p <= totalPages; p++) {
        pdf.setPage(p);

        // Background strip
        pdf.setFillColor(22, 163, 74); // --primary green
        pdf.rect(0, 0, PAGE_W_MM, headerH, 'F');

        // Company name (left)
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.text(companyName, MARGIN_MM, headerH - 2.5);

        // Quote number (centre)
        pdf.setFont('helvetica', 'normal');
        const centreText = `Solar Quotation · ${quoteNumber}`;
        const centreX = PAGE_W_MM / 2 - pdf.getTextWidth(centreText) / 2;
        pdf.text(centreText, centreX, headerH - 2.5);

        // Page number (right)
        const pageText = `Page ${p} of ${totalPages}`;
        const rightX = PAGE_W_MM - MARGIN_MM - pdf.getTextWidth(pageText);
        pdf.text(pageText, rightX, headerH - 2.5);
      }

      // Add page number to page 1 as well (bottom right, subtle)
      if (totalPages > 1) {
        pdf.setPage(1);
        pdf.setTextColor(156, 163, 175); // gray-400
        pdf.setFontSize(fontSize - 1);
        pdf.setFont('helvetica', 'normal');
        const p1Text = `Page 1 of ${totalPages}`;
        pdf.text(p1Text, PAGE_W_MM - MARGIN_MM - pdf.getTextWidth(p1Text), PAGE_H_MM - 4);
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
