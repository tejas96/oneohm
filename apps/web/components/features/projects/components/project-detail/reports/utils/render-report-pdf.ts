import { ensureReportFontsReady } from './report-fonts';
import { REPORT_A4_WIDTH_PX } from '../constants/report-a4.constants';

/** Selectors honoured by html2pdf pagebreak.avoid — aligned with report template CSS. */
const PAGE_BREAK_AVOID_SELECTORS = [
  '.pdf-page',
  '.pdf-page-break',
  '.pdf-wrapper',
  '.header-table',
  '.text-block',
  '.sig-table',
  '.sig-box',
  '.guarantee-heading',
  '.guarantee-text',
  '.identity-block',
  'tbody tr',
  'table',
];

type Html2PdfOptions = {
  margin: number[];
  filename?: string;
  image: { type: string; quality: number };
  html2canvas: Record<string, unknown>;
  jsPDF: { unit: string; format: string; orientation: string };
  pagebreak: { mode: string[]; avoid: string[] };
};

function buildPdfOptions(filename?: string): Html2PdfOptions {
  return {
    // Margins come from body padding in report-print-base.css (same as iframe preview).
    margin: [0, 0, 0, 0],
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
      avoid: PAGE_BREAK_AVOID_SELECTORS,
    },
  };
}

async function waitForLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Mount report HTML in a hidden iframe — same rendering path as ReportPreviewPanel.
 * Captures document.body so report-print-base.css padding applies identically.
 */
async function mountReportHtml(html: string): Promise<{ cleanup: () => void; root: HTMLElement }> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${REPORT_A4_WIDTH_PX}px;height:12000px;border:none;background:white;visibility:hidden;`;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to create report render frame');
  }

  doc.open();
  doc.write(html);
  doc.close();

  // html2pdf.js's internal toContainer() step clones ONLY the element passed to
  // .from() (doc.body) via a manual node-by-node cloneNode(false) walk — it does
  // not carry along <style> tags that live in <head>, since those aren't
  // descendants of body. The clone is then appended into the MAIN document
  // for html2canvas to rasterize, so without this move every report style rule
  // (table borders, header background, zebra striping, fonts) silently vanishes
  // from the captured PDF even though the live iframe preview renders correctly.
  const headStyles = Array.from(doc.head.querySelectorAll('style'));
  for (const style of headStyles) {
    doc.body.insertBefore(style, doc.body.firstChild);
  }

  await ensureReportFontsReady(doc);
  await waitForLayout();

  return {
    cleanup: () => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    },
    root: doc.body,
  };
}

export async function renderReportPdfBlob(html: string): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default;
  const { cleanup, root } = await mountReportHtml(html);

  try {
    // html2pdf.js type definitions are incomplete — pagebreak is a real runtime option.
    const blob = (await html2pdf()
      .set(buildPdfOptions() as never)
      .from(root)
      .output('blob')) as Blob;

    if (!(blob instanceof Blob)) {
      throw new Error('Failed to generate report PDF');
    }

    return blob;
  } finally {
    cleanup();
  }
}

export async function downloadReportPdf(html: string, filename: string): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  const { cleanup, root } = await mountReportHtml(html);

  try {
    await html2pdf()
      .set(buildPdfOptions(filename) as never)
      .from(root)
      .save();
  } finally {
    cleanup();
  }
}
