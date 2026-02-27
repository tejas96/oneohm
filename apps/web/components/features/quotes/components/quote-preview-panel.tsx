'use client';

import {
  AlertTriangle,
  Calendar,
  Calculator,
  Download,
  Save,
  Shield,
  Zap,
} from 'lucide-react';

import type { CalculateQuoteResponse } from '../types';

import { Badge, Button, Card, CardContent, Skeleton, Spinner } from '@/components/ui';
import { formatCurrency, formatCurrencyDecimal } from '@/lib/utils/format';


// ============================================================================
// Types
// ============================================================================

export interface QuotePreviewPanelProps {
  calculation: CalculateQuoteResponse | null;
  isCalculating: boolean;
  calculationError: string | null;
  discountAmount: number;
  manualDcrPanelCount: number | undefined;
  manualNonDcrPanelCount: number | undefined;
  manualInverterCount: number | undefined;
  onManualDcrPanelCountChange: (val: number | undefined) => void;
  onManualNonDcrPanelCountChange: (val: number | undefined) => void;
  onManualInverterCountChange: (val: number | undefined) => void;
  hasQuantityChanges: boolean;
  onRecalculate: () => void;
  isSaving: boolean;
  savedQuoteNumber: string | null;
  onSave: () => void;
  isDownloading: boolean;
  onDownload: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function QuotePreviewPanel({
  calculation,
  isCalculating,
  calculationError,
  discountAmount,
  manualDcrPanelCount,
  manualNonDcrPanelCount,
  manualInverterCount,
  onManualDcrPanelCountChange,
  onManualNonDcrPanelCountChange,
  onManualInverterCountChange,
  hasQuantityChanges,
  onRecalculate,
  isSaving,
  savedQuoteNumber,
  onSave,
  isDownloading,
  onDownload,
}: QuotePreviewPanelProps) {
  // Empty state
  if (!calculation && !isCalculating && !calculationError) {
    return (
      <Card className="flex h-full items-center justify-center border-dashed">
        <CardContent className="py-12 text-center">
          <Calculator className="mx-auto mb-3 size-10 text-foreground-tertiary" />
          <p className="text-sm font-medium text-foreground-secondary">
            Fill the form and click Calculate
          </p>
          <p className="mt-1 text-xs text-foreground-tertiary">
            Your quote preview will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isCalculating) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm font-medium text-foreground-secondary">
              Calculating your quote...
            </span>
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (calculationError) {
    return (
      <Card className="border-error/30">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-error">Calculation Failed</p>
          <p className="mt-1 text-xs text-foreground-secondary">{calculationError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!calculation) return null;

  const totalPanels = calculation.panels.reduce((sum, p) => sum + p.quantity, 0);
  const dcrPanels = calculation.panels.filter((p) => p.isDcr);
  const nonDcrPanels = calculation.panels.filter((p) => !p.isDcr);
  const adjustedFinalPrice = Math.max(0, calculation.pricing.finalPrice - discountAmount);
  const adjustedEffectivePrice = Math.max(0, adjustedFinalPrice - calculation.subsidy.amount);
  const pricePerWatt =
    calculation.actualTotalWattage > 0
      ? adjustedEffectivePrice / calculation.actualTotalWattage
      : 0;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-primary to-primary/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Quote Preview</h3>
      </div>

      <CardContent className="space-y-5 p-4">
        {/* ── System Overview ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-primary/5 p-3 text-center">
            <p className="text-xl font-semibold text-primary">
              {Math.round(calculation.actualSystemSizeKw)} kW
            </p>
            <p className="text-xs text-foreground-secondary">System Size</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xl font-semibold text-foreground">{totalPanels}</p>
            <p className="text-xs text-foreground-secondary">Total Panels</p>
          </div>
        </div>

        {/* ── Solar Panels ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            Solar Panels
          </p>
          {dcrPanels.map((panel) => (
            <div
              key={panel.productId}
              className="rounded-lg border border-border-light p-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="success" size="xs">
                      DCR
                    </Badge>
                    <span className="text-sm font-medium">
                      {panel.brand} {panel.wattagePerPanel}W
                    </span>
                  </div>
                  <p className="text-xs text-foreground-secondary">
                    {panel.quantity} panels &times; {formatCurrencyDecimal(panel.pricePerWatt)}/W
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(panel.lineTotal)}</p>
                  <p className="text-2xs text-foreground-tertiary">
                    +{formatCurrency(panel.gstAmount)} GST
                  </p>
                </div>
              </div>
            </div>
          ))}
          {nonDcrPanels.map((panel) => (
            <div
              key={panel.productId}
              className="rounded-lg border border-border-light p-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="warning" size="xs">
                      Non-DCR
                    </Badge>
                    <span className="text-sm font-medium">
                      {panel.brand} {panel.wattagePerPanel}W
                    </span>
                  </div>
                  <p className="text-xs text-foreground-secondary">
                    {panel.quantity} panels &times; {formatCurrencyDecimal(panel.pricePerWatt)}/W
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(panel.lineTotal)}</p>
                  <p className="text-2xs text-foreground-tertiary">
                    +{formatCurrency(panel.gstAmount)} GST
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quantity Adjusters ── */}
        <div className="rounded-lg border border-border-light p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-xs">
              &#9881;
            </div>
            <p className="text-sm font-medium">Adjust Quantities</p>
          </div>
          <p className="mb-3 text-2xs italic text-foreground-tertiary">
            Tap + or &minus; to adjust counts. Press Recalculate to update pricing.
          </p>

          <div className="space-y-0 divide-y divide-border-light">
            {dcrPanels.length > 0 && dcrPanels[0] && (
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant="success" size="xs">DCR</Badge>
                  <div>
                    <p className="text-sm font-medium">DCR Panels</p>
                    <p className="text-2xs text-foreground-tertiary">
                      {(((manualDcrPanelCount ?? dcrPanels[0].quantity) * dcrPanels[0].wattagePerPanel) / 1000).toFixed(2)} kW
                    </p>
                  </div>
                </div>
                <div className="flex items-center overflow-hidden rounded-lg bg-muted">
                  <button
                    type="button"
                    onClick={() => onManualDcrPanelCountChange(Math.max(1, (manualDcrPanelCount ?? dcrPanels[0]!.quantity) - 1))}
                    className="px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary"
                  >
                    &minus;
                  </button>
                  <span className="min-w-8 px-1 text-center text-sm font-semibold">
                    {manualDcrPanelCount ?? dcrPanels[0].quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onManualDcrPanelCountChange((manualDcrPanelCount ?? dcrPanels[0]!.quantity) + 1)}
                    className="px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {nonDcrPanels.length > 0 && nonDcrPanels[0] && (
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="xs">Non-DCR</Badge>
                  <div>
                    <p className="text-sm font-medium">Non-DCR Panels</p>
                    <p className="text-2xs text-foreground-tertiary">
                      {(((manualNonDcrPanelCount ?? nonDcrPanels[0].quantity) * nonDcrPanels[0].wattagePerPanel) / 1000).toFixed(2)} kW
                    </p>
                  </div>
                </div>
                <div className="flex items-center overflow-hidden rounded-lg bg-muted">
                  <button
                    type="button"
                    onClick={() => onManualNonDcrPanelCountChange(Math.max(1, (manualNonDcrPanelCount ?? nonDcrPanels[0]!.quantity) - 1))}
                    className="px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary"
                  >
                    &minus;
                  </button>
                  <span className="min-w-8 px-1 text-center text-sm font-semibold">
                    {manualNonDcrPanelCount ?? nonDcrPanels[0].quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onManualNonDcrPanelCountChange((manualNonDcrPanelCount ?? nonDcrPanels[0]!.quantity) + 1)}
                    className="px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-md bg-secondary/10">
                  <Zap className="size-3 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Inverters</p>
                  <p className="text-2xs text-foreground-tertiary">
                    {calculation.inverters.totalCapacityKw} kW total capacity
                  </p>
                </div>
              </div>
              <div className="flex items-center overflow-hidden rounded-lg bg-muted">
                <button
                  type="button"
                  onClick={() => onManualInverterCountChange(Math.max(1, (manualInverterCount ?? calculation.inverters.inverters.reduce((s, i) => s + i.quantity, 0)) - 1))}
                  className="px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary"
                >
                  &minus;
                </button>
                <span className="min-w-8 px-1 text-center text-sm font-semibold">
                  {manualInverterCount ?? calculation.inverters.inverters.reduce((s, i) => s + i.quantity, 0)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const current = manualInverterCount ?? calculation.inverters.inverters.reduce((s, i) => s + i.quantity, 0);
                    onManualInverterCountChange(Math.min(20, current + 1));
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {hasQuantityChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={onRecalculate}
            >
              <Calculator className="mr-1.5 size-3.5" />
              Recalculate Quote
            </Button>
          )}
        </div>

        {/* ── Inverters ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            Inverters
          </p>
          {calculation.inverters.inverters.map((inv) => (
            <div
              key={inv.productId}
              className="rounded-lg border border-border-light p-2.5"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{inv.name}</p>
                  <p className="text-xs text-foreground-secondary">
                    {inv.brand} &middot; {inv.capacityKw}kW &middot; {inv.quantity} nos &times;{' '}
                    {formatCurrency(inv.unitPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(inv.lineTotal)}</p>
                  <p className="text-2xs text-foreground-tertiary">
                    +{formatCurrency(inv.gstAmount)} GST
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Structure ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            Mounting Structure
          </p>
          <div className="rounded-lg border border-border-light p-2.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{calculation.structure.name}</p>
                <p className="text-xs text-foreground-secondary">
                  Qty: {calculation.structure.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {formatCurrency(calculation.structure.lineTotal)}
                </p>
                <p className="text-2xs text-foreground-tertiary">
                  +{formatCurrency(calculation.structure.gstAmount)} GST
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Installation Breakdown ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            Installation & Services
          </p>
          <div className="rounded-lg border border-border-light p-2.5">
            <div className="space-y-1.5">
              {calculation.installation.electricalWork > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-secondary">Electrical Work</span>
                  <span>{formatCurrency(calculation.installation.electricalWork)}</span>
                </div>
              )}
              {calculation.installation.fixedMaterial > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-secondary">Fixed Material</span>
                  <span>{formatCurrency(calculation.installation.fixedMaterial)}</span>
                </div>
              )}
              {calculation.installation.installationLabor > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-secondary">Installation Labor</span>
                  <span>{formatCurrency(calculation.installation.installationLabor)}</span>
                </div>
              )}
              {calculation.installation.loadingUnloading > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-secondary">Loading & Unloading</span>
                  <span>{formatCurrency(calculation.installation.loadingUnloading)}</span>
                </div>
              )}
              {calculation.installation.msedclCharges > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-secondary">MSEDCL Charges</span>
                  <span>{formatCurrency(calculation.installation.msedclCharges)}</span>
                </div>
              )}
              {calculation.installation.transport > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-secondary">Transport</span>
                  <span>{formatCurrency(calculation.installation.transport)}</span>
                </div>
              )}
              {calculation.installation.variableFloor > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-foreground-secondary">Floor Charges</span>
                  <span>{formatCurrency(calculation.installation.variableFloor)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border-light pt-1.5 text-xs font-medium">
                <span>Installation (Before Tax)</span>
                <span>{formatCurrency(calculation.installation.totalBeforeTax)}</span>
              </div>
              <div className="flex justify-between text-xs text-foreground-secondary">
                <span>GST (18%)</span>
                <span>+{formatCurrency(calculation.installation.gstAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Subsidy Breakdown ── */}
        {calculation.subsidy.isApplicable && calculation.subsidy.amount > 0 && (
          <div className="rounded-lg border border-success/20 bg-success/5 p-3">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-success" />
              <div>
                <p className="text-xs font-medium text-success">Government Subsidy</p>
                {calculation.subsidy.schemeName && (
                  <p className="text-2xs text-success/80">
                    {calculation.subsidy.schemeName}
                  </p>
                )}
              </div>
            </div>
            {calculation.subsidy.breakdown && calculation.subsidy.breakdown.length > 0 && (
              <div className="mt-2 space-y-1">
                {calculation.subsidy.breakdown.map((tier, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground-secondary">
                      {tier.kw} kW @ {formatCurrency(tier.ratePerKw)}/kW
                    </span>
                    <span className="font-medium">{formatCurrency(tier.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-success/20 pt-2">
              <span className="text-xs font-medium text-success">
                Total Subsidy
                {calculation.subsidy.eligibleKw
                  ? ` (${calculation.subsidy.eligibleKw} kW eligible)`
                  : ''}
              </span>
              <span className="text-lg font-semibold text-success">
                -{formatCurrency(calculation.subsidy.amount)}
              </span>
            </div>
          </div>
        )}

        {/* ── Pricing Summary ── */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            Pricing Summary
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">Base Price</span>
              <span>{formatCurrency(calculation.pricing.basePrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">GST on Equipment (5%)</span>
              <span>{formatCurrency(calculation.pricing.gst12Amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">GST on Services (18%)</span>
              <span>{formatCurrency(calculation.pricing.gst18Amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-secondary">Total GST</span>
              <span>{formatCurrency(calculation.pricing.totalGst)}</span>
            </div>
            {calculation.profitabilityPercent > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">
                  Margin ({calculation.profitabilityPercent}%)
                </span>
                <span>+{formatCurrency(calculation.profitabilityAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border-light pt-1.5 text-sm font-medium">
              <span>Gross Total</span>
              <span>{formatCurrency(calculation.pricing.totalPrice)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-success">
                <span>Discount Applied</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {calculation.subsidy.isApplicable && calculation.subsidy.amount > 0 && (
              <div className="flex items-center justify-between text-sm text-success">
                <span>Subsidy</span>
                <span>-{formatCurrency(calculation.subsidy.amount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Final Price (gradient) ── */}
        <div className="overflow-hidden rounded-lg">
          <div className="bg-linear-to-r from-primary to-primary/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">You Pay</p>
                <p className="text-xs text-white/60">
                  ₹{pricePerWatt.toFixed(2)}/Watt
                </p>
              </div>
              <p className="text-2xl font-semibold text-white">
                {formatCurrency(
                  calculation.subsidy.isApplicable
                    ? adjustedEffectivePrice
                    : adjustedFinalPrice,
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Timeline & Warranty ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-lg border border-border-light p-3 text-center">
            <Calendar className="mb-1 size-4 text-primary" />
            <p className="text-lg font-semibold">{calculation.completionWeeks} Weeks</p>
            <p className="text-2xs text-foreground-secondary">Est. Completion</p>
          </div>
          <div className="flex flex-col items-center rounded-lg border border-border-light p-3 text-center">
            <Shield className="mb-1 size-4 text-primary" />
            <p className="text-lg font-semibold">25 Years</p>
            <p className="text-2xs text-foreground-secondary">Panel Warranty</p>
          </div>
        </div>

        {/* ── Warnings ── */}
        {calculation.warnings && calculation.warnings.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-warning" />
              <p className="text-xs font-medium text-warning">Notes</p>
            </div>
            {calculation.warnings.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2"
              >
                <p className="text-xs text-warning">{w.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="space-y-2 pt-2">
          {!savedQuoteNumber ? (
            <Button
              type="button"
              className="w-full"
              onClick={onSave}
              disabled={isSaving || hasQuantityChanges}
            >
              {isSaving ? (
                <Spinner size="xs" className="mr-1.5" />
              ) : (
                <Save className="mr-1.5 size-4" />
              )}
              Save Quote
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-success/10 p-2">
                <Badge variant="success" size="sm">
                  Saved
                </Badge>
                <span className="text-sm font-medium">{savedQuoteNumber}</span>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={onDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Spinner size="xs" className="mr-1.5" />
                ) : (
                  <Download className="mr-1.5 size-4" />
                )}
                Download PDF
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
