'use client';

import { ElectricBoltOutlined, InventoryOutlined } from '@mui/icons-material';
import { MaterialStatus } from '@oneohm-epc/shared/types';
import Link from 'next/link';

import { MATERIAL_STATUS_BADGE_VARIANT, MATERIAL_STATUS_LABELS } from '../../../../constants';
import type { InverterConfig, PanelConfig, ProjectDetail } from '../../../../hooks/types';

import { Card, CardContent, SystemSizeDisplay } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { buildRoute, ROUTES } from '@/lib/config/routes';

const MAX_BOM_PREVIEW = 4;

interface OverviewSystemSpecsProps {
  project: ProjectDetail;
  projectPath: string;
}

function formatPanelsSummary(panels: PanelConfig[] | undefined): string {
  const first = panels?.[0];
  if (!first) return '—';
  const totalCount = panels.reduce((s, p) => s + p.quantity, 0);
  const allSameWattage = panels.every((p) => p.wattagePerPanel === first.wattagePerPanel);
  if (allSameWattage) {
    return `${totalCount} × ${Math.round(first.wattagePerPanel)}W`;
  }
  return panels.map((p) => `${p.quantity} × ${Math.round(p.wattagePerPanel)}W`).join(' + ');
}

function formatPanelLabel(panel: PanelConfig): string {
  const parts: string[] = [];
  if (panel.brand) parts.push(panel.brand);
  if (panel.name) parts.push(panel.name);
  return parts.join(' ') || '—';
}

function formatInverterLabel(inv: InverterConfig): string {
  const parts: string[] = [];
  if (inv.brand) parts.push(inv.brand);
  if (inv.name) parts.push(inv.name);
  if (inv.quantity > 1) parts.push(`×${inv.quantity}`);
  return parts.join(' ') || '—';
}

function getMaxWarranty(
  panels: PanelConfig[] | undefined,
  inverters: InverterConfig[] | undefined,
): string {
  const years: number[] = [];
  panels?.forEach((p) => {
    if (p.productWarrantyYears) years.push(p.productWarrantyYears);
    if (p.performanceWarrantyYears) years.push(p.performanceWarrantyYears);
  });
  inverters?.forEach((i) => {
    if (i.productWarrantyYears) years.push(i.productWarrantyYears);
  });
  if (years.length === 0) return '—';
  return `${Math.max(...years)} years`;
}

interface SpecRowProps {
  label: string;
  value: string | number | undefined | null;
  dotColor: string;
  truncate?: boolean;
  badge?: string;
}

function SpecRow({ label, value, dotColor, truncate, badge }: SpecRowProps): React.ReactElement {
  const display = value != null && String(value).trim().length > 0 ? String(value) : '—';

  return (
    <div className="flex justify-between py-2 gap-2 items-center">
      <span className="text-foreground-secondary inline-flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden />
        {label}
        {badge && (
          <span className="text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-700 leading-none">
            {badge}
          </span>
        )}
      </span>
      <span
        className={`font-medium text-foreground text-right ${truncate ? 'truncate max-w-[55%]' : ''}`}
      >
        {display}
      </span>
    </div>
  );
}

export function OverviewSystemSpecs({
  project,
  projectPath,
}: OverviewSystemSpecsProps): React.ReactElement {
  const panels = project.panelConfigs ?? [];
  const inverters = project.inverterConfigs ?? [];
  const materials = project.materials ?? [];

  const panelsRight = formatPanelsSummary(panels.length > 0 ? panels : undefined);

  const pendingCount = materials.filter(
    (m) => m.status !== MaterialStatus.ALLOCATED && m.status !== MaterialStatus.USED,
  ).length;

  const previewMaterials = materials.slice(0, MAX_BOM_PREVIEW);
  const hasOverflow = materials.length > MAX_BOM_PREVIEW;
  const bomHref = `${projectPath}?tab=bom`;

  const phase = project.phaseType ?? project.property.connectionType;
  const hasDcrSplit =
    panels.length > 1 && panels.some((p) => p.isDcr) && panels.some((p) => !p.isDcr);
  const warranty = getMaxWarranty(
    panels.length > 0 ? panels : undefined,
    inverters.length > 0 ? inverters : undefined,
  );

  return (
    <Card className="rounded-xl h-[500px] flex flex-col">
      <CardContent className="p-5 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2 shrink-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ElectricBoltOutlined className="text-amber-500" style={{ fontSize: 16 }} />
            System Specifications
          </p>
          {project.quoteId ? (
            <Link
              href={buildRoute(ROUTES.QUOTES.DETAIL, { id: project.quoteId })}
              className="text-[11px] font-medium text-primary hover:underline shrink-0"
            >
              View Quote →
            </Link>
          ) : null}
        </div>

        {/* Installed capacity hero */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-3 flex items-start justify-between gap-3 shrink-0">
          <div>
            <p className="text-[11px] text-foreground-secondary">Installed Capacity</p>
            <SystemSizeDisplay
              actualKw={project.actualSystemSizeKw ?? project.systemSizeKw}
              requestedKw={project.systemSizeKw}
              size="lg"
            />
          </div>
          <div className="text-right">
            <p className="text-[10px] text-foreground-secondary uppercase font-semibold">Panels</p>
            <p className="text-sm font-semibold text-foreground mt-1 tabular-nums">{panelsRight}</p>
          </div>
        </div>

        {/* Spec rows */}
        <div className="divide-y divide-border-light text-xs flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {/* Panel rows — one per config to distinguish DCR vs Non-DCR */}
          {panels.length === 0 ? (
            <SpecRow label="Panel" value={undefined} dotColor="bg-indigo-400" />
          ) : (
            panels.map((panel, idx) => (
              <SpecRow
                key={`panel-${idx}`}
                label="Panel"
                value={formatPanelLabel(panel)}
                dotColor="bg-indigo-400"
                truncate
                badge={hasDcrSplit ? (panel.isDcr ? 'DCR' : 'Non-DCR') : undefined}
              />
            ))
          )}

          {/* Inverter rows — one per config */}
          {inverters.length === 0 ? (
            <SpecRow label="Inverter" value={undefined} dotColor="bg-blue-400" />
          ) : (
            inverters.map((inv, idx) => (
              <SpecRow
                key={`inv-${idx}`}
                label="Inverter"
                value={formatInverterLabel(inv)}
                dotColor="bg-blue-400"
                truncate
              />
            ))
          )}

          <SpecRow label="Mounting" value={project.structureType} dotColor="bg-purple-400" />
          <SpecRow label="Phase" value={phase} dotColor="bg-amber-400" />
          <SpecRow label="Warranty" value={warranty} dotColor="bg-gray-400" />

          {/* Materials / BOM section */}
          {materials.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border-light">
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <InventoryOutlined className="text-foreground-muted" style={{ fontSize: 14 }} />
                  Materials
                </p>
                <Link
                  href={bomHref}
                  className="text-[11px] font-medium text-primary hover:underline shrink-0"
                >
                  View full BOM →
                </Link>
              </div>

              {pendingCount > 0 && (
                <div className="rounded-lg bg-warning/10 border border-warning/20 p-2.5 mb-3">
                  <p className="text-[11px] text-warning font-medium">
                    {pendingCount} material{pendingCount === 1 ? '' : 's'} pending allocation
                  </p>
                </div>
              )}

              <div className="divide-y divide-border-light">
                {previewMaterials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between py-2 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {material.materialName}
                      </p>
                      <p className="text-[11px] text-foreground-secondary">
                        {[
                          material.category,
                          `${material.quantityRequired}${material.unit ? ` ${material.unit}` : ''}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        (MATERIAL_STATUS_BADGE_VARIANT[material.status] ?? 'secondary') as 'success'
                      }
                      size="xs"
                    >
                      {MATERIAL_STATUS_LABELS[material.status] ?? material.status}
                    </Badge>
                  </div>
                ))}
              </div>

              {hasOverflow && (
                <div className="mt-2 text-right">
                  <Link
                    href={bomHref}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    View all {materials.length} materials →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
