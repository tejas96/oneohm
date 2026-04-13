/**
 * WCR (Work Completion Report) PDF Template
 *
 * HTML is copied verbatim from wcr.html — zero style or layout changes.
 * Dynamic values are injected via typed template-literal interpolation.
 */

export interface WcrFields {
  vendor_name: string;
  consumer_name: string;
  consumer_number: string;
  site_address: string;
  category: string;
  sanction_number: string;
  sanctioned_capacity_kw: string;
  installed_capacity_kw: string;
  module_make: string;
  module_model_number: string;
  module_wattage: string;
  module_count: string;
  total_capacity_kwp: string;
  module_warranty: string;
  inverter_make_model: string;
  inverter_rating: string;
  charge_controller_type: string;
  inverter_capacity: string;
  inverter_hpd: string;
  inverter_year_of_manufacturing: string;
  earthing_details: string;
  lightning_arrester_text: string;
  cmc_period_years: string;
  consumer_id_type: string;
  consumer_aadhaar_number: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeWcrFields(fields: WcrFields): WcrFields {
  const sanitized = {} as WcrFields;
  for (const key of Object.keys(fields) as Array<keyof WcrFields>) {
    sanitized[key] = escapeHtml(fields[key]);
  }
  return sanitized;
}

export function generateWcrHtml(fields: WcrFields): string {
  const f = sanitizeWcrFields(fields);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Work Completion Report for Solar Power Plant</title>
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
       * Single wrapper that html2pdf targets. Two logical pages sit inside it.
       * The first page ends with a hard page-break marker so html2pdf slices at
       * exactly that point — no mechanical bitmap-slicing, no split letters.
       */
      .pdf-wrapper {
        width: 210mm;
        margin: 0 auto;
        background: #fff;
      }

      .pdf-page {
        width: 210mm;
        padding: 10mm 12mm 10mm 12mm;
        background: #fff;
        /* keep all content of each logical page together */
        page-break-inside: avoid;
        break-inside: avoid;
      }

      /* hard break between page 1 and page 2 */
      .pdf-page-break {
        page-break-after: always;
        break-after: page;
      }

      /* ── HEADER ── */
      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding-bottom: 6px;
        margin-bottom: 9px;
        border-bottom: 2px solid #1a1a1a;
      }

      .header .company-name {
        font-size: 10.5pt;
        font-weight: 700;
        color: #1a1a1a;
      }

      .header .doc-title {
        font-size: 10.5pt;
        font-weight: 700;
        color: #1a1a1a;
        text-align: right;
      }

      /* ── TABLE ── */
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8.5pt;
      }

      thead tr {
        background-color: #1a1a1a;
        color: #ffffff;
      }

      thead th {
        padding: 5px 7px;
        font-weight: 600;
        font-size: 8.5pt;
        text-align: left;
        border: 1px solid #1a1a1a;
      }

      thead th:first-child {
        width: 7%;
        text-align: center;
      }

      thead th:nth-child(2) {
        width: 38%;
      }

      tbody tr {
        background: #ffffff;
        /* prevent any single row from splitting across pages */
        page-break-inside: avoid;
        break-inside: avoid;
      }

      tbody tr:nth-child(even) {
        background: #f5f5f5;
      }

      tbody td {
        padding: 4px 7px;
        border: 1px solid #cccccc;
        vertical-align: top;
        line-height: 1.45;
      }

      tbody td:first-child {
        text-align: center;
        font-weight: 600;
        color: #1a1a1a;
      }

      tbody td.label {
        font-weight: 600;
        color: #1a1a1a;
      }

      tbody td.label-sub {
        font-weight: 400;
        color: #444444;
        padding-left: 18px;
      }

      tbody td.no {
        color: #888;
      }

      /* ── PARAGRAPHS BELOW TABLE ── */
      .text-block {
        font-size: 8.5pt;
        line-height: 1.5;
        color: #1a1a1a;
        margin-top: 7px;
        text-align: justify;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .text-block strong {
        font-weight: 700;
        color: #1a1a1a;
      }

      /* ── SIGNATURE ROW ── */
      .sig-row {
        display: flex;
        justify-content: space-between;
        margin-top: 16px;
        gap: 40px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .sig-box {
        flex: 1;
      }

      .sig-box .sig-line {
        border-top: 1px solid #1a1a1a;
        padding-top: 5px;
        font-size: 8.5pt;
        font-weight: 600;
        color: #1a1a1a;
      }

      /* ── GUARANTEE PAGE ── */
      .guarantee-heading {
        font-size: 10.5pt;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 12px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .guarantee-text {
        font-size: 9pt;
        line-height: 1.65;
        color: #1a1a1a;
        text-align: justify;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .guarantee-text strong {
        font-weight: 700;
        color: #1a1a1a;
      }

      .identity-block {
        margin-top: 24px;
        font-size: 9pt;
        line-height: 1.9;
        color: #1a1a1a;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .identity-block strong {
        font-weight: 700;
        color: #1a1a1a;
      }
    </style>
  </head>
  <body>
    <div class="pdf-wrapper">

      <!-- ═══════════════════════════ PAGE 1 ═══════════════════════════ -->
      <div class="pdf-page">

        <div class="header">
          <div class="company-name">${f.vendor_name}</div>
          <div class="doc-title">Work Completion Report for Solar Power Plant</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Component</th>
              <th>Observation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td class="label">Name</td>
              <td><strong>${f.consumer_name}</strong></td>
            </tr>

            <tr>
              <td>2</td>
              <td class="label">Consumer number</td>
              <td><strong>${f.consumer_number}</strong></td>
            </tr>

            <tr>
              <td>3</td>
              <td class="label">Site/Location With Complete Address</td>
              <td><strong>${f.site_address}</strong></td>
            </tr>

            <tr>
              <td>4</td>
              <td class="label">Category: Govt/Private Sector</td>
              <td><strong>${f.category}</strong></td>
            </tr>

            <tr>
              <td>5</td>
              <td class="label">Sanction number</td>
              <td><strong>${f.sanction_number}</strong></td>
            </tr>

            <tr>
              <td>6</td>
              <td class="label">Sanctioned Capacity of solar PV system (KW)</td>
              <td><strong>${f.sanctioned_capacity_kw}</strong></td>
            </tr>

            <tr>
              <td class="no"></td>
              <td class="label">Installed Capacity of solar PV system (KW)</td>
              <td><strong>${f.installed_capacity_kw}</strong></td>
            </tr>

            <tr>
              <td>7</td>
              <td class="label" colspan="2">Specification of the Modules</td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Make of Module</td>
              <td><strong>${f.module_make}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">ALMM Model Number</td>
              <td><strong>${f.module_model_number}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Wattage per module</td>
              <td><strong>${f.module_wattage}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">No. of Module</td>
              <td><strong>${f.module_count}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Total Capacity (KWP)</td>
              <td><strong>${f.total_capacity_kwp}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Warrantee Details (Product + Performance)</td>
              <td><strong>${f.module_warranty}</strong></td>
            </tr>

            <tr>
              <td>8</td>
              <td class="label" colspan="2">PCU</td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Make &amp; Model number of Inverter</td>
              <td><strong>${f.inverter_make_model}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Rating</td>
              <td><strong>${f.inverter_rating}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Type of charge controller/ MPPT</td>
              <td><strong>${f.charge_controller_type}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Capacity of Inverter</td>
              <td><strong>${f.inverter_capacity}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">HPD</td>
              <td><strong>${f.inverter_hpd}</strong></td>
            </tr>
            <tr>
              <td class="no"></td>
              <td class="label-sub">Year of manufacturing</td>
              <td><strong>${f.inverter_year_of_manufacturing}</strong></td>
            </tr>

            <tr>
              <td>9</td>
              <td class="label">No of Separate Earthings with earth Resistance</td>
              <td><strong>${f.earthing_details}</strong></td>
            </tr>
          </tbody>
        </table>

        <p class="text-block">
          It is certified that the Earth Resistance measure in presence of Licensed Electrical
          Contractor/Supervisor and found in order i.e. &lt; 5 Ohms as per MNRE OM Dtd. 07.06.24
          for CFA Component.
        </p>

        <p class="text-block"><strong>${f.lightning_arrester_text}</strong></p>

        <p class="text-block">
          We <strong>${f.vendor_name}</strong> &amp; <strong>${f.consumer_name}</strong> Consumer
          Number <strong>${f.consumer_number}</strong> Ensured structural stability of installed
          solar power plant and obtained requisite permissions from the concerned authority.
        </p>

        <p class="text-block">
          If in future, by virtue of any means due to collapsing or damage to installed solar power
          plant, MSEDCL will not be held responsible for any loss to property or human life, if any.
        </p>

        <p class="text-block">
          This is to Certified above Installed Solar PV System is working properly with electrical
          safety &amp; Islanding switch in case of any presence of backup inverter an arrangement
          should be made in such way the backup inverter supply should never be synchronized with
          solar inverter to avoid any electrical accident due to back feeding. We will be held
          responsible for non-working of islanding mechanism and back feed to the de-energized grid.
        </p>

        <div class="sig-row">
          <div class="sig-box">
            <div class="sig-line">Signature [Vendor]</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Signature [Consumer]</div>
          </div>
        </div>

      </div><!-- end page 1 -->

      <!-- hard page break — html2pdf cuts exactly here -->
      <div class="pdf-page-break"></div>

      <!-- ═══════════════════════════ PAGE 2 ═══════════════════════════ -->
      <div class="pdf-page">

        <div class="header">
          <div class="company-name">${f.vendor_name}</div>
        </div>

        <p class="guarantee-heading">Guarantee Certificate Undertaking to be submitted by VENDOR</p>

        <p class="guarantee-text">
          The undersigned will provide the services to the consumers for repairs/maintenance of the
          RTS plant free of cost for <strong>${f.cmc_period_years} years</strong> of the
          comprehensive Maintenance Contract (CMC) period from the date of commissioning of the
          plant. Non performing/under-performing system component will be replaced/repaired free of
          cost in the CMC period.
        </p>

        <div class="sig-row" style="margin-top: 40px">
          <div class="sig-box" style="max-width: 200px">
            <div class="sig-line">Signature [Vendor]</div>
            <div style="font-size: 9pt; margin-top: 6px; color: #444">Stamp &amp; Seal</div>
          </div>
        </div>

        <div class="identity-block">
          <div>Identity Details of Consumer: &nbsp;<strong>${f.consumer_id_type}</strong></div>
          <div>Aadhar Number: &nbsp;<strong>${f.consumer_aadhaar_number}</strong></div>
        </div>

      </div><!-- end page 2 -->

    </div><!-- end pdf-wrapper -->
  </body>
</html>`;
}
