/**
 * Simple Quote PDF HTML Template
 *
 * Generates HTML from a QuoteDetail object for PDF conversion.
 * Designed for server-upload flows (WhatsApp, email, etc.).
 */

import type { QuoteDetail, QuoteLineItemDetail } from '../hooks/types';

function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '—';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function renderLineItemRows(lineItems: QuoteLineItemDetail[]): string {
  const sorted = [...lineItems].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  return sorted
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">
        <div style="font-weight:600;color:#1f2937;font-size:11px">${item.itemName}</div>
        ${item.itemDescription ? `<div style="color:#6b7280;font-size:9px;margin-top:2px">${item.itemDescription}</div>` : ''}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px">${item.quantity} ${item.unitOfMeasure ?? ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px">${formatCurrency(item.unitPrice)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:11px">${item.taxRate != null ? `${item.taxRate}%` : '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:11px;font-weight:600">${formatCurrency(item.lineTotal)}</td>
    </tr>`,
    )
    .join('');
}

export function generateSimpleQuoteHtml(detail: QuoteDetail): string {
  const pb = detail.pricingBreakdown;
  const milestones = detail.paymentMilestones ?? [];
  const lineItems = detail.lineItems ?? [];

  const customerName = detail.customerName ?? 'Customer';
  const systemTypeLabel = detail.systemType?.replace(/_/g, ' ') ?? '—';
  const projectTypeLabel = detail.projectType?.replace(/_/g, ' ') ?? '—';

  const pricingRows = [
    { label: 'Base Price', value: pb?.basePrice },
    { label: 'GST Amount', value: pb?.totalGst },
    { label: 'Total (incl. GST)', value: pb?.totalPrice },
    ...(pb?.discountAmount ? [{ label: 'Discount', value: pb.discountAmount, negate: true }] : []),
    ...(pb?.subsidyAmount ? [{ label: 'Govt. Subsidy', value: pb.subsidyAmount, negate: true }] : []),
  ] as Array<{ label: string; value: number | undefined; negate?: boolean }>;

  const finalAmount = detail.effectivePrice ?? detail.finalPrice;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1f2937; }
    .page { width: 210mm; min-height: 297mm; background: #fff; }
    .header { background: #1e3a5f; padding: 24px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-left h1 { color: #fff; font-size: 22px; font-weight: 700; }
    .header-left p { color: #94a3b8; font-size: 11px; margin-top: 4px; }
    .header-right { text-align: right; }
    .header-right .label { color: #f97316; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .header-right .quote-num { color: #fff; font-size: 16px; font-weight: 700; margin-top: 2px; }
    .header-right .dates { color: #94a3b8; font-size: 9px; margin-top: 4px; }
    .body { padding: 24px 32px; }
    .customer-box { background: #f3f4f6; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
    .customer-box .for-label { color: #9ca3af; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .customer-box .name { color: #111827; font-size: 16px; font-weight: 700; margin-top: 4px; }
    .customer-box .contact { color: #4b5563; font-size: 10px; margin-top: 4px; }
    .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; margin-top: 20px; }
    .section-title .bar { width: 3px; height: 16px; background: #f97316; border-radius: 2px; flex-shrink: 0; }
    .section-title span { color: #1e3a5f; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; margin-left: 4px; }
    .spec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 4px; }
    .spec-card { background: #f9fafb; border-radius: 6px; padding: 10px 12px; }
    .spec-card .spec-label { color: #9ca3af; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .spec-card .spec-value { color: #1e3a5f; font-size: 14px; font-weight: 700; margin-top: 4px; text-transform: capitalize; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1e3a5f; }
    thead th { color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 8px 10px; text-align: left; }
    thead th:last-child, thead th:nth-child(3) { text-align: right; }
    thead th:nth-child(2), thead th:nth-child(4) { text-align: center; }
    .pricing-row { display: flex; justify-content: flex-end; gap: 0; margin-bottom: 2px; }
    .pricing-label { width: 160px; color: #4b5563; font-size: 11px; padding: 5px 8px; text-align: right; }
    .pricing-value { width: 140px; color: #1f2937; font-size: 11px; font-weight: 600; padding: 5px 8px; text-align: right; }
    .pricing-credit { color: #16a34a !important; }
    .final-box { display: flex; justify-content: flex-end; margin-top: 8px; }
    .final-inner { background: #1e3a5f; border-radius: 6px; padding: 12px 16px; display: flex; align-items: center; gap: 32px; }
    .final-inner .fl { color: #fff; font-size: 12px; font-weight: 700; }
    .final-inner .fv { color: #f97316; font-size: 18px; font-weight: 700; }
    .milestone { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .milestone-badge { width: 24px; height: 24px; background: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 700; flex-shrink: 0; }
    .milestone-name { font-size: 11px; font-weight: 600; color: #1f2937; }
    .milestone-pct { font-size: 11px; font-weight: 700; color: #1e3a5f; margin-left: auto; white-space: nowrap; }
    .milestone-desc { font-size: 9px; color: #9ca3af; margin-top: 2px; }
    .footer { background: #1e3a5f; padding: 12px 32px; margin-top: 24px; }
    .footer p { color: #94a3b8; font-size: 8px; text-align: center; }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>ONE OHM EPC</h1>
      <p>Solar Energy Solutions</p>
    </div>
    <div class="header-right">
      <div class="label">Quotation</div>
      <div class="quote-num">${detail.quoteNumber}</div>
      <div class="dates">Date: ${formatDate(detail.quoteDate)} &nbsp;|&nbsp; Valid until: ${formatDate(detail.validUntil)}</div>
    </div>
  </div>

  <div class="body">
    <!-- Customer -->
    <div class="customer-box">
      <div class="for-label">Prepared For</div>
      <div class="name">${customerName}</div>
      <div class="contact">
        ${[detail.customerPhone, detail.customerEmail].filter(Boolean).join(' &nbsp;•&nbsp; ')}
        ${detail.propertyName ? `<br/>📍 ${detail.propertyName}${detail.propertyAddress ? ` — ${detail.propertyAddress}` : ''}` : ''}
      </div>
    </div>

    <!-- System Details -->
    <div class="section-title"><div class="bar"></div><span>System Details</span></div>
    <div class="spec-grid">
      <div class="spec-card">
        <div class="spec-label">System Type</div>
        <div class="spec-value">${systemTypeLabel}</div>
      </div>
      <div class="spec-card">
        <div class="spec-label">System Size</div>
        <div class="spec-value">${detail.systemSizeKw ?? '—'} kWp</div>
      </div>
      <div class="spec-card">
        <div class="spec-label">Project Type</div>
        <div class="spec-value">${projectTypeLabel}</div>
      </div>
    </div>

    ${
      lineItems.length > 0
        ? `
    <!-- Line Items -->
    <div class="section-title"><div class="bar"></div><span>Line Items</span></div>
    <table>
      <thead>
        <tr>
          <th style="width:40%">Item</th>
          <th style="width:15%;text-align:center">Qty</th>
          <th style="width:18%;text-align:right">Unit Price</th>
          <th style="width:10%;text-align:center">GST</th>
          <th style="width:17%;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${renderLineItemRows(lineItems)}
      </tbody>
    </table>`
        : ''
    }

    <!-- Pricing Summary -->
    ${
      pb
        ? `
    <div class="section-title"><div class="bar"></div><span>Pricing Summary</span></div>
    ${pricingRows
      .map(
        (row) => `
    <div class="pricing-row">
      <div class="pricing-label">${row.label}</div>
      <div class="pricing-value${row.negate ? ' pricing-credit' : ''}">
        ${row.negate ? `- ${formatCurrency(row.value)}` : formatCurrency(row.value)}
      </div>
    </div>`,
      )
      .join('')}
    <div class="final-box">
      <div class="final-inner">
        <span class="fl">Final Amount</span>
        <span class="fv">${formatCurrency(finalAmount)}</span>
      </div>
    </div>`
        : ''
    }

    ${
      milestones.length > 0
        ? `
    <!-- Payment Schedule -->
    <div class="section-title"><div class="bar"></div><span>Payment Schedule</span></div>
    ${milestones
      .map(
        (m, i) => `
    <div class="milestone">
      <div class="milestone-badge">${i + 1}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="milestone-name">${m.name ?? `Milestone ${i + 1}`}</span>
          <span class="milestone-pct">${m.percentage}% — ${formatCurrency(m.amount)}</span>
        </div>
        ${m.description ? `<div class="milestone-desc">${m.description}</div>` : ''}
      </div>
    </div>`,
      )
      .join('')}`
        : ''
    }
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This quotation is confidential and subject to terms and conditions. Prices are valid until the date shown above. GST as applicable.</p>
  </div>
</div>
</body>
</html>`;
}
