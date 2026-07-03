const REPORT_FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Sans:ital,wght@0,400;0,600;0,700&display=swap';

const FONT_SPECS = [
  '400 9pt "Open Sans"',
  '600 9pt "Open Sans"',
  '700 9pt "Open Sans"',
  '400 9pt "Noto Sans"',
  '600 9pt "Noto Sans"',
] as const;

function injectStylesheet(doc: Document): void {
  if (doc.querySelector(`link[href="${REPORT_FONT_STYLESHEET}"]`)) return;

  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = REPORT_FONT_STYLESHEET;
  doc.head.appendChild(link);
}

/** Inject Open Sans / Noto Sans and wait until they are ready for capture. */
export async function ensureReportFontsReady(doc: Document = document): Promise<void> {
  injectStylesheet(doc);

  if (!doc.fonts) return;

  await doc.fonts.ready;
  await Promise.all(FONT_SPECS.map((spec) => doc.fonts.load(spec).catch(() => undefined)));
}
