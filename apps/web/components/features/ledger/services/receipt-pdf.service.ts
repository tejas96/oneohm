import { generateReceiptHtml, type ReceiptPdfData } from './receipt-pdf.template';

/**
 * Renders the payment receipt with html2pdf.js, mirroring the quote PDF service.
 *
 * Client-side because it has to be: there is no server-side PDF library in this
 * repo, and the receipt must print `entry_no`, which the ledger mints inside the
 * write transaction. The bytes therefore cannot exist until after the payment
 * has committed.
 */

const PAGE_W_MM = 210;
const MARGIN_MM = 12;
// Render at the printable content width so html2pdf scales 1:1 and nothing is
// clipped. 96 dpi → 3.7795 px/mm.
const CONTENT_PX = Math.round((PAGE_W_MM - 2 * MARGIN_MM) * 3.7795);

function buildFilename(data: ReceiptPdfData): string {
  const safe = data.entry.entryNo.replace(/[^a-zA-Z0-9-]/g, '_');
  return `Receipt-${safe}.pdf`;
}

/**
 * The slice of jsPDF this file uses.
 *
 * html2pdf.js types `.get('pdf')` as `unknown` because it hands back the
 * underlying jsPDF instance, which it does not depend on. Declaring only the two
 * methods used keeps the rule against `any` without pulling jsPDF's types in.
 */
interface JsPdfOutput {
  output(type: 'blob'): Blob;
  save(filename: string): void;
}

async function render(data: ReceiptPdfData): Promise<{ pdf: JsPdfOutput; filename: string }> {
  const html = generateReceiptHtml(data);

  // Dynamic import: html2pdf.js touches `window` at module scope and would
  // break SSR if imported statically.
  const html2pdf = (await import('html2pdf.js')).default;

  const container = document.createElement('div');
  container.style.cssText = `position:absolute;left:-9999px;top:0;width:${CONTENT_PX}px;background:white;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const target = (container.querySelector('.doc') as HTMLElement) ?? container;
    target.style.width = `${CONTENT_PX}px`;
    target.style.maxWidth = `${CONTENT_PX}px`;

    // Literals narrowed on purpose: html2pdf.js ships stricter types than the
    // local ambient declaration, and a widened `string` fails to assign.
    const options = {
      margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM] as [number, number, number, number],
      filename: buildFilename(data),
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css'] },
    };

    const pdf = (await html2pdf().set(options).from(target).toPdf().get('pdf')) as JsPdfOutput;
    return { pdf, filename: buildFilename(data) };
  } finally {
    // Always remove the offscreen node, including when rendering throws —
    // otherwise a failed generation leaves a detached 700px div in the DOM and
    // the next attempt renders into a page that already contains one.
    container.remove();
  }
}

/** For upload. */
export async function generateReceiptPdfBlob(
  data: ReceiptPdfData,
): Promise<{ blob: Blob; filename: string }> {
  const { pdf, filename } = await render(data);
  return { blob: pdf.output('blob'), filename };
}

/** For a local save, and the manual fallback when the upload failed. */
export async function downloadReceiptPdf(data: ReceiptPdfData): Promise<void> {
  const { pdf, filename } = await render(data);
  pdf.save(filename);
}
