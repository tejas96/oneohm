import { generateQuoteHtml } from './quote-pdf.template';
import type { QuotePdfData } from '../types';

describe('generateQuoteHtml', () => {
  const baseData: QuotePdfData = {
    calculation: {
      systemConfig: {
        totalSystemSizeKw: 5,
        dcrSizeKw: 5,
        nonDcrSizeKw: 0,
        phaseType: 'THREE_PHASE',
      },
      panels: [
        {
          productId: 'p1',
          name: 'Tiger Neo 550W',
          brand: 'Jinko',
          description: 'High-efficiency N-type TOPCon Monofacial Panel with 22.02% efficiency.',
          isDcr: true,
          technology: 'TOPCon',
          wattagePerPanel: 550,
          quantity: 10,
          totalWattage: 5500,
          pricePerWatt: 24,
          lineTotal: 132000,
          gstAmount: 15840,
        },
      ],
      inverters: {
        inverters: [
          {
            productId: 'i1',
            name: 'SG5.0RS-ADA',
            brand: 'Sungrow',
            description: '5kW Single-Phase Hybrid Inverter with integrated Arc Fault Protection.',
            capacityKw: 5,
            quantity: 1,
            unitPrice: 45000,
            lineTotal: 45000,
            gstAmount: 5400,
          },
        ],
        totalCapacityKw: 5,
        totalCost: 45000,
        totalGst: 5400,
      },
      structure: {
        productId: 's1',
        name: 'Super Elevated Roof Structure',
        description: 'Heavy duty HDG steel structure with 120kmph wind resistance.',
        structureType: 'SUPER_ELEVATED',
        quantity: 1,
        unitPrice: 15000,
        lineTotal: 15000,
        gstAmount: 2700,
      },
      installation: {
        electricalWork: 5000,
        fixedMaterial: 8000,
        variableFloor: 0,
        structureCost: 15000,
        installationLabor: 4000,
        loadingUnloading: 1000,
        msedclCharges: 5000,
        supervision: 2000,
        transport: 1500,
        totalBeforeTax: 41500,
        gstAmount: 7470,
        totalWithGst: 48970,
      },
      pricing: {
        basePrice: 192000,
        gst5Amount: 16128,
        gst18Amount: 6912,
        totalGst: 23040,
        totalPrice: 215040,
        discountAmount: 0,
        finalPrice: 215040,
      },
      subsidy: {
        isApplicable: true,
        amount: 78000,
      },
      effectivePrice: 137040,
      completionWeeks: 4,
      hasOverrides: false,
      actualTotalWattage: 5500,
      actualSystemSizeKw: 5.5,
      actualDcrSizeKw: 5.5,
      actualNonDcrSizeKw: 0,
      profitabilityPercent: 15,
      profitabilityAmount: 32256,
      calculatedAt: new Date().toISOString(),
    },
    customer: {
      name: 'Sanjay Sharma',
      phone: '+91 98765 43210',
      email: 'sanjay.oneohm@gmail.com',
      address: 'Flat 302, Om Residency, Station Road',
      city: 'Sangli',
      state: 'Maharashtra',
      pincode: '416416',
      consumerNumber: '123456789012',
    },
    property: {
      propertyName: 'Sangli Site',
      address: 'Plot No. 45, Vasantdada Industrial Estate',
      city: 'Sangli',
      state: 'Maharashtra',
      pincode: '416416',
    },
    quoteNumber: 'QT-ONEOHM-2026-0001',
    validityDays: 30,
    gstConfig: { rate1: 12, rate1Percentage: 70, rate2: 18, rate2Percentage: 30 },
  };

  it('renders full property address including street, city, state and PIN code', () => {
    const html = generateQuoteHtml(baseData);
    expect(html).toContain(
      'Plot No. 45, Vasantdada Industrial Estate, Sangli, Maharashtra, PIN:\u00A0416416',
    );
  });

  it('falls back to customer full address if property address is incomplete', () => {
    const dataWithoutPropAddress: QuotePdfData = {
      ...baseData,
      property: { propertyName: 'Site 2' },
    };
    const html = generateQuoteHtml(dataWithoutPropAddress);
    expect(html).toContain(
      'Flat 302, Om Residency, Station Road, Sangli, Maharashtra, PIN:\u00A0416416',
    );
  });

  it('renders product descriptions directly when provided', () => {
    const html = generateQuoteHtml(baseData);
    expect(html).toContain(
      'High-efficiency N-type TOPCon Monofacial Panel with 22.02% efficiency.',
    );
    expect(html).toContain(
      '5kW Single-Phase Hybrid Inverter with integrated Arc Fault Protection.',
    );
    expect(html).toContain('Heavy duty HDG steel structure with 120kmph wind resistance.');
  });

  it('renders customerNotes cleanly when provided', () => {
    const dataWithNotes: QuotePdfData = {
      ...baseData,
      customerNotes:
        '1. Special Note: Customer requested installation completion before Diwali.\n2. Upgrade DC cabling from standard 4 Sq.mm to 10 Sq.mm UV-protected solar grade cable.\n3. Additional earthing pit required near main ACDB panel. <Sanitized & Approved>',
    };
    const html = generateQuoteHtml(dataWithNotes);
    expect(html).toContain('Special Notes &amp; Instructions');
    expect(html).toContain(
      '1. Special Note: Customer requested installation completion before Diwali.\n2. Upgrade DC cabling from standard 4 Sq.mm to 10 Sq.mm UV-protected solar grade cable.\n3. Additional earthing pit required near main ACDB panel. &lt;Sanitized &amp; Approved&gt;',
    );
  });

  it('escapes HTML special characters in customerNotes', () => {
    const dataWithHtml: QuotePdfData = {
      ...baseData,
      customerNotes: 'Note <script>alert("xss")</script> & "special" test',
    };
    const html = generateQuoteHtml(dataWithHtml);
    expect(html).toContain(
      'Note &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;special&quot; test',
    );
    expect(html).not.toContain('<script>');
  });

  it('omits customer notes section when customerNotes is empty or undefined', () => {
    const html = generateQuoteHtml(baseData);
    expect(html).not.toContain('Special Notes &amp; Instructions');
    expect(html).not.toContain('<div class="customer-notes-box">');
  });
});
