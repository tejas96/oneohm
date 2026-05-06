/**
 * Expense Voucher PDF Service
 *
 * Generates and downloads a single-page expense voucher PDF using
 * html2pdf.js. Handles itemized line tables when productLinks are
 * present; otherwise renders a compact summary.
 */

import {
  generateExpenseVoucherHtml,
  type ExpenseVoucherPdfData,
} from './expense-pdf.template';

const PAGE_W_MM = 210;
const MARGIN_MM = 12;
const CONTENT_PX = Math.round((PAGE_W_MM - 2 * MARGIN_MM) * 3.7795);

export async function downloadExpenseVoucherPdf(data: ExpenseVoucherPdfData): Promise<void> {
  const html = generateExpenseVoucherHtml(data);

  const html2pdf = (await import('html2pdf.js')).default;

  const container = document.createElement('div');
  container.style.cssText = `position:absolute;left:-9999px;top:0;width:${CONTENT_PX}px;background:white;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  const documentEl = (container.querySelector('.doc') as HTMLElement) ?? container;
  documentEl.style.maxWidth = `${CONTENT_PX}px`;
  documentEl.style.width = `${CONTENT_PX}px`;

  const safeNumber = data.expense.expenseNumber.replace(/[^a-zA-Z0-9-]/g, '_');
  const filename = `Expense-${safeNumber}.pdf`;

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
      pagebreak: {
        mode: ['css', 'avoid-all'],
        avoid: ['.line-table', '.amount-card', '.notes', '.footer'],
      },
    };

    await html2pdf().set(pdfOptions).from(documentEl).save();
  } finally {
    document.body.removeChild(container);
  }
}
