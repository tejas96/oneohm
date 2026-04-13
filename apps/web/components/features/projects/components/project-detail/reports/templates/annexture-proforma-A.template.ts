/**
 * Annexure-I & Proforma-A PDF Template
 *
 * Page 1 — Annexure-I: Commissioning Report for RE System (MAHAVITARAN)
 * Page 2 — Proforma-A: Commissioning Report (Provisional) for Grid Connected Solar PV Power Plant
 *
 * HTML is copied verbatim from annexure_proforma_preview.html — zero style or layout changes.
 * Dynamic values are injected via typed template-literal interpolation.
 */

export interface AnnexureProformaFields {
  // Consumer details
  consumer_name: string;
  consumer_number: string;
  mobile_number: string;
  email: string;
  address_of_installation: string;

  // RE system details
  re_arrangement_type: string;
  re_source: string;
  sanctioned_capacity_kw: string;
  capacity_type: string;
  project_model: string;
  re_installed_capacity_rooftop_kw: string;
  re_installed_capacity_rooftop_ground_kw: string;
  re_installed_capacity_ground_kw: string;
  installation_date: string;

  // Solar PV details
  inverter_capacity_kw: string;
  inverter_make: string;
  no_of_pv_modules: string;
  module_capacity_kw: string;

  // Proforma-A specific
  district: string;
  state: string;
  vendor_name: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeAnnexureProformaFields(fields: AnnexureProformaFields): AnnexureProformaFields {
  const sanitized = {} as AnnexureProformaFields;
  for (const key of Object.keys(fields) as Array<keyof AnnexureProformaFields>) {
    sanitized[key] = escapeHtml(fields[key]);
  }
  return sanitized;
}

export function generateAnnexureProformaHtml(fields: AnnexureProformaFields): string {
  const f = sanitizeAnnexureProformaFields(fields);
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Annexure-I &amp; Proforma-A</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
        * { margin: 0; padding: 0; box-sizing: border-box; }
  
        body {
          font-family: 'Inter', Arial, sans-serif;
          font-size: 9pt;
          color: #1a1a1a;
          background: #fff;
        }
  
        .pdf-wrapper {
          width: 210mm;
          margin: 0 auto;
          background: #fff;
        }
  
        .pdf-page {
          width: 210mm;
          padding: 10mm 12mm 10mm 12mm;
          background: #fff;
          page-break-inside: avoid;
          break-inside: avoid;
        }
  
        .pdf-page-break {
          page-break-after: always;
          break-after: page;
        }
  
        /* ── MAHAVITARAN HEADER ── */
        .maha-header {
          display: block;
          text-align: center;
          padding: 10px 16px;
          border: 1px solid #ccc;
          margin-bottom: 0;
        }
  
        .maha-header .title-cell {
          text-align: center;
        }
  
        .maha-header .title-cell .org-name {
          font-size: 12pt;
          font-weight: 700;
          letter-spacing: 4px;
          color: #1a1a1a;
          line-height: 1.6;
        }
  
        /* ── DOC TITLE BLOCK ── */
        .doc-title-block {
          text-align: center;
          margin: 14px 0 10px 0;
        }
  
        .doc-title-block .main-title {
          font-size: 13pt;
          font-weight: 700;
          color: #1a1a1a;
        }
  
        .doc-title-block .sub-title {
          font-size: 11pt;
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 2px;
        }
  
        .doc-title-block .sub-sub-title {
          font-size: 10pt;
          font-weight: 400;
          color: #444;
          margin-top: 2px;
        }
  
        /* ── MAIN TABLE ── */
        table.main-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
        }
  
        table.main-table thead tr {
          background: #1a1a1a;
          color: #fff;
        }
  
        table.main-table thead th {
          padding: 7px 10px;
          font-weight: 600;
          text-align: left;
          border: 1px solid #1a1a1a;
        }
  
        table.main-table thead th:first-child {
          width: 8%;
          text-align: center;
        }
  
        table.main-table thead th:nth-child(2) {
          width: 42%;
        }
  
        table.main-table tbody tr:nth-child(even) { background: #f5f5f5; }
        table.main-table tbody tr:nth-child(odd)  { background: #ffffff; }
  
        table.main-table tbody td {
          padding: 6px 10px;
          border: 1px solid #cccccc;
          vertical-align: top;
          line-height: 1.5;
          page-break-inside: avoid;
          break-inside: avoid;
        }
  
        table.main-table tbody td:first-child {
          text-align: center;
          font-weight: 600;
        }
  
        table.main-table tbody td.label { font-weight: 600; }
  
        table.main-table tbody td.label-sub {
          font-weight: 400;
          color: #444;
          padding-left: 22px;
        }
  
        /* ── SIGNATURE BLOCK ── */
        .sig-bottom {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          page-break-inside: avoid;
          break-inside: avoid;
        }
  
        .sig-bottom .date-block {
          font-size: 10pt;
          font-weight: 600;
          color: #1a1a1a;
        }
  
        .sig-bottom .sig-block {
          text-align: center;
          font-size: 10pt;
        }
  
        .sig-bottom .sig-block .sig-label {
          font-weight: 600;
          color: #1a1a1a;
        }
  
        .sig-bottom .sig-block .sig-name {
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 4px;
        }
  
        /* ── PROFORMA-A ── */
        .proforma-title-block {
          text-align: center;
          margin-bottom: 16px;
        }
  
        .proforma-title-block .p-heading {
          font-size: 11pt;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.5;
        }
  
        .proforma-body {
          font-size: 10pt;
          line-height: 1.8;
          color: #1a1a1a;
          text-align: justify;
          margin-bottom: 32px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
  
        .proforma-sig-row {
          display: flex;
          justify-content: space-between;
          margin-top: 36px;
          gap: 40px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
  
        .proforma-sig-box { flex: 1; }
  
        .proforma-sig-box .sig-line {
          border-top: 1px solid #1a1a1a;
          padding-top: 6px;
          font-size: 10pt;
          font-weight: 600;
          color: #1a1a1a;
        }
  
        .proforma-final {
          margin-top: 32px;
          font-size: 10pt;
          line-height: 1.8;
          color: #1a1a1a;
          text-align: justify;
          page-break-inside: avoid;
          break-inside: avoid;
        }
  
        .proforma-officer-sig {
          margin-top: 36px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
  
        .proforma-officer-sig .sig-line {
          border-top: 1px solid #1a1a1a;
          padding-top: 6px;
          font-size: 10pt;
          font-weight: 600;
          color: #1a1a1a;
          display: inline-block;
          min-width: 200px;
        }
      </style>
    </head>
    <body>
      <div class="pdf-wrapper">
  
        <!-- ═══════════════════════════ PAGE 1 — ANNEXURE-I ═══════════════════════════ -->
        <div class="pdf-page">
  
          <div class="maha-header">
            <div class="title-cell">
              <div class="org-name">Maharashtra State Electricity</div>
              <div class="org-name">Distribution Co. Ltd.</div>
            </div>
          </div>
  
          <div class="doc-title-block">
            <div class="main-title">Renewable Energy Generating System</div>
            <div class="sub-title">Annexure- I</div>
            <div class="sub-sub-title">(Commissioning Report for RE System)</div>
          </div>
  
          <table class="main-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>Particulars</th>
                <th>As commissioned</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td class="label">Name of the Consumer</td>
                <td>${f.consumer_name}</td>
              </tr>
              <tr>
                <td>2</td>
                <td class="label">Consumer Number</td>
                <td>${f.consumer_number}</td>
              </tr>
              <tr>
                <td>3</td>
                <td class="label">Mobile Number</td>
                <td>${f.mobile_number}</td>
              </tr>
              <tr>
                <td>4</td>
                <td class="label">E-mail</td>
                <td>${f.email}</td>
              </tr>
              <tr>
                <td>5</td>
                <td class="label">Address of Installation</td>
                <td>${f.address_of_installation}</td>
              </tr>
              <tr>
                <td>6</td>
                <td class="label">RE Arrangement Type</td>
                <td>${f.re_arrangement_type}</td>
              </tr>
              <tr>
                <td>7</td>
                <td class="label">RE Source</td>
                <td>${f.re_source}</td>
              </tr>
              <tr>
                <td>8</td>
                <td class="label">Sanctioned Capacity(KW)</td>
                <td>${f.sanctioned_capacity_kw}</td>
              </tr>
              <tr>
                <td>9</td>
                <td class="label">Capacity Type</td>
                <td>${f.capacity_type}</td>
              </tr>
              <tr>
                <td>10</td>
                <td class="label">Project Model</td>
                <td>${f.project_model}</td>
              </tr>
              <tr>
                <td>11</td>
                <td class="label">RE installed Capacity(Rooftop)(KW)</td>
                <td>${f.re_installed_capacity_rooftop_kw}</td>
              </tr>
              <tr>
                <td>12</td>
                <td class="label">RE installed Capacity(Rooftop + Ground)(KW)</td>
                <td>${f.re_installed_capacity_rooftop_ground_kw}</td>
              </tr>
              <tr>
                <td>13</td>
                <td class="label">RE installed Capacity(Ground)(KW)</td>
                <td>${f.re_installed_capacity_ground_kw}</td>
              </tr>
              <tr>
                <td>14</td>
                <td class="label">Installation date</td>
                <td>${f.installation_date}</td>
              </tr>
              <tr>
                <td>15</td>
                <td class="label" colspan="2">Solar PV Details</td>
              </tr>
              <tr>
                <td></td>
                <td class="label-sub">Inverter Capacity(KW)</td>
                <td>${f.inverter_capacity_kw}</td>
              </tr>
              <tr>
                <td></td>
                <td class="label-sub">Inverter Make</td>
                <td>${f.inverter_make}</td>
              </tr>
              <tr>
                <td></td>
                <td class="label-sub">No. of PV Modules</td>
                <td>${f.no_of_pv_modules}</td>
              </tr>
              <tr>
                <td></td>
                <td class="label-sub">Module Capacity (KW)</td>
                <td>${f.module_capacity_kw}</td>
              </tr>
            </tbody>
          </table>
  
          <div class="sig-bottom">
            <div class="date-block">Date :- ${f.installation_date}</div>
            <div class="sig-block">
              <div class="sig-label">Signature of Consumer</div>
              <div class="sig-name">${f.consumer_name}</div>
            </div>
          </div>
  
        </div><!-- end page 1 -->
  
        <!-- hard page break — html2pdf cuts exactly here -->
        <div class="pdf-page-break"></div>
  
        <!-- ═══════════════════════════ PAGE 2 — PROFORMA-A ═══════════════════════════ -->
        <div class="pdf-page">
  
          <div class="proforma-title-block">
            <div class="p-heading">Proforma-A</div>
            <div class="p-heading">COMMISSIONING REPORT (PROVISIONAL) FOR GRID CONNECTED SOLAR</div>
            <div class="p-heading">PHOTOVOLTAIC POWER PLANT (with Net-metering facility)</div>
          </div>
  
          <p class="proforma-body">
            Certified that a Grid Connected SPV Power Plant of ${f.re_installed_capacity_rooftop_kw} KWp capacity has been installed at the site ${f.address_of_installation} District ${f.district} of ${f.state} which has been installed by M/S ${f.vendor_name} On ${f.installation_date} The system is as per BIS/MNRE specifications. The system has been checked for its performance and found in order for further commissioning.
          </p>
  
          <div class="proforma-sig-row">
            <div class="proforma-sig-box">
              <div class="sig-line">${f.consumer_name}</div>
              <div style="font-size:9.5pt; margin-top:4px; color:#444;">Signature of the beneficiary</div>
            </div>
            <div class="proforma-sig-box">
              <div class="sig-line">&nbsp;</div>
              <div style="font-size:9.5pt; margin-top:4px; color:#444;">Signature of the agency with name, seal and date</div>
            </div>
          </div>
  
          <p class="proforma-final">
            The above RTS installation has been inspected by me for Pre-Commissioning Testing of Roof Top Solar Connection on date as per guidelines issued by the office of The Chief Engineer vide letter no 21653 on dt. 18.08.2022 and found in order for commissioning.
          </p>
  
          <div class="proforma-officer-sig">
            <div class="sig-line">Signature of the MSEDCL Officer Name,</div>
          </div>
  
        </div><!-- end page 2 -->
  
      </div><!-- end pdf-wrapper -->
    </body>
  </html>`;
}
