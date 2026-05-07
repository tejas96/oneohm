import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAID_BY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from '@oneohm-epc/shared/constants';
import {
  type ExpenseCategory,
  type ExpensePaidByType,
  type PaymentMethod,
  PaymentMethod as PM,
  type ReimbursementStatus,
  ReimbursementStatus as RS,
} from '@oneohm-epc/shared/types';

import {
  PDF_DEFAULT_COMPANY,
  type PdfCompanyBlock,
  escapeHtml,
  getFinanceDocStyles,
} from './shared-styles';

import { formatCurrency } from '@/lib/utils';

export interface ExpenseVoucherLineItem {
  itemName?: string | null;
  productId?: string | null;
  unit?: string | null;
  quantity: number;
  unitPrice?: number | null;
}

export interface ExpenseVoucherPdfData {
  expense: {
    expenseNumber: string;
    category: ExpenseCategory;
    vendorName?: string | null;
    amount: number;
    expenseDate: string;
    paymentMethod: PaymentMethod;
    paidBy: ExpensePaidByType;
    paidByEmployeeName?: string | null;
    reimbursementStatus: ReimbursementStatus;
    overrideUsed?: boolean;
    overrideReason?: string | null;
    notes?: string | null;
    productLinks?: ExpenseVoucherLineItem[];
    createdAt: string;
  };
  project: {
    projectNumber: string;
    name: string;
  };
  company?: PdfCompanyBlock;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PM.ONLINE]: 'Online',
  [PM.CHEQUE]: 'Cheque',
  [PM.CASH]: 'Cash',
  [PM.NEFT]: 'NEFT',
  [PM.RTGS]: 'RTGS',
  [PM.IMPS]: 'IMPS',
  [PM.UPI]: 'UPI',
  [PM.DEMAND_DRAFT]: 'Demand Draft',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function reimbursementBadgeClass(status: ReimbursementStatus): string {
  switch (status) {
    case RS.REIMBURSED:
      return 'badge ok';
    case RS.PENDING:
      return 'badge warn';
    case RS.NOT_APPLICABLE:
      return 'badge muted';
    default:
      return 'badge muted';
  }
}

/**
 * Renders a single-page Expense Voucher PDF as inline HTML. When the
 * expense has product links, an itemized table is rendered with line
 * totals and a footer total. Otherwise a simple summary table suffices.
 */
export function generateExpenseVoucherHtml(data: ExpenseVoucherPdfData): string {
  const co = { ...PDF_DEFAULT_COMPANY, ...(data.company ?? {}) };
  const e = data.expense;

  const lines = e.productLinks ?? [];
  const lineTotal = lines.reduce(
    (acc, l) => acc + Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0),
    0,
  );

  const linesTable =
    lines.length > 0
      ? `<table class="line-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Unit</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${lines
              .map((l) => {
                const lt = Number(l.quantity ?? 0) * Number(l.unitPrice ?? 0);
                return `<tr>
                  <td>${escapeHtml(l.itemName ?? l.productId ?? '—')}</td>
                  <td>${escapeHtml(l.unit ?? '—')}</td>
                  <td class="right">${escapeHtml(l.quantity)}</td>
                  <td class="right">${l.unitPrice == null ? '—' : formatCurrency(l.unitPrice)}</td>
                  <td class="right">${l.unitPrice == null ? '—' : formatCurrency(lt)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="right">Line items total</td>
              <td class="right">${formatCurrency(lineTotal)}</td>
            </tr>
          </tfoot>
        </table>`
      : '';

  const overrideBlock = e.overrideUsed
    ? `<div class="notes" style="border-color:#fde68a;background:#fffbeb;color:#92400e">
        <strong>Procurement guard override.</strong> ${escapeHtml(e.overrideReason ?? '')}
      </div>`
    : '';

  const notesBlock = e.notes ? `<div class="notes">${escapeHtml(e.notes)}</div>` : '';

  const companyMeta = [
    co.companyAddress,
    [co.companyPhone, co.companyEmail].filter(Boolean).join(' · '),
  ]
    .filter(Boolean)
    .join('\n');

  const paidByLabel = `${EXPENSE_PAID_BY_LABELS[e.paidBy] ?? e.paidBy}${
    e.paidByEmployeeName ? ` (${e.paidByEmployeeName})` : ''
  }`;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Expense Voucher ${escapeHtml(e.expenseNumber)}</title>
<style>${getFinanceDocStyles()}</style>
</head>
<body>
<div class="doc">
  <div class="doc-header">
    <div>
      <p class="company-name">${escapeHtml(co.companyName)}</p>
      ${companyMeta ? `<div class="company-meta">${escapeHtml(companyMeta)}</div>` : ''}
    </div>
    <div class="doc-title">
      <p class="label">Expense Voucher</p>
      <div class="number">${escapeHtml(e.expenseNumber)}</div>
      <div class="date">${formatDate(e.expenseDate)}</div>
      <div style="margin-top:6px"><span class="${reimbursementBadgeClass(e.reimbursementStatus)}">${escapeHtml(REIMBURSEMENT_STATUS_LABELS[e.reimbursementStatus] ?? e.reimbursementStatus)}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h4>Project</h4>
      <div class="name">${escapeHtml(data.project.name)}</div>
      <div class="meta">${escapeHtml(data.project.projectNumber)}</div>
    </div>
    <div class="party">
      <h4>Vendor / Payee</h4>
      <div class="name">${escapeHtml(e.vendorName ?? '—')}</div>
      <div class="meta">Category: ${escapeHtml(EXPENSE_CATEGORY_LABELS[e.category] ?? e.category)}</div>
    </div>
  </div>

  <div class="amount-card warning">
    <span class="label">Total Spent</span>
    <span class="value">${formatCurrency(e.amount)}</span>
  </div>

  <table class="summary-table">
    <tbody>
      <tr><td class="label">Expense Date</td><td class="value">${formatDate(e.expenseDate)}</td></tr>
      <tr><td class="label">Payment Method</td><td class="value">${escapeHtml(PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod)}</td></tr>
      <tr><td class="label">Paid By</td><td class="value">${escapeHtml(paidByLabel)}</td></tr>
      <tr><td class="label">Recorded On</td><td class="value">${formatDate(e.createdAt)}</td></tr>
    </tbody>
  </table>

  ${linesTable}
  ${overrideBlock}
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
