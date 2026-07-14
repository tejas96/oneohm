/**
 * Quote PDF Service (Web)
 *
 * Generates and downloads a quote PDF using html2pdf.js.
 * Uses dynamic import for SSR safety.
 */

import type { QuotePdfData } from '../types';
import { generateQuoteHtml } from './quote-pdf.template';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 10;
const CONTENT_PX = Math.round((PAGE_W_MM - 2 * MARGIN_MM) * 3.7795);

function buildQuoteFilename(data: QuotePdfData): string {
  const sanitizedCustomerName = data.customer?.name
    ? data.customer.name
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_')
    : '';
  return sanitizedCustomerName
    ? `${sanitizedCustomerName}-Quote.pdf`
    : `Quote-Draft-${Date.now()}.pdf`;
}

type JsPdfInstance = {
  setPage(page: number): void;
  setFillColor(r: number, g: number, b: number): void;
  rect(x: number, y: number, w: number, h: number, style: string): void;
  setTextColor(r: number, g: number, b: number): void;
  setFontSize(size: number): void;
  setFont(family: string, style: string): void;
  text(text: string, x: number, y: number): void;
  getTextWidth(text: string): number;
  save(filename: string): void;
  output(type: 'blob'): Blob;
  internal: { getNumberOfPages(): number };
};

function stampContinuationHeaders(
  pdf: JsPdfInstance,
  companyName: string,
  quoteNumber: string,
): void {
  const totalPages = pdf.internal.getNumberOfPages();
  if (totalPages <= 1) return;

  const headerH = 8;
  const fontSize = 7;

  for (let p = 2; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(22, 163, 74);
    pdf.rect(0, 0, PAGE_W_MM, headerH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'bold');
    pdf.text(companyName, MARGIN_MM, headerH - 2.5);
    pdf.setFont('helvetica', 'normal');
    const centreText = `Solar Quotation · ${quoteNumber}`;
    const centreX = PAGE_W_MM / 2 - pdf.getTextWidth(centreText) / 2;
    pdf.text(centreText, centreX, headerH - 2.5);
    const pageText = `Page ${p} of ${totalPages}`;
    const rightX = PAGE_W_MM - MARGIN_MM - pdf.getTextWidth(pageText);
    pdf.text(pageText, rightX, headerH - 2.5);
  }

  pdf.setPage(1);
  pdf.setTextColor(156, 163, 175);
  pdf.setFontSize(fontSize - 1);
  pdf.setFont('helvetica', 'normal');
  const p1Text = `Page 1 of ${totalPages}`;
  pdf.text(p1Text, PAGE_W_MM - MARGIN_MM - pdf.getTextWidth(p1Text), PAGE_H_MM - 4);
}

async function renderQuotePdf(
  data: QuotePdfData,
): Promise<{ pdf: JsPdfInstance; filename: string }> {
  const html = generateQuoteHtml(data);
  const html2pdf = (await import('html2pdf.js')).default;

  const container = document.createElement('div');
  container.style.cssText = `position:absolute;left:-9999px;top:0;width:${CONTENT_PX}px;background:white;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  const documentEl = (container.querySelector('.document') as HTMLElement) ?? container;
  documentEl.style.maxWidth = `${CONTENT_PX}px`;
  documentEl.style.width = `${CONTENT_PX}px`;

  const filename = buildQuoteFilename(data);
  const companyName: string = data.orgConfig?.companyName ?? 'OneOhm';
  const quoteNumber: string = data.quoteNumber ?? 'DRAFT';

  try {
    const pdfOptions: any = {
      margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
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

    const pdf = (await html2pdf()
      .set(pdfOptions)
      .from(documentEl)
      .toPdf()
      .get('pdf')) as JsPdfInstance;
    stampContinuationHeaders(pdf, companyName, quoteNumber);
    return { pdf, filename };
  } finally {
    document.body.removeChild(container);
  }
}

export async function generatePdfBlob(
  data: QuotePdfData,
): Promise<{ blob: Blob; filename: string }> {
  const { pdf, filename } = await renderQuotePdf(data);
  return { blob: pdf.output('blob'), filename };
}

export async function generateAndDownloadPdf(data: QuotePdfData): Promise<void> {
  const { pdf, filename } = await renderQuotePdf(data);
  pdf.save(filename);
}
