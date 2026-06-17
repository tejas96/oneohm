import { PaymentMethod, PaymentTransactionStatus } from '@tejas96/shared/types';

import {
  PDF_DEFAULT_COMPANY,
  type PdfCompanyBlock,
  escapeHtml,
  getFinanceDocStyles,
} from './shared-styles';

import { formatCurrency } from '@/lib/utils';

export interface ReceiptPdfData {
  receipt: {
    paymentNumber: string;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    paymentReference?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    notes?: string | null;
    status: PaymentTransactionStatus;
    paidAt?: string | null;
    createdAt: string;
  };
  project: {
    projectNumber: string;
    name: string;
  };
  /** Optional payment-term context (when receipt is linked to a planned installment). */
  term?: {
    name: string;
    expectedAmount: number;
    paidAmount: number;
  } | null;
  customer: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  company?: PdfCompanyBlock;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function maskAccount(value?: string | null): string {
  if (!value) return '';
  if (value.length <= 4) return value;
  return `••••${value.slice(-4)}`;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.ONLINE]: 'Online',
  [PaymentMethod.CHEQUE]: 'Cheque',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.NEFT]: 'NEFT',
  [PaymentMethod.RTGS]: 'RTGS',
  [PaymentMethod.IMPS]: 'IMPS',
  [PaymentMethod.UPI]: 'UPI',
  [PaymentMethod.DEMAND_DRAFT]: 'Demand Draft',
};

const RECEIPT_STATUS_LABELS: Record<PaymentTransactionStatus, string> = {
  [PaymentTransactionStatus.PENDING]: 'Pending',
  [PaymentTransactionStatus.RECEIVED]: 'Received',
  [PaymentTransactionStatus.VERIFIED]: 'Verified',
  [PaymentTransactionStatus.CLEARED]: 'Cleared',
  [PaymentTransactionStatus.BOUNCED]: 'Bounced',
  [PaymentTransactionStatus.REFUNDED]: 'Refunded',
};

function statusBadgeClass(status: PaymentTransactionStatus): string {
  switch (status) {
    case PaymentTransactionStatus.CLEARED:
    case PaymentTransactionStatus.VERIFIED:
      return 'badge ok';
    case PaymentTransactionStatus.RECEIVED:
      return 'badge ok';
    case PaymentTransactionStatus.PENDING:
      return 'badge warn';
    case PaymentTransactionStatus.BOUNCED:
    case PaymentTransactionStatus.REFUNDED:
      return 'badge error';
    default:
      return 'badge muted';
  }
}

/**
 * Renders a single-page Receipt PDF as inline HTML. Mirrors the
 * compact layout used by the Finance tab's receipt detail view so the
 * printed artefact matches what the user sees on screen.
 */
export function generateReceiptHtml(data: ReceiptPdfData): string {
  const co = { ...PDF_DEFAULT_COMPANY, ...(data.company ?? {}) };
  const r = data.receipt;
  const customerLines = [
    data.customer.name ? `<div class="name">${escapeHtml(data.customer.name)}</div>` : '',
    data.customer.address ? `<div class="meta">${escapeHtml(data.customer.address)}</div>` : '',
    data.customer.phone ? `<div class="meta">${escapeHtml(data.customer.phone)}</div>` : '',
    data.customer.email ? `<div class="meta">${escapeHtml(data.customer.email)}</div>` : '',
  ]
    .filter(Boolean)
    .join('');

  const companyLines = [
    co.companyAddress,
    [co.companyPhone, co.companyEmail].filter(Boolean).join(' · '),
  ]
    .filter(Boolean)
    .join('\n');

  const referenceRow = r.paymentReference
    ? `<tr><td class="label">Reference</td><td class="value">${escapeHtml(r.paymentReference)}</td></tr>`
    : '';

  const bankRow =
    r.bankName || r.accountNumber || r.ifscCode
      ? `<tr><td class="label">Bank</td><td class="value">${[
          escapeHtml(r.bankName ?? ''),
          maskAccount(r.accountNumber),
          escapeHtml(r.ifscCode ?? ''),
        ]
          .filter(Boolean)
          .join(' · ')}</td></tr>`
      : '';

  const termBlock = data.term
    ? `<tr><td class="label">Applied To Term</td><td class="value">${escapeHtml(data.term.name)} (${formatCurrency(data.term.paidAmount)} / ${formatCurrency(data.term.expectedAmount)})</td></tr>`
    : `<tr><td class="label">Applied To</td><td class="value"><em>Advance / unallocated</em></td></tr>`;

  const notesBlock = r.notes ? `<div class="notes">${escapeHtml(r.notes)}</div>` : '';

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Receipt ${escapeHtml(r.paymentNumber)}</title>
<style>${getFinanceDocStyles()}</style>
</head>
<body>
<div class="doc">
  <div class="doc-header">
    <div>
      <p class="company-name">${escapeHtml(co.companyName)}</p>
      ${companyLines ? `<div class="company-meta">${escapeHtml(companyLines)}</div>` : ''}
    </div>
    <div class="doc-title">
      <p class="label">Payment Receipt</p>
      <div class="number">${escapeHtml(r.paymentNumber)}</div>
      <div class="date">${formatDate(r.paidAt ?? r.createdAt)}</div>
      <div style="margin-top:6px"><span class="${statusBadgeClass(r.status)}">${escapeHtml(RECEIPT_STATUS_LABELS[r.status] ?? r.status)}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h4>Received From</h4>
      ${customerLines || '<div class="meta">—</div>'}
    </div>
    <div class="party">
      <h4>Project</h4>
      <div class="name">${escapeHtml(data.project.name)}</div>
      <div class="meta">${escapeHtml(data.project.projectNumber)}</div>
    </div>
  </div>

  <div class="amount-card">
    <span class="label">Amount Received</span>
    <span class="value">${formatCurrency(r.paidAmount)}</span>
  </div>

  <table class="summary-table">
    <tbody>
      <tr><td class="label">Payment Method</td><td class="value">${escapeHtml(PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod)}</td></tr>
      <tr><td class="label">Recorded On</td><td class="value">${formatDate(r.createdAt)}</td></tr>
      ${referenceRow}
      ${bankRow}
      ${termBlock}
    </tbody>
  </table>

  ${notesBlock}

  <div class="footer">
    <div class="signature">
      <div class="line"></div>
      Authorised Signatory
    </div>
    <div class="meta">
      Generated ${formatDate(new Date().toISOString())}<br/>
      This is a system-generated document.
    </div>
  </div>
</div>
</body></html>`;
}
