import { COMPANY } from '@tejas96/shared/constants';

import { formatPaise } from '@/lib/utils/paise';

/**
 * Payment receipt — an acknowledgement of money RECEIVED.
 *
 * Deliberately not an invoice. An invoice demands money not yet paid; this
 * confirms money already in. The ledger models that distinction structurally —
 * `payment_milestones` is the demand side, `ledger_entries` with direction 'in'
 * is the received side — and the paperwork should not blur it.
 *
 * The old finance module's receipt template (deleted in the ledger rebuild)
 * carried a single optional `term`. That could not describe reality: one receipt
 * routinely settles several milestones at once. The allocation table below is
 * the material improvement — the customer can see exactly which instalments
 * their money was applied to, which is the question they actually ask.
 */

export interface ReceiptAllocationLine {
  milestoneName: string;
  allocatedPaise: number;
}

export interface ReceiptPdfData {
  entry: {
    entryNo: string;
    amountPaise: number;
    valueDate: string;
    paymentMethod?: string | null;
    reference?: string | null;
    notes?: string | null;
  };
  project: {
    projectNumber: string;
    name: string;
  };
  customer: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  site: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    consumerNumber?: string | null;
  };
  /** Which milestones this receipt was applied to, and how much to each. */
  allocations: ReceiptAllocationLine[];
  /** Anything not applied to a milestone — sits as credit on the account. */
  unappliedPaise: number;
  /** The customer's position AFTER this payment. */
  balance: {
    contractPaise: number;
    receivedPaise: number;
    outstandingPaise: number;
  };
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

/**
 * The company block printed on receipts. Assembled from the shared COMPANY
 * constant — never hardcode these strings again. GSTIN and PAN are deliberately
 * absent: this document states it is not a tax invoice.
 */
export const RECEIPT_COMPANY: ReceiptPdfData['company'] = {
  name: COMPANY.name,
  address: `${COMPANY.address}, ${COMPANY.state} ${COMPANY.pincode}`,
  phone: COMPANY.phone,
  email: COMPANY.email,
};

// Narrow rather than `unknown`: every call site passes a string or number, and
// accepting objects would silently interpolate "[object Object]" into a document
// that goes to a customer.
function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMethod(method?: string | null): string {
  if (!method) return '—';
  return method.replace(/_/g, ' ').toUpperCase();
}

function formatDate(iso: string): string {
  // Parsed as a plain date, not a timestamp: value_date is a DATE column and
  // running it through a timezone would shift it a day for anyone east of UTC.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}

function siteLine(site: ReceiptPdfData['site']): string {
  return [site.address, site.city, site.state, site.pincode].filter(Boolean).join(', ');
}

export function generateReceiptHtml(data: ReceiptPdfData): string {
  const { entry, project, customer, site, allocations, unappliedPaise, balance, company } = data;

  const allocationRows = allocations.length
    ? allocations
        .map(
          (a) => `
        <tr>
          <td class="cell">${escapeHtml(a.milestoneName)}</td>
          <td class="cell num">${escapeHtml(formatPaise(a.allocatedPaise))}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td class="cell muted" colspan="2">Not applied to a specific milestone</td></tr>`;

  const unappliedRow =
    unappliedPaise > 0
      ? `<tr>
           <td class="cell">Unapplied credit <span class="muted">(held on account)</span></td>
           <td class="cell num">${escapeHtml(formatPaise(unappliedPaise))}</td>
         </tr>`
      : '';

  return `
<div class="doc">
  <style>${getReceiptStyles()}</style>

  <div class="head">
    <div>
      <div class="co-name">${escapeHtml(company.name)}</div>
      <div class="muted sm">${escapeHtml(company.address)}</div>
      <div class="muted sm">${escapeHtml(company.phone)} &middot; ${escapeHtml(company.email)}</div>
    </div>
    <div class="right">
      <div class="title">PAYMENT RECEIPT</div>
      <div class="rno">${escapeHtml(entry.entryNo)}</div>
      <div class="muted sm">${escapeHtml(formatDate(entry.valueDate))}</div>
    </div>
  </div>

  <div class="amount-box">
    <div class="muted sm">Amount received</div>
    <div class="amount">${escapeHtml(formatPaise(entry.amountPaise))}</div>
  </div>

  <div class="cols">
    <div class="col">
      <div class="label">Received from</div>
      <div class="strong">${escapeHtml(customer.name ?? '—')}</div>
      ${customer.phone ? `<div class="muted sm">${escapeHtml(customer.phone)}</div>` : ''}
      ${customer.email ? `<div class="muted sm">${escapeHtml(customer.email)}</div>` : ''}
    </div>
    <div class="col">
      <div class="label">Installation site</div>
      <div class="sm">${escapeHtml(siteLine(site) || '—')}</div>
      ${site.consumerNumber ? `<div class="muted sm">Consumer no. ${escapeHtml(site.consumerNumber)}</div>` : ''}
    </div>
  </div>

  <div class="cols">
    <div class="col">
      <div class="label">Project</div>
      <div class="sm strong">${escapeHtml(project.projectNumber)}</div>
      <div class="muted sm">${escapeHtml(project.name)}</div>
    </div>
    <div class="col">
      <div class="label">Payment details</div>
      <div class="sm">Method: ${escapeHtml(formatMethod(entry.paymentMethod))}</div>
      ${entry.reference ? `<div class="muted sm">Ref: ${escapeHtml(entry.reference)}</div>` : ''}
    </div>
  </div>

  <div class="label mt">Applied to</div>
  <table class="tbl">
    <thead>
      <tr><th class="th">Milestone</th><th class="th num">Amount</th></tr>
    </thead>
    <tbody>
      ${allocationRows}
      ${unappliedRow}
      <tr class="total">
        <td class="cell strong">Total received</td>
        <td class="cell num strong">${escapeHtml(formatPaise(entry.amountPaise))}</td>
      </tr>
    </tbody>
  </table>

  <div class="label mt">Account position after this payment</div>
  <table class="tbl">
    <tbody>
      <tr><td class="cell">Contract value</td><td class="cell num">${escapeHtml(formatPaise(balance.contractPaise))}</td></tr>
      <tr><td class="cell">Total received to date</td><td class="cell num">${escapeHtml(formatPaise(balance.receivedPaise))}</td></tr>
      <tr class="total">
        <td class="cell strong">Balance outstanding</td>
        <td class="cell num strong">${escapeHtml(formatPaise(balance.outstandingPaise))}</td>
      </tr>
    </tbody>
  </table>

  ${entry.notes ? `<div class="notes"><span class="label">Notes</span><div class="sm">${escapeHtml(entry.notes)}</div></div>` : ''}

  <div class="foot">
    This is a computer-generated receipt acknowledging the amount received above and does not
    require a signature. It is not a tax invoice.
  </div>
</div>`;
}

export function getReceiptStyles(): string {
  return `
  /* padding-bottom is load-bearing: html2canvas captures the element box, and
     the footer's own margin-top falls outside it — without this the last line
     is sliced in half at the capture boundary. */
  .doc { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #18181b; font-size: 11px; line-height: 1.5; padding-bottom: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 10px; margin-bottom: 14px; }
  .co-name { font-size: 16px; font-weight: 700; color: #16a34a; }
  .right { text-align: right; }
  .title { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; }
  .rno { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; font-weight: 600; margin-top: 2px; }
  .muted { color: #71717a; }
  .sm { font-size: 10.5px; }
  .strong { font-weight: 600; }
  .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
  .amount { font-size: 24px; font-weight: 700; color: #15803d; margin-top: 2px; }
  .cols { display: flex; gap: 16px; margin-bottom: 12px; }
  .col { flex: 1; min-width: 0; }
  .label { font-size: 9px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: #71717a; margin-bottom: 3px; }
  .mt { margin-top: 14px; }
  .tbl { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .th { text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #71717a; border-bottom: 1px solid #e4e4e7; padding: 5px 6px; }
  .cell { padding: 6px; border-bottom: 1px solid #f4f4f5; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total td { border-top: 1px solid #d4d4d8; border-bottom: none; }
  .notes { margin-top: 14px; }
  .foot { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e4e4e7; font-size: 9px; color: #a1a1aa; }
  `;
}
