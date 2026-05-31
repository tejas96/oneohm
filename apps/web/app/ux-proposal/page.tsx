'use client';

import {
  Leaf,
  PiggyBank,
  Calendar,
  MapPin,
  User,
  TrendingUp,
  Download,
  Share2,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import React from 'react';

/**
 * Solar Proposal UX Redesign Mockup
 * Aligned with OneOhm's V2 White Light Design System.
 * Pre-populated with the exact database details, actual pricing breakdown items,
 * product equipment assets, and property version selection from quote 0a5b1774-7177-4e8d-a1b0-a1a5cc125ed8.
 */
export default function UXProposalMockup(): React.JSX.Element {
  // DB-aligned values for Quote QT-ONEOHM_EPC-2026-0309
  const systemSizeKw = 7.0;
  const totalWattageWp = 7020;
  const systemTypeLabel = 'On Grid';
  const projectTypeLabel = 'Commercial';

  // Real pricing & billing snapshots from quote_versions database
  const basePrice = 342317.05;
  const discountAmount = 2000.0;
  const discountedBasePrice = 340317.05;
  const equipmentGst = 11911.1; // GST 5%
  const servicesGst = 18377.12; // GST 18%
  const totalGst = 30288.22;
  const totalPriceGstIncl = 370605.27; // Final Price

  // Exact installation sub-breakdowns from database JSON
  const installationSubbreakdown = {
    transport: 1750.0,
    fixedMaterial: 17807.0,
    msedclCharges: 2000.0,
    electricalWork: 7200.0,
    loadingUnloading: 2000.0,
    installationLabor: 9000.0,
    variableFloor: 13265.0,
    totalBeforeTax: 53022.0,
    gstAmount: 9543.96,
    totalWithGst: 62565.96,
  };

  // Exact Equipment listings from database
  const equipmentPanels = [
    {
      name: 'Adani Solar Panel PERC DCR 530-550Wp',
      qty: 13,
      wattage: 540,
      type: 'DCR Panels',
      lineTotal: 180765.0,
    },
  ];
  const equipmentInverters = [
    { name: 'SolarEdge 5KW 1-Phase On-Grid Inverter', qty: 2, capacity: '5kW', lineTotal: 58000.0 },
  ];
  const equipmentStructure = {
    name: 'Aluminum Rail Mount',
    type: 'aluminum_rail',
    qty: 1,
    lineTotal: 5880.0,
  };

  // Real payment milestones from DB entry
  const milestones = [
    {
      name: 'Advance',
      percentage: 10,
      amount: 37060.53,
      stage: 'advance',
      description: 'To be paid upon order confirmation',
    },
    {
      name: 'Installation Complete',
      percentage: 85,
      amount: 315014.48,
      stage: 'installation_complete',
      description: 'To be paid upon installation completion',
    },
    {
      name: 'Commissioning',
      percentage: 5,
      amount: 18530.26,
      stage: 'commissioning',
      description: 'To be paid after commissioning and net metering',
    },
  ];

  // Environmental impact calculations based on 7.02kW actual capacity size
  const monthlySavingsEst = Math.round(7.02 * 125 * 7.5);
  const annualCO2Reduction = (7.02 * 1500 * 0.82) / 1000;
  const lifetimeTreesEquivalent = Math.round(annualCO2Reduction * 25 * 45);

  return (
    <div className="min-h-screen bg-background-secondary text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary-dark">
      {/* V2 Header with full Quote Metadata & Action items matching real view */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white border-b border-border px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xs font-mono uppercase tracking-wider text-foreground-tertiary">
              Quotes
            </span>
            <span className="text-2xs text-foreground-muted">/</span>
            <span className="text-2xs font-mono font-semibold text-foreground-secondary">
              QT-ONEOHM_EPC-2026-0309
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              QT-ONEOHM_EPC-2026-0309
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-success/10 text-success border border-success/20">
              Accepted
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              Current Version
            </span>
          </div>

          <p className="text-[10px] text-foreground-tertiary flex items-center gap-1.5 flex-wrap">
            <span>Created: 24 May 2026</span>
            <span>·</span>
            <span>Valid Until: 23 June 2026</span>
            <span>·</span>
            <span className="flex items-center gap-0.5 font-medium">
              <User className="h-3 w-3 text-foreground-muted" /> Representative: Tejas Patil
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark shadow-sm transition-all">
            <Briefcase className="h-3.5 w-3.5" /> Convert to Project
          </button>

          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-border hover:bg-background-secondary text-foreground-secondary transition-all">
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>

          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-border hover:bg-background-secondary text-foreground-secondary transition-all">
            <Share2 className="h-3.5 w-3.5" /> Share Quote
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Detailed Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real Property quotes version dropdown selector */}
          <div className="bg-white border border-border rounded-xl p-4.5 flex items-center gap-3 flex-wrap shadow-sm">
            <span className="text-xs font-bold text-foreground">Property Quotes:</span>
            <div className="relative min-w-[260px]">
              <select className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-foreground-secondary font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
                <option value="current">QT-ONEOHM_EPC-2026-0309 (Current Version)</option>
                <option value="v1">QT-ONEOHM_EPC-2026-0300 (Historical)</option>
              </select>
              <div className="absolute right-3 top-2.5 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-foreground-secondary pointer-events-none" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-primary/10 text-primary-dark border border-primary/20">
              Current Active Version
            </span>
          </div>

          {/* V2 Hero Gradient Welcome Card */}
          <div className="hero-gradient border border-border rounded-xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute right-0 top-0 w-1/4 h-full bg-radial-gradient from-primary/5 to-transparent pointer-events-none" />

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary-dark rounded-full text-[10px] font-semibold border border-primary/20 mb-3">
              <Sparkles className="h-3 w-3" /> Customized Solution Recommended
            </div>

            <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
              Clean Energy Engineered for Commercial Efficiency
            </h2>
            <p className="text-foreground-secondary text-sm leading-relaxed max-w-xl">
              Based on your site survey, we have configured a high-performance commercial-grade{' '}
              <span className="text-primary-dark font-bold">{systemSizeKw}kW</span> solar generation
              array. This setup is specifically engineered to power your active business
              infrastructure, offset commercial utility tariffs, and maximize long-term business
              energy savings.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-background-tertiary rounded-lg text-foreground-secondary border border-border">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-semibold">
                    Client Name
                  </span>
                  <p className="text-xs font-semibold text-foreground-secondary">Sanjay Patil</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-background-tertiary rounded-lg text-foreground-secondary border border-border">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-semibold">
                    Project Location
                  </span>
                  <p className="text-xs font-semibold text-foreground-secondary truncate max-w-[160px]">
                    Kothrud, Pune Maharashtra
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-background-tertiary rounded-lg text-foreground-secondary border border-border">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-semibold">
                    Proposal Expiry
                  </span>
                  <p className="text-xs font-semibold text-foreground-secondary">23 June 2026</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Configuration Board */}
          <div className="bg-white border border-border rounded-xl p-5.5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
              ⚡ System Configuration
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  System Size
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">7.02 kW</p>
              </div>

              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  Total Wattage
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">{totalWattageWp} Wp</p>
              </div>

              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  System Type
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">{systemTypeLabel}</p>
              </div>

              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  Project Type
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">{projectTypeLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  Phase Type
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">Single Phase</p>
              </div>

              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  Structure Type
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">Aluminum Rail</p>
              </div>

              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  DCR Preference
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">Auto Split</p>
              </div>

              <div className="bg-background-secondary p-3 rounded-lg border border-border">
                <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block">
                  Distance
                </span>
                <p className="text-xs font-bold text-foreground mt-0.5">50 km</p>
              </div>
            </div>
          </div>

          {/* Original Equipment Details lists */}
          <div className="bg-white border border-border rounded-xl p-5.5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground">📦 Equipment Details</h3>

            {/* Panels Section */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block mb-2">
                Solar Panels
              </span>
              <span className="text-[10px] text-foreground-muted font-medium uppercase tracking-wider block mb-1">
                DCR Panels
              </span>
              {equipmentPanels.map((panel, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-start gap-4 py-1.5 border-b border-border/40 last:border-b-0"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{panel.name}</h4>
                    <p className="text-[10px] text-foreground-tertiary mt-0.5">
                      {panel.wattage}W · Qty: {panel.qty} · 12yr warranty
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-foreground-secondary">
                    ₹{panel.lineTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Inverters Section */}
            <div className="pt-3 border-t border-border/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block mb-2">
                Inverters
              </span>
              {equipmentInverters.map((inv, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-start gap-4 py-1.5 border-b border-border/40 last:border-b-0"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{inv.name}</h4>
                    <p className="text-[10px] text-foreground-tertiary mt-0.5">
                      {inv.capacity} · Qty: {inv.qty} · 8yr warranty
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-foreground-secondary">
                    ₹{inv.lineTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Structure Section */}
            <div className="pt-3 border-t border-border/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-tertiary block mb-2">
                Structure
              </span>
              <div className="flex justify-between items-start gap-4 py-1.5">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    {equipmentStructure.name}
                  </h4>
                  <p className="text-[10px] text-foreground-tertiary mt-0.5">
                    Type: {equipmentStructure.type.replace(/_/g, ' ')} · Qty:{' '}
                    {equipmentStructure.qty}
                  </p>
                </div>
                <span className="text-xs font-semibold text-foreground-secondary">
                  ₹{equipmentStructure.lineTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Environmental Savings Board */}
          <div className="bg-white border border-border rounded-xl p-5.5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
              🌍 Sustainability & Utility Savings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-background-secondary p-4 rounded-lg border border-border flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Leaf className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-[10px] text-foreground-tertiary font-bold uppercase tracking-wider">
                    Carbon Offset
                  </h4>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {annualCO2Reduction.toFixed(2)} Tons / Yr
                  </p>
                  <p className="text-[9px] text-foreground-secondary mt-1">
                    Equivalent to planting {lifetimeTreesEquivalent} trees
                  </p>
                </div>
              </div>

              <div className="bg-background-secondary p-4 rounded-lg border border-border flex items-start gap-3">
                <div className="p-2 bg-primary/10 text-primary-dark rounded-lg">
                  <PiggyBank className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-[10px] text-foreground-tertiary font-bold uppercase tracking-wider">
                    Monthly Utility Saved
                  </h4>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    ₹{monthlySavingsEst.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[9px] text-foreground-secondary mt-1">
                    Expected payback in ~4.5 years
                  </p>
                </div>
              </div>

              <div className="bg-background-secondary p-4 rounded-lg border border-border flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-[10px] text-foreground-tertiary font-bold uppercase tracking-wider">
                    Generation Est.
                  </h4>
                  <p className="text-base font-bold text-foreground mt-0.5">877 kWh / Month</p>
                  <p className="text-[9px] text-foreground-secondary mt-1">
                    Average Discom active offset yield
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Milestone Timeline */}
          <div className="bg-white border border-border rounded-xl p-5.5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4">
              💳 Progress Payment Milestones
            </h3>

            <div className="relative border-l border-border ml-3.5 space-y-5 pt-1">
              {milestones.map((milestone, idx) => (
                <div key={milestone.stage} className="relative pl-6">
                  <div
                    className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ${
                      idx === 0 ? 'bg-primary ring-4 ring-primary/10' : 'bg-border'
                    }`}
                  />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{milestone.name}</h4>
                      <p className="text-[10px] text-foreground-tertiary mt-0.5">
                        {milestone.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-primary-dark bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 font-medium">
                        {milestone.percentage}% Milestone
                      </span>
                      <p className="text-xs font-bold text-foreground-secondary mt-1">
                        ₹{milestone.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Visual Pricing Card with Full Itemized Installation Breakdown */}
        <div className="space-y-6">
          {/* Investment summary card with complete pricing itemizations */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
              Investment Breakdown
            </h3>

            <div className="space-y-3 text-xs text-foreground-secondary">
              <div className="flex items-center justify-between">
                <span>Base Quote Pricing</span>
                <span className="font-semibold text-foreground">
                  ₹{basePrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-success">
                <span>Discounts Applied</span>
                <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discounted Base Price</span>
                <span className="font-semibold text-foreground">
                  ₹{discountedBasePrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>GST 5% on Solar Equipment</span>
                <span className="font-semibold text-foreground">
                  ₹{equipmentGst.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>GST 18% on Services & Labor</span>
                <span className="font-semibold text-foreground">
                  ₹{servicesGst.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total GST Liability</span>
                <span className="font-semibold text-foreground">
                  ₹{totalGst.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="h-px bg-border my-2" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold">Gross Total Price (GST Incl.)</span>
                <span className="font-bold text-foreground">
                  ₹{totalPriceGstIncl.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Govt Subsidy Rebate</span>
                <span className="font-semibold">N/A (Commercial)</span>
              </div>
            </div>
          </div>

          {/* Itemized Installation Costs (the critical sub-breakdowns missing previously) */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex justify-between items-center">
              <span>🛠️ Installation Costs</span>
              <span className="text-[10px] text-foreground-tertiary font-normal">
                GST 18% Incl.
              </span>
            </h3>

            <div className="space-y-2.5 text-xs text-foreground-secondary">
              <div className="flex justify-between">
                <span>Electrical Integration</span>
                <span className="font-medium text-foreground">
                  ₹{installationSubbreakdown.electricalWork.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fixed Material Kits</span>
                <span className="font-medium text-foreground">
                  ₹{installationSubbreakdown.fixedMaterial.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Installation Labor Force</span>
                <span className="font-medium text-foreground">
                  ₹{installationSubbreakdown.installationLabor.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Loading & Unloading</span>
                <span className="font-medium text-foreground">
                  ₹{installationSubbreakdown.loadingUnloading.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>MSEDCL Integration & Liaising</span>
                <span className="font-medium text-foreground">
                  ₹{installationSubbreakdown.msedclCharges.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Freight & Transportation</span>
                <span className="font-medium text-foreground">
                  ₹{installationSubbreakdown.transport.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Variable Floor Adjustments</span>
                <span className="font-medium text-foreground">
                  ₹{installationSubbreakdown.variableFloor.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="h-px bg-border my-2" />

              <div className="flex justify-between text-xs">
                <span className="text-foreground-tertiary">Total Net (Before Tax)</span>
                <span className="font-semibold text-foreground">
                  ₹{installationSubbreakdown.totalBeforeTax.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-foreground-tertiary">Total Tax Liability (18% GST)</span>
                <span className="font-semibold text-foreground">
                  ₹{installationSubbreakdown.gstAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-background-secondary p-3 rounded-lg border border-border flex justify-between items-center text-xs mt-2.5">
                <span className="font-semibold text-foreground-secondary">
                  Total Installation Cost
                </span>
                <span className="font-bold text-primary-dark">
                  ₹{installationSubbreakdown.totalWithGst.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark shadow-sm text-xs transition-all">
                ⚡ Convert to Project
              </button>
              <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-white hover:bg-background-secondary transition-all text-xs font-semibold text-foreground-secondary">
                💬 Request Modifications
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
