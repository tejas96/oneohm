/**
 * DCR (Domestic Content Requirement) – Undertaking / Self-Declaration PDF Template
 *
 * Single-page self-declaration submitted by the vendor certifying that
 * PV modules are domestically manufactured as required by MNRE/MSEDCL.
 *
 * Content is preserved verbatim from the source PDF — only layout and
 * typography have been improved for print quality.
 */

export interface DcrFields {
  vendor_name: string;
  capacity_kw: string;
  consumer_name: string;
  consumer_address: string;
  application_number: string;
  application_date: string;
  pv_module_capacities: string; // e.g. "575.00Wp, 575.00Wp, 575.00Wp, 575.00Wp, 575.00Wp, 575.00Wp"
  number_of_pv_modules: string;
  pv_module_serial_numbers: string; // comma-separated serial numbers
  pv_module_make: string;
  cell_manufacturer_name: string;
  cell_gst_invoice_no: string;
  signatory_name: string;
  signatory_designation: string;
  signatory_phone: string;
  signatory_email: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeDcrFields(fields: DcrFields): DcrFields {
  const sanitized = {} as DcrFields;
  for (const key of Object.keys(fields) as Array<keyof DcrFields>) {
    sanitized[key] = escapeHtml(fields[key]);
  }
  return sanitized;
}

export function generateDcrHtml(fields: DcrFields): string {
  const f = sanitizeDcrFields(fields);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DCR Undertaking / Self-Declaration</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', Arial, sans-serif;
        font-size: 9pt;
        color: #1a1a1a;
        background: #fff;
      }

      /*
       * Single wrapper targeted by html2pdf. One logical page sits inside it.
       */
      .pdf-wrapper {
        width: 210mm;
        margin: 0 auto;
        background: #fff;
      }

      .pdf-page {
        width: 210mm;
        padding: 12mm 14mm 12mm 14mm;
        background: #fff;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      /* ── HEADER ── */
      .doc-header {
        text-align: center;
        padding-bottom: 8px;
        margin-bottom: 14px;
        border-bottom: 2px solid #1a1a1a;
      }

      .doc-header .doc-title {
        font-size: 11pt;
        font-weight: 700;
        color: #1a1a1a;
        line-height: 1.4;
      }

      /* ── NUMBERED CLAUSES ── */
      .clause {
        font-size: 9pt;
        line-height: 1.7;
        color: #1a1a1a;
        text-align: justify;
        margin-bottom: 12px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .clause strong {
        font-weight: 700;
        color: #1a1a1a;
      }

      /* ── MODULE DETAILS LIST ── */
      .module-list {
        margin: 8px 0 8px 16px;
        font-size: 9pt;
        line-height: 1.75;
        color: #1a1a1a;
        page-break-inside: avoid;
        break-inside: avoid;
        list-style: none;
        padding: 0;
      }

      .module-list li {
        margin-bottom: 4px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .module-list li strong {
        font-weight: 700;
      }

      /* ── SIGNATURE BLOCK ── */
      .sig-block {
        margin-top: 28px;
        font-size: 9pt;
        line-height: 1.8;
        color: #1a1a1a;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .sig-block .sig-label {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .sig-block .sig-stamp {
        display: inline-block;
        border: 1px dashed #aaa;
        padding: 6px 14px;
        font-size: 8.5pt;
        color: #888;
        margin-bottom: 10px;
        border-radius: 2px;
      }

      .sig-block .for-company {
        font-weight: 700;
        font-size: 9.5pt;
        margin-bottom: 8px;
      }

      .sig-detail-row {
        display: flex;
        gap: 6px;
        font-size: 9pt;
        line-height: 1.8;
      }

      .sig-detail-row .detail-label {
        font-weight: 600;
        min-width: 100px;
      }
    </style>
  </head>
  <body>
    <div class="pdf-wrapper">

      <!-- ═══════════════════════════ PAGE 1 ═══════════════════════════ -->
      <div class="pdf-page">

        <div class="doc-header">
          <div class="doc-title">
            Undertaking / Self-Declaration for Domestic Content Requirement Fulfilment
          </div>
        </div>

        <!-- Clause 1 -->
        <p class="clause">
          1. This is to certify that M/S <strong>${f.vendor_name}</strong> has installed
          <strong>${f.capacity_kw} KW</strong> Grid Connected Rooftop Solar PV Power Plant for
          <strong>${f.consumer_name}</strong> at <strong>${f.consumer_address}</strong> Under
          application number <strong>${f.application_number}</strong> dated
          <strong>${f.application_date}</strong> under Maharashtra State Electricity Distribution
          Co. Ltd.
        </p>

        <!-- Clause 2 -->
        <p class="clause">
          2. It is hereby undertaken that the PV modules installed for the above-mentioned project
          are domestically manufactured using domestic manufactured solar cells. The details of
          installed PV Modules are as follows:
        </p>

        <ul class="module-list">
          <li>1) <strong>PV Module Capacity:</strong> <strong>${f.pv_module_capacities}</strong></li>
          <li>2) <strong>Number of PV Modules:</strong> <strong>${f.number_of_pv_modules}</strong></li>
          <li>3) <strong>Sr No of PV Module:</strong> <strong>${f.pv_module_serial_numbers}</strong></li>
          <li>4) <strong>PV Module Make:</strong> <strong>${f.pv_module_make}</strong></li>
          <li>5) <strong>Cell manufacturer's name:</strong> <strong>${f.cell_manufacturer_name}</strong></li>
          <li>6) <strong>Cell GST Invoice No:</strong> <strong>${f.cell_gst_invoice_no}</strong></li>
        </ul>

        <!-- Clause 3 -->
        <p class="clause">
          3. The above undertaking is based on the certificate issued by PV Module
          manufacturer/supplier while supplying the above-mentioned order.
        </p>

        <!-- Clause 4 -->
        <p class="clause">
          4. I, on behalf of M/S <strong>${f.vendor_name}</strong> further declare that the
          information given above is true and correct and nothing has been concealed therein. If
          anything is found incorrect at any stage then the due Central Financial Assistance (CFA)
          that I have not charged from the consumer can be withheld and appropriate action may be
          taken against me and my company for wrong declaration. Supporting documents and proof of
          the above information will be provided as and when requested by MNRE.
        </p>

        <!-- Signature block -->
        <div class="sig-block">
          <div class="sig-label">(Signature With Official Seal)</div>
          <div class="sig-stamp">Seal / Stamp</div>

          <div class="for-company">For M/S <strong>${f.vendor_name}</strong></div>

          <div class="sig-detail-row">
            <span class="detail-label">Name:</span>
            <span><strong>${f.signatory_name}</strong></span>
          </div>
          <div class="sig-detail-row">
            <span class="detail-label">Designation:</span>
            <span><strong>${f.signatory_designation}</strong></span>
          </div>
          <div class="sig-detail-row">
            <span class="detail-label">Phone:</span>
            <span><strong>${f.signatory_phone}</strong></span>
          </div>
          <div class="sig-detail-row">
            <span class="detail-label">Email:</span>
            <span><strong>${f.signatory_email}</strong></span>
          </div>
        </div>

      </div><!-- end page 1 -->

    </div><!-- end pdf-wrapper -->
  </body>
</html>`;
}
