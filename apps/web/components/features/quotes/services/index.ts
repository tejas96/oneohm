export { generateAndDownloadPdf, generatePdfBlob } from './quote-pdf.service';
/*
  The document itself is not web's any more — it lives in `@tejas96/shared` so
  the phone prints the identical quote. Re-exported here so every existing
  import inside this feature keeps working unchanged; only the driver below
  (html2pdf.js, which is genuinely browser-only) is still local.
*/
export { generateQuoteHtml, getQuoteStyles } from '@tejas96/shared/reports';
