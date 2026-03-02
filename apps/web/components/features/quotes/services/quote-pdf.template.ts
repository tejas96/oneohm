/**
 * Quote PDF Template (Web)
 *
 * Adapted from mobile quote-pdf.template.ts.
 * Uses web-side types and local formatting helpers for PDF-specific control.
 */

import { PhaseType, StructureType } from '@oneohm-epc/shared-types';

import type { QuotePdfData } from '../types';

// ============================================================================
// Local PDF formatting helpers (exact format control for PDF output)
// ============================================================================

const PHASE_TYPE_LABELS: Record<string, string> = {
  [PhaseType.SINGLE_PHASE]: 'Single Phase',
  [PhaseType.THREE_PHASE]: 'Three Phase',
};

const STRUCTURE_TYPE_LABELS: Record<string, string> = {
  [StructureType.ALUMINUM_RAIL]: 'Aluminum Rail',
  [StructureType.RCC_3X6]: 'RCC 3x6',
  [StructureType.ELEVATED_6X9]: 'Elevated 6x9',
  [StructureType.SUPER_ELEVATED]: 'Super Elevated',
  [StructureType.GROUND_MOUNT]: 'Ground Mount',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// HTML GENERATION
// ============================================================================

export function generateQuoteHtml(data: QuotePdfData): string {
  const {
    calculation,
    customer,
    property,
    quoteNumber,
    validityDays,
    paymentMilestones,
    discountAmount = 0,
  } = data;

  const totalPanels = calculation.panels.reduce((sum, p) => sum + p.quantity, 0);
  const dcrPanels = calculation.panels.filter((p) => p.isDcr);
  const nonDcrPanels = calculation.panels.filter((p) => !p.isDcr);

  const displayGst5Amount = calculation.pricing.gst5Amount;
  const displayGst18Amount = calculation.pricing.gst18Amount;
  const totalTax = calculation.pricing.totalGst;
  const projectPriceExcludingTax = calculation.pricing.totalPrice - totalTax;

  const adjustedFinalPrice = calculation.pricing.finalPrice - discountAmount;
  const adjustedEffectivePrice = adjustedFinalPrice - calculation.subsidy.amount;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);
  const validityDate = formatDate(validUntil.toISOString());
  const quoteDate = formatDate(calculation.calculatedAt);

  const milestones = paymentMilestones || [];

  const fullAddress = [property.address, property.city, property.state].filter(Boolean).join(', ');

  const panelRows = [...dcrPanels, ...nonDcrPanels]
    .map(
      (panel) => `
            <tr>
              <td><span class="bom-item-name">Solar Panels${panel.isDcr ? ' (DCR)' : ''}</span></td>
              <td>
                <div class="bom-item-specs">
                  ${panel.brand} ${panel.name} | ${panel.wattagePerPanel}Wp per panel${panel.isDcr ? '<br>DCR Compliant - Subsidy Eligible' : ''}
                </div>
                ${
                  panel.productWarrantyYears || panel.performanceWarrantyYears
                    ? `<span class="bom-warranty">${panel.productWarrantyYears || 12}Y Product + ${panel.performanceWarrantyYears || 25}Y Performance</span>`
                    : ''
                }
              </td>
              <td>${panel.quantity} nos</td>
            </tr>`,
    )
    .join('');

  const inverterRows = calculation.inverters.inverters
    .map(
      (inv) => `
            <tr>
              <td><span class="bom-item-name">Inverter</span></td>
              <td>
                <div class="bom-item-specs">
                  ${inv.brand} ${inv.name} | ${PHASE_TYPE_LABELS[calculation.systemConfig.phaseType] || 'N/A'} | ${inv.capacityKw} kWp capacity<br>
                  WiFi/GSM monitoring
                </div>
                ${inv.productWarrantyYears ? `<span class="bom-warranty">${inv.productWarrantyYears}Y OEM Warranty</span>` : ''}
              </td>
              <td>${inv.quantity} nos</td>
            </tr>`,
    )
    .join('');

  const paymentCards =
    milestones.length > 0
      ? milestones
          .map(
            (m, idx) => `
          <div class="payment-milestone">
            <div class="milestone-step">Step ${idx + 1} — ${m.name}</div>
            <div class="milestone-percent">${m.percentage}%</div>
            <div class="milestone-amount">${formatCurrency(m.amount ?? 0)}</div>
            <div class="milestone-desc">${m.description || ''}</div>
          </div>`,
          )
          .join('')
      : `
          <div class="payment-milestone">
            <div class="milestone-step">Step 1 — Advance</div>
            <div class="milestone-percent">10%</div>
            <div class="milestone-amount">${formatCurrency(Math.round(adjustedFinalPrice * 0.1))}</div>
            <div class="milestone-desc">On project confirmation.</div>
          </div>
          <div class="payment-milestone">
            <div class="milestone-step">Step 2 — Installation</div>
            <div class="milestone-percent">85%</div>
            <div class="milestone-amount">${formatCurrency(Math.round(adjustedFinalPrice * 0.85))}</div>
            <div class="milestone-desc">On installation complete.</div>
          </div>
          <div class="payment-milestone">
            <div class="milestone-step">Step 3 — Commissioning</div>
            <div class="milestone-percent">5%</div>
            <div class="milestone-amount">${formatCurrency(Math.round(adjustedFinalPrice * 0.05))}</div>
            <div class="milestone-desc">After net meter installation & commissioning.</div>
          </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solar Quotation - ${quoteNumber || 'Draft'}</title>
  <style>
${getQuoteStyles()}
  </style>
</head>
<body>
  <div class="document">
    <header class="doc-header">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="5" fill="currentColor"/>
            <path d="M12 2V4M12 20V22M4 12H2M6.31 6.31L4.9 4.9M17.69 6.31L19.1 4.9M6.31 17.69L4.9 19.1M17.69 17.69L19.1 19.1M22 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="brand-text">
          <h1>OneOhm</h1>
          <p>Sustainable Green Energy</p>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-type">Solar Quotation</div>
        <div class="doc-number">${quoteNumber || '#DRAFT'}</div>
        <div class="doc-date">${quoteDate}</div>
        <span class="validity-tag">Valid until ${validityDate}</span>
      </div>
    </header>

    <main class="doc-body">
      <div class="parties">
        <div class="party">
          <h3>From</h3>
          <div class="party-name">OneOhm Sustainable Green Energy Pvt Ltd</div>
          <div class="party-details">
            Plot No. 93, Vasantdada Industrial Estate<br>
            Near Old RTO Office, Sangli - 416416<br>
            <strong>Phone:</strong> +91 9225099702<br>
            <strong>Email:</strong> info@oneohm.co
          </div>
        </div>
        <div class="party">
          <h3>To</h3>
          <div class="party-name">${customer.name}</div>
          <div class="party-details">
            <strong>Phone:</strong> ${customer.phone || '-'}<br>
            <strong>Address:</strong> ${fullAddress || '-'}${
              customer.consumerNumber
                ? `<br><strong>Consumer No:</strong> ${customer.consumerNumber}`
                : ''
            }
          </div>
        </div>
      </div>

      <section class="section">
        <h2 class="section-title">System Configuration</h2>
        <div class="system-overview">
          <div class="system-stat highlight">
            <div class="stat-value">${Math.round(calculation.actualSystemSizeKw)} <span class="stat-unit">kWp</span></div>
            <div class="stat-label">System Size</div>
          </div>
          <div class="system-stat">
            <div class="stat-value">${formatNumber(calculation.actualTotalWattage)} <span class="stat-unit">Wp</span></div>
            <div class="stat-label">DC Capacity</div>
          </div>
          <div class="system-stat">
            <div class="stat-value">${totalPanels}</div>
            <div class="stat-label">Solar Panels</div>
          </div>
          <div class="system-stat">
            <div class="stat-value">${calculation.completionWeeks || 16} <span class="stat-unit">wks</span></div>
            <div class="stat-label">Timeline</div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Investment Summary</h2>
        <table class="pricing-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Project Price (excluding taxes)</td>
              <td>${formatCurrency(projectPriceExcludingTax)}</td>
            </tr>
            <tr>
              <td>GST @ 5% (Equipment)</td>
              <td>${formatCurrency(displayGst5Amount)}</td>
            </tr>
            <tr>
              <td>GST @ 18% (Services)</td>
              <td>${formatCurrency(displayGst18Amount)}</td>
            </tr>
            <tr class="subtotal">
              <td>Total Tax</td>
              <td>${formatCurrency(totalTax)}</td>
            </tr>
            ${
              discountAmount > 0
                ? `<tr class="discount-row">
              <td>Discount Applied</td>
              <td style="color: #16a34a; font-weight: 600;">-${formatCurrency(discountAmount)}</td>
            </tr>`
                : ''
            }
            <tr class="total">
              <td>Total Project Cost (incl. GST)</td>
              <td>${formatCurrency(adjustedFinalPrice)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      ${
        calculation.subsidy.isApplicable && calculation.subsidy.amount > 0
          ? `<section class="section">
        <div class="subsidy-box">
          <div class="subsidy-header">
            <span class="subsidy-badge">${calculation.subsidy.schemeName || 'PM Surya Ghar'}</span>
            <span class="subsidy-title">Government Subsidy Benefit</span>
          </div>
          <div class="subsidy-calculation">
            <div class="subsidy-item">
              <div class="subsidy-value">${formatCurrency(adjustedFinalPrice)}</div>
              <div class="subsidy-label">Total Cost${discountAmount > 0 ? ' (after discount)' : ''}</div>
            </div>
            <div class="subsidy-operator">\u2212</div>
            <div class="subsidy-item">
              <div class="subsidy-value">${formatCurrency(calculation.subsidy.amount)}</div>
              <div class="subsidy-label">CFA Subsidy</div>
            </div>
            <div class="subsidy-operator">=</div>
            <div class="subsidy-item">
              <div class="subsidy-value green">${formatCurrency(adjustedEffectivePrice)}</div>
              <div class="subsidy-label">Your Net Cost</div>
            </div>
          </div>
          <p class="subsidy-note">
            * Subsidy applicable for residential projects only. Amount disbursed via Direct Benefit Transfer after commissioning. Actual amount may vary based on final wattage. OneOhm facilitates the process but does not guarantee subsidy approval.
          </p>
        </div>
      </section>`
          : ''
      }

      <section class="section">
        <h2 class="section-title">Payment Schedule</h2>
        <div class="payment-schedule">
          ${paymentCards}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Bill of Materials</h2>
        <table class="bom-table">
          <thead>
            <tr>
              <th style="width: 25%">Component</th>
              <th>Specifications</th>
              <th style="width: 12%">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr class="bom-category-row"><td colspan="3">Primary Equipment</td></tr>
            ${panelRows}
            ${inverterRows}
            <tr>
              <td><span class="bom-item-name">Mounting Structure</span></td>
              <td>
                <div class="bom-item-specs">
                  ${STRUCTURE_TYPE_LABELS[calculation.structure.structureType] || calculation.structure.name} | Hot-Dip Galvanized MS<br>
                  SS304 Fasteners | A-Raymond Clamps | IS 875 Certified
                </div>
              </td>
              <td>1 set</td>
            </tr>
            <tr class="bom-category-row"><td colspan="3">Electrical & Safety</td></tr>
            <tr>
              <td><span class="bom-item-name">DC Cables</span></td>
              <td><div class="bom-item-specs">Polycab/KEI/RR | 4 Sq.mm Solar-grade | UV Protected | 1100V</div></td>
              <td>As req.</td>
            </tr>
            <tr>
              <td><span class="bom-item-name">AC Cables & ACDB</span></td>
              <td><div class="bom-item-specs">Multi-core Al/Cu cables | ACDB with MCB + SPD</div></td>
              <td>As req.</td>
            </tr>
            <tr>
              <td><span class="bom-item-name">Earthing System</span></td>
              <td><div class="bom-item-specs">Maintenance-Free Copper Bonded | 1.2m Rod | IEC/IS 62305</div></td>
              <td>1 set</td>
            </tr>
            <tr>
              <td><span class="bom-item-name">Lightning Arrestor</span></td>
              <td><div class="bom-item-specs">BS EN/IEC 62305 Certified | NFC & CPRI Tested</div></td>
              <td>1 nos</td>
            </tr>
            <tr class="bom-category-row"><td colspan="3">Metering & Monitoring</td></tr>
            <tr>
              <td><span class="bom-item-name">Meters</span></td>
              <td>
                <div class="bom-item-specs">
                  Generation Meter: MSEDCL Approved HPL/L&T | ${PHASE_TYPE_LABELS[calculation.systemConfig.phaseType] || 'N/A'}<br>
                  Net Meter: Installed by MSEDCL approved vendors
                </div>
              </td>
              <td>2 nos</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2 class="section-title">Terms & Conditions</h2>
        <div class="terms-grid">
          <div class="terms-block">
            <h4>OneOhm Scope of Work</h4>
            <ul>
              <li>Site survey, design & shadow analysis</li>
              <li>Supply & installation of all equipment</li>
              <li>MSEDCL application & net metering</li>
              <li>5-year free workmanship maintenance</li>
              <li>Quarterly maintenance visits</li>
            </ul>
          </div>
          <div class="terms-block">
            <h4>Customer Responsibilities</h4>
            <ul>
              <li>Shadow-free, south-facing installation area</li>
              <li>Internet for remote monitoring</li>
              <li>Load extension charges (if applicable)</li>
              <li>Regular panel cleaning</li>
              <li>Timely milestone payments</li>
            </ul>
          </div>
          <div class="terms-block">
            <h4>Timeline</h4>
            <ul>
              <li>MSEDCL sanction: ~2 weeks</li>
              <li>Material delivery: 10-12 days post-sanction</li>
              <li>Installation: 2-3 days</li>
              <li>Net meter by MSEDCL: ~3 weeks</li>
            </ul>
          </div>
          <div class="terms-block">
            <h4>Cancellation Policy</h4>
            <ul>
              <li>Free within 7 days of advance</li>
              <li>After 7 days: 5% fee + incurred costs</li>
              <li>After dispatch: Full forfeiture</li>
              <li>Late payment: 1.25% monthly interest</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Payment Details</h2>
        <div class="bank-info">
          <div class="bank-field"><label>Account Name</label><span>Oneohm Sustainable Green Energy Pvt Ltd</span></div>
          <div class="bank-field"><label>Bank</label><span>State Bank of India</span></div>
          <div class="bank-field"><label>Account No.</label><span>43432696314</span></div>
          <div class="bank-field"><label>IFSC</label><span>SBIN0001501</span></div>
        </div>
      </section>

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-label">For OneOhm Sustainable Green Energy</div>
          <div class="signature-name">Authorized Signatory</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">Customer Acceptance</div>
          <div class="signature-name">${customer.name}</div>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;
}

// ============================================================================
// CSS STYLES (identical to mobile template)
// ============================================================================

export function getQuoteStyles(): string {
  return `:root{--primary:#16a34a;--primary-dark:#15803d;--primary-light:#22c55e;--primary-50:#f0fdf4;--primary-100:#dcfce7;--secondary:#1e40af;--accent:#f59e0b;--gray-50:#f9fafb;--gray-100:#f3f4f6;--gray-200:#e5e7eb;--gray-300:#d1d5db;--gray-400:#9ca3af;--gray-500:#6b7280;--gray-600:#4b5563;--gray-700:#374151;--gray-800:#1f2937;--gray-900:#111827;--success:#059669;--warning:#d97706;--error:#dc2626;--font-main:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;--radius-sm:4px;--radius-md:8px;--radius-lg:12px;--shadow-sm:0 1px 2px rgba(0,0,0,0.05);--shadow-md:0 4px 6px -1px rgba(0,0,0,0.1)}*{margin:0;padding:0;box-sizing:border-box}html{font-size:14px;-webkit-font-smoothing:antialiased}body{font-family:var(--font-main);color:var(--gray-800);background:var(--gray-50);line-height:1.5}.document{max-width:800px;margin:0 auto;background:white}@media print{.document{margin:0;box-shadow:none;max-width:100%}body{background:white}}.doc-header{display:flex;justify-content:space-between;align-items:flex-start;padding:32px 40px;border-bottom:3px solid var(--primary)}.brand{display:flex;align-items:center;gap:12px}.brand-icon{width:48px;height:48px;background:var(--primary);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center}.brand-icon svg{width:28px;height:28px;fill:white}.brand-text h1{font-size:1.5rem;font-weight:800;color:var(--gray-900);letter-spacing:-0.5px}.brand-text p{font-size:.75rem;color:var(--gray-500);font-weight:500;text-transform:uppercase;letter-spacing:1px}.doc-meta{text-align:right}.doc-type{font-size:.65rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}.doc-number{font-size:1.25rem;font-weight:700;color:var(--gray-900);margin-bottom:8px}.doc-date{font-size:.875rem;color:var(--gray-600)}.validity-tag{display:inline-block;margin-top:8px;padding:4px 12px;background:var(--primary-50);border:1px solid var(--primary-100);border-radius:var(--radius-sm);font-size:.75rem;font-weight:600;color:var(--primary-dark)}.doc-body{padding:32px 40px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid var(--gray-200)}.party h3{font-size:.65rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px}.party-name{font-size:1.125rem;font-weight:700;color:var(--gray-900);margin-bottom:8px}.party-details{font-size:.875rem;color:var(--gray-600);line-height:1.6}.party-details strong{color:var(--gray-700)}.section{margin-bottom:28px}.section-title{font-size:.7rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:1.5px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);margin-bottom:16px}.system-overview{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.system-stat{background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:16px;text-align:center}.system-stat.highlight{background:var(--primary-50);border-color:var(--primary-100)}.stat-value{font-size:1.75rem;font-weight:800;color:var(--gray-900);line-height:1}.system-stat.highlight .stat-value{color:var(--primary-dark)}.stat-unit{font-size:.875rem;font-weight:500;color:var(--gray-500)}.stat-label{font-size:.75rem;color:var(--gray-500);margin-top:4px;font-weight:500}.pricing-table{width:100%;border-collapse:collapse;margin-bottom:16px}.pricing-table th,.pricing-table td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--gray-100)}.pricing-table th{font-size:.7rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;background:var(--gray-50)}.pricing-table td{font-size:.9375rem;color:var(--gray-700)}.pricing-table td:last-child{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}.pricing-table tr.subtotal{background:var(--gray-50)}.pricing-table tr.subtotal td{font-weight:600}.pricing-table tr.total{background:var(--primary)}.pricing-table tr.total td{color:white;font-weight:700;font-size:1rem;border-bottom:none}.subsidy-box{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:var(--radius-md);padding:20px 24px;margin-bottom:24px}.subsidy-header{display:flex;align-items:center;gap:8px;margin-bottom:16px}.subsidy-badge{background:var(--accent);color:white;padding:3px 10px;border-radius:var(--radius-sm);font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:1px}.subsidy-title{font-size:.9375rem;font-weight:700;color:var(--gray-800)}.subsidy-calculation{display:flex;align-items:center;justify-content:space-between;gap:16px}.subsidy-item{flex:1;text-align:center}.subsidy-value{font-size:1.5rem;font-weight:800;color:var(--gray-900)}.subsidy-value.green{color:var(--success)}.subsidy-label{font-size:.75rem;color:var(--gray-600);margin-top:2px}.subsidy-operator{font-size:1.25rem;font-weight:700;color:var(--gray-400)}.subsidy-note{margin-top:16px;padding-top:12px;border-top:1px dashed #d97706;font-size:.75rem;color:var(--gray-600);line-height:1.5}.payment-schedule{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.payment-milestone{background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:16px;position:relative}.payment-milestone::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--primary);border-radius:var(--radius-md) var(--radius-md) 0 0}.milestone-step{font-size:.65rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}.milestone-percent{font-size:1.5rem;font-weight:800;color:var(--gray-900)}.milestone-amount{font-size:1rem;font-weight:600;color:var(--gray-700);margin-bottom:8px}.milestone-desc{font-size:.75rem;color:var(--gray-500);line-height:1.4}.bom-table{width:100%;border-collapse:collapse}.bom-table th,.bom-table td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--gray-100);vertical-align:top}.bom-table th{font-size:.7rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;background:var(--gray-50)}.bom-table td{font-size:.875rem;color:var(--gray-700)}.bom-item-name{font-weight:600;color:var(--gray-800)}.bom-item-specs{font-size:.8125rem;color:var(--gray-500);margin-top:4px;line-height:1.5}.bom-warranty{display:inline-block;padding:2px 8px;background:var(--primary-50);border-radius:var(--radius-sm);font-size:.7rem;font-weight:600;color:var(--primary-dark);margin-top:4px}.bom-category-row td{background:var(--gray-100);font-weight:700;font-size:.75rem;color:var(--gray-600);text-transform:uppercase;letter-spacing:1px;padding:8px 16px}.terms-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}.terms-block h4{font-size:.8125rem;font-weight:700;color:var(--gray-800);margin-bottom:8px;display:flex;align-items:center;gap:6px}.terms-block h4::before{content:'';width:4px;height:4px;background:var(--primary);border-radius:50%}.terms-block ul{list-style:none;font-size:.8125rem;color:var(--gray-600);line-height:1.6}.terms-block li{padding-left:16px;position:relative;margin-bottom:4px}.terms-block li::before{content:'\\2014';position:absolute;left:0;color:var(--gray-300)}.bank-info{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--radius-md);padding:16px 20px}.bank-field label{display:block;font-size:.65rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.bank-field span{font-size:.9375rem;font-weight:600;color:var(--gray-800)}.signatures{display:grid;grid-template-columns:repeat(2,1fr);gap:40px;margin-top:40px;padding-top:24px;border-top:1px solid var(--gray-200)}.signature-box{padding-top:60px;border-top:1px solid var(--gray-300)}.signature-label{font-size:.75rem;color:var(--gray-500);margin-bottom:4px}.signature-name{font-size:.875rem;font-weight:600;color:var(--gray-800)}`;
}
