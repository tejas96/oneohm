/**
 * Net Metering Connection Agreement (Annexure-3) PDF Template
 *
 * Legal agreement between the Eligible Consumer and MSEDCL (Distribution Licensee)
 * for net-metering arrangement under MERC Net Metering Regulations, 2015.
 *
 * Content is preserved verbatim from the source PDF — only layout and typography
 * have been improved for print quality.
 */

export interface NetMeteringAgreementFields {
  location: string;
  day: string;
  month: string;
  year: string;
  consumer_name: string;
  consumer_address: string;
  consumer_number: string;
  licensee_address: string;
  installed_capacity_wp: string;
  witness_consumer_name: string;
  witness_licensee_name: string;
  signatory_consumer_name: string;
  signatory_licensee_name: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeNetMeteringFields(fields: NetMeteringAgreementFields): NetMeteringAgreementFields {
  const sanitized = {} as NetMeteringAgreementFields;
  for (const key of Object.keys(fields) as Array<keyof NetMeteringAgreementFields>) {
    sanitized[key] = escapeHtml(fields[key]);
  }
  return sanitized;
}

export function generateNetMeteringAgreementHtml(fields: NetMeteringAgreementFields): string {
  const f = sanitizeNetMeteringFields(fields);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Net Metering Connection Agreement – Annexure 3</title>
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
       * Single wrapper targeted by html2pdf. Pages sit inside it separated
       * by explicit .pdf-page-break elements so html2pdf never bitmap-slices
       * mid-sentence.
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

      .pdf-page-break {
        page-break-after: always;
        break-after: page;
      }

      /* ── HEADER ── */
      .doc-header {
        text-align: center;
        padding-bottom: 8px;
        margin-bottom: 12px;
        border-bottom: 2px solid #1a1a1a;
      }

      .doc-header .annexure-label {
        font-size: 9pt;
        font-weight: 600;
        color: #555;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .doc-header .doc-title {
        font-size: 12pt;
        font-weight: 700;
        color: #1a1a1a;
      }

      /* ── BODY TEXT ── */
      .clause-block {
        font-size: 9pt;
        line-height: 1.65;
        color: #1a1a1a;
        text-align: justify;
        margin-bottom: 9px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .clause-block strong {
        font-weight: 700;
        color: #1a1a1a;
      }

      /* ── SECTION HEADINGS ── */
      .clause-heading {
        font-size: 9pt;
        font-weight: 700;
        color: #1a1a1a;
        margin-top: 10px;
        margin-bottom: 4px;
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: avoid;
        break-after: avoid;
      }

      .sub-clause {
        font-size: 9pt;
        line-height: 1.65;
        color: #1a1a1a;
        text-align: justify;
        margin-bottom: 7px;
        padding-left: 14px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .sub-clause strong {
        font-weight: 700;
      }

      /* ── "AND" SEPARATOR ── */
      .and-separator {
        font-size: 9.5pt;
        font-weight: 700;
        text-align: center;
        margin: 10px 0;
        letter-spacing: 1px;
      }

      /* ── WHEREAS / RECITAL ── */
      .recital-block {
        font-size: 9pt;
        line-height: 1.65;
        color: #1a1a1a;
        text-align: justify;
        margin-bottom: 9px;
        padding-left: 0;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .recital-block strong {
        font-weight: 700;
      }

      /* ── SIGNATORY TABLE ── */
      .sig-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-size: 9pt;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .sig-table td {
        width: 50%;
        padding: 6px 4px;
        vertical-align: top;
      }

      .sig-line {
        border-top: 1px solid #1a1a1a;
        padding-top: 5px;
        font-weight: 600;
        font-size: 8.5pt;
        color: #1a1a1a;
        margin-top: 28px;
      }

      .witness-label {
        font-size: 8.5pt;
        color: #444;
        margin-top: 6px;
      }
    </style>
  </head>
  <body>
    <div class="pdf-wrapper">

      <!-- ═══════════════════════════ PAGE 1 ═══════════════════════════ -->
      <div class="pdf-page">

        <div class="doc-header">
          <div class="annexure-label">ANNEXURE – 3</div>
          <div class="doc-title">Net Metering Connection Agreement</div>
        </div>

        <p class="clause-block">
          This Agreement is made and entered into at <strong>${f.location}</strong> on this
          <strong>${f.day}</strong> day of <strong>${f.month}</strong> <strong>${f.year}</strong>
          between the Eligible Consumer <strong>${f.consumer_name}</strong> having premises at
          <strong>${f.consumer_address}</strong> and Consumer No. <strong>${f.consumer_number}</strong>
          as the first Party,
        </p>

        <p class="and-separator">AND</p>

        <p class="clause-block">
          The Distribution Licensee Maharashtra State Electricity Distribution Co. Ltd (hereinafter
          referred to as 'the Licensee') and having its Registered Office at
          <strong>${f.licensee_address}</strong> as second Party of this Agreement;
        </p>

        <p class="recital-block">
          Whereas, the Eligible Consumer has applied to the Licensee for approval of a Net Metering
          Arrangement under the provisions of the Maharashtra Electricity Regulatory Commission (Net
          Metering for Roof-top Solar Photo Voltaic Systems) Regulations, 2015 ('the Net Metering
          Regulations') and subsequent amendments and sought its connectivity to the Licensee's
          Distribution Network;
        </p>

        <p class="recital-block">
          And whereas, the Licensee has agreed to provide Network connectivity to the Eligible Consumer
          for injection of electricity generated from its Roof-top Solar PV System of
          <strong>${f.installed_capacity_wp}Wp</strong>; Both Parties hereby agree as follows:–
        </p>

        <p class="clause-heading">1. Eligibility:</p>
        <p class="clause-block">
          The Roof-top Solar PV System meets the applicable norms for being integrated into the
          Distribution Network, and that the Eligible Consumer shall maintain the System accordingly
          for the duration of this Agreement.
        </p>

        <p class="clause-heading">2. Technical and Inter-connection Requirements:</p>
        <p class="sub-clause">
          2.1. The metering arrangement and the inter-connection of the Roof-top Solar PV System with
          the Network of the Licensee shall be as per the provisions of the Net Metering Regulations
          and the technical standards and norms specified by the Central Electricity Authority for
          connectivity of distributed generation resources and for the installation and operation of
          meters.
        </p>
        <p class="sub-clause">
          2.2. The Eligible Consumer agrees, that he shall install, prior to connection of the
          Roof-top Solar PV System to the Network of the Licensee, an isolation device (both automatic
          and in built within inverter and external manual relays); and the Licensee shall have access
          to it if required for the repair and maintenance of the Distribution Network.
        </p>
        <p class="sub-clause">
          2.3. The Licensee shall specify the interface/inter-connection point and metering point.
        </p>
        <p class="sub-clause">
          2.4. The Eligible Consumer shall furnish all relevant data, such as voltage, frequency,
          circuit breaker, isolator position in his System, as and when required by the Licensee.
        </p>

      </div><!-- end page 1 -->

      <!-- hard page break — html2pdf cuts exactly here -->
      <div class="pdf-page-break"></div>

      <!-- ═══════════════════════════ PAGE 2 ═══════════════════════════ -->
      <div class="pdf-page">

        <p class="clause-heading">3. Safety:</p>
        <p class="sub-clause">
          3.1 The equipment connected to the Licensee's Distribution System shall be compliant with
          relevant International (IEEE/IEC) or Indian Standards (BIS), as the case may be, and the
          installation of electrical equipment shall comply with the requirements specified by the
          Central Electricity Authority regarding safety and electricity supply.
        </p>
        <p class="sub-clause">
          3.2 The design, installation, maintenance and operation of the Roof-top Solar PV System
          shall be undertaken in a manner conducive to the safety of the Roof-top Solar PV System as
          well as the Licensee's Network.
        </p>
        <p class="sub-clause">
          3.3 If, at any time, the Licensee determines that the Eligible Consumer's Roof-top Solar PV
          System is causing or may cause damage to and/or results in the Licensee's other consumers or
          its assets, the Eligible Consumer shall disconnect the Roof-top Solar PV System from the
          distribution Network upon direction from the Licensee, and shall undertake corrective
          measures at his own expense prior to re-connection.
        </p>
        <p class="sub-clause">
          3.4 The Licensee shall not be responsible for any accident resulting in injury to human
          beings or animals or damage to property that may occur due to back-feeding from the Roof-top
          Solar PV System when the grid supply is off. The Licensee may disconnect the installation at
          any time in the event of such exigencies to prevent such accident.
        </p>

        <p class="clause-heading">4. Other Clearances and Approvals:</p>
        <p class="clause-block">
          The Eligible Consumer shall obtain any statutory approvals and clearances that may be
          required, such as from the Electrical Inspector or the municipal or other authorities,
          before connecting the Roof-top Solar PV System to the distribution Network.
        </p>

        <p class="clause-heading">5. Period of Agreement, and Termination:</p>
        <p class="clause-block">
          This Agreement shall be for a period for 20 years, but may be terminated prematurely (a) By
          mutual consent; or (b) By the Eligible Consumer, by giving 30 days' notice to the Licensee;
          (c) By the Licensee, by giving 30 days' notice, if the Eligible Consumer breaches any terms
          of this Agreement or the provisions of the Net Metering Regulations and does not remedy such
          breach within 30 days, or such other reasonable period as may be provided, of receiving
          notice of such breach, or for any other valid reason communicated by the Licensee in
          writing.
        </p>

        <p class="clause-heading">6. Access and Disconnection:</p>
        <p class="sub-clause">
          6.1. The Eligible Consumer shall provide access to the Licensee to the metering equipment
          and disconnecting devices of Roof-top Solar PV System, both automatic and manual, by the
          Eligible Consumer.
        </p>
        <p class="sub-clause">
          6.2. If, in an emergent or outage situation, the Licensee cannot access the disconnecting
          devices of the Roof-top Solar PV System, both automatic and manual, it may disconnect power
          supply to the premises.
        </p>
        <p class="sub-clause">
          6.3 Upon termination of this Agreement under Clause 5, the Eligible Consumer shall
          disconnect the Roof-top Solar PV System forthwith from the Network of the Licensee.
        </p>

      </div><!-- end page 2 -->

      <!-- hard page break — html2pdf cuts exactly here -->
      <div class="pdf-page-break"></div>

      <!-- ═══════════════════════════ PAGE 3 ═══════════════════════════ -->
      <div class="pdf-page">

        <p class="clause-heading">7. Liabilities:</p>
        <p class="sub-clause">
          7.1. The Parties shall indemnify each other for damages or adverse effects of either Party's
          negligence or misconduct during the installation of the Roof-top Solar PV System,
          connectivity with the distribution Network and operation of the System.
        </p>
        <p class="sub-clause">
          7.2. The Parties shall not be liable to each other for any loss of profits or revenues,
          business interruption losses, loss of contract or goodwill, or for indirect, consequential,
          incidental or special damages including, but not limited to, punitive or exemplary damages,
          whether any of these liabilities, losses or damages arise in contract, or otherwise.
        </p>

        <p class="clause-heading">8. Commercial Settlement:</p>
        <p class="sub-clause">
          8.1. The commercial settlements under this Agreement shall be in accordance with the Net
          Metering Regulations.
        </p>
        <p class="sub-clause">
          8.2. The Licensee shall not be liable to compensate the Eligible Consumer if his Rooftop
          Solar PV System is unable to inject surplus power generated into the Licensee's Network on
          account of failure of power supply in the grid/Network.
        </p>
        <p class="sub-clause">
          8.3. The existing metering System, if not in accordance with the Net Metering Regulations,
          shall be replaced by a bi-directional meter (whole current/CT operated) or a pair of meters
          (as per the definition of 'Net Meter' in the Regulations), and a separate generation meter
          may be provided to measure Solar power generation. The bi-directional meter (whole
          current/CT operated) or pair of meters shall be installed at the inter-connection point to
          the Licensee's Network for recording export and import of energy.
        </p>
        <p class="sub-clause">
          8.4. The uni-directional and bi-directional or pair of meters shall be fixed in separate
          meter boxes in the same proximity.
        </p>
        <p class="sub-clause">
          8.5. The Licensee shall issue monthly electricity bill for the net metered energy on the
          scheduled date of meter reading. If the exported energy exceeds the imported energy, the
          Licensee shall show the net energy exported as credited Units of electricity as specified in
          the Net Metering Regulations, 2015. If the exported energy is less than the imported energy,
          the Eligible Consumer shall pay the Distribution Licensee for the net energy imported at the
          prevailing tariff approved by the Commission for the consumer category to which he belongs.
        </p>

        <p class="clause-heading">9. Connection Costs:</p>
        <p class="clause-block">
          The Eligible Consumer shall bear all costs related to the setting up of the Roof-top Solar
          PV System, excluding the Net Metering Arrangement costs.
        </p>

        <p class="clause-heading">10. Dispute Resolution:</p>
        <p class="sub-clause">
          10.1 Any dispute arising under this Agreement shall be resolved promptly, in good faith and
          in an equitable manner by both the Parties.
        </p>
        <p class="sub-clause">
          10.2 The Eligible Consumer shall have recourse to the concerned Consumer Grievance Redressal
          Forum constituted under the relevant Regulations in respect of any grievance regarding
          billing which has not been redressed by the Licensee.
        </p>

        <p class="clause-block" style="margin-top: 14px;">
          In the witness where of <strong>${f.witness_consumer_name}</strong> for and on behalf of
          Eligible Consumer and Shri. <strong>${f.witness_licensee_name}</strong> for and on behalf of
          MSEDCL agree to this agreement.
        </p>

        <table class="sig-table">
          <tbody>
            <tr>
              <td>
                <div class="sig-line">Shri. <strong>${f.signatory_consumer_name}</strong></div>
                <div class="witness-label">for and on behalf of Eligible Consumer</div>
              </td>
              <td>
                <div class="sig-line">Shri. <strong>${f.signatory_licensee_name}</strong></div>
                <div class="witness-label">for and on behalf of MSEDCL</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="sig-line">&nbsp;</div>
                <div class="witness-label">for and on behalf of Eligible Consumer</div>
              </td>
              <td>
                <div class="sig-line">&nbsp;</div>
                <div class="witness-label">for and on behalf of MSEDCL</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="witness-label" style="margin-top: 14px;">Witness 1: ___________________</div>
                <div class="witness-label">Witness 2: ___________________</div>
              </td>
              <td>
                <div class="witness-label" style="margin-top: 14px;">Witness 1: ___________________</div>
                <div class="witness-label">Witness 2: ___________________</div>
              </td>
            </tr>
          </tbody>
        </table>

      </div><!-- end page 3 -->

    </div><!-- end pdf-wrapper -->
  </body>
</html>`;
}
