/**
 * Shared CSS for the finance document PDFs (receipt + expense
 * voucher). Kept compact and inline-friendly so html2pdf renders
 * predictably across browsers. Avoid web fonts — system fonts only.
 */
export function getFinanceDocStyles(): string {
  return `
    * { box-sizing: border-box; }
    body { margin: 0; }
    .doc {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #111827;
      font-size: 11px;
      line-height: 1.45;
      padding: 0;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #16a34a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .doc-header .company-name {
      font-size: 18px;
      font-weight: 700;
      color: #16a34a;
      margin: 0;
    }
    .doc-header .company-meta {
      font-size: 10px;
      color: #6b7280;
      margin-top: 2px;
      white-space: pre-line;
    }
    .doc-header .doc-title {
      text-align: right;
    }
    .doc-header .doc-title .label {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #111827;
      margin: 0;
    }
    .doc-header .doc-title .number {
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      font-size: 12px;
      color: #374151;
      margin-top: 4px;
    }
    .doc-header .doc-title .date {
      font-size: 10px;
      color: #6b7280;
      margin-top: 2px;
    }
    .parties {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .parties .party {
      flex: 1;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f9fafb;
    }
    .parties .party h4 {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #6b7280;
      margin: 0 0 4px;
    }
    .parties .party .name {
      font-size: 12px;
      font-weight: 600;
      color: #111827;
    }
    .parties .party .meta {
      font-size: 10px;
      color: #4b5563;
      margin-top: 2px;
      white-space: pre-line;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .summary-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    .summary-table td.label {
      width: 35%;
      font-weight: 600;
      color: #6b7280;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .summary-table td.value {
      color: #111827;
    }
    .amount-card {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 16px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-card .label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #047857;
    }
    .amount-card .value {
      font-size: 22px;
      font-weight: 700;
      color: #047857;
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    .amount-card.warning {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .amount-card.warning .label { color: #b45309; }
    .amount-card.warning .value { color: #b45309; }
    .line-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 16px;
      font-size: 10px;
    }
    .line-table th {
      background: #f3f4f6;
      color: #374151;
      padding: 6px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 1px solid #d1d5db;
    }
    .line-table th.right, .line-table td.right { text-align: right; }
    .line-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #f3f4f6;
      color: #111827;
    }
    .line-table tfoot td {
      font-weight: 700;
      border-top: 2px solid #d1d5db;
      border-bottom: none;
      background: #f9fafb;
    }
    .notes {
      font-size: 10px;
      color: #4b5563;
      border: 1px dashed #d1d5db;
      border-radius: 4px;
      padding: 8px 10px;
      margin: 12px 0;
      white-space: pre-line;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer .signature {
      font-size: 10px;
      color: #4b5563;
    }
    .footer .signature .line {
      width: 160px;
      border-top: 1px solid #9ca3af;
      margin-bottom: 4px;
    }
    .footer .meta {
      text-align: right;
      font-size: 9px;
      color: #9ca3af;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .badge.ok { background: #d1fae5; color: #047857; }
    .badge.warn { background: #fef3c7; color: #b45309; }
    .badge.muted { background: #e5e7eb; color: #4b5563; }
    .badge.error { background: #fee2e2; color: #b91c1c; }
  `;
}

export interface PdfCompanyBlock {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export const PDF_DEFAULT_COMPANY: Required<PdfCompanyBlock> = {
  companyName: 'OneOhm',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
};

export function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
