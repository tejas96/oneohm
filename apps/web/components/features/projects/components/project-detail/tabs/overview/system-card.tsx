'use client';

import { computeSolarImpact } from '@tejas96/shared/utils';
import * as React from 'react';

import type { InverterConfig, PanelConfig, ProjectDetail } from '../../../../hooks/types';
import { CardLink, DetailCard, Mono, TonePill } from '../../primitives';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatNumber, formatSystemSize, toTitleLabel } from '@/lib/utils';

interface SystemCardProps {
  project: ProjectDetail;
  projectPath: string;
  className?: string;
}

function panelLine(panel: PanelConfig): string {
  const parts = [`${panel.quantity} × ${Math.round(panel.wattagePerPanel)} W`];
  const model = [panel.brand, panel.name].filter(Boolean).join(' ');
  if (model) parts.push(model);
  return parts.join(' · ');
}

function inverterLine(inverter: InverterConfig): string {
  const parts = [`${inverter.quantity} × ${formatSystemSize(inverter.capacityKw)} kW`];
  const model = [inverter.brand, inverter.name].filter(Boolean).join(' ');
  if (model) parts.push(model);
  return parts.join(' · ');
}

/** Turns a stored enum ("aluminum_rail") into words, leaving real text alone. */
function enumLabel(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return value.includes('_') ? toTitleLabel(value) : value;
}

function maxWarrantyYears(panels: PanelConfig[], inverters: InverterConfig[]): number | null {
  const years: number[] = [];
  for (const p of panels) {
    if (p.productWarrantyYears) years.push(p.productWarrantyYears);
    if (p.performanceWarrantyYears) years.push(p.performanceWarrantyYears);
  }
  for (const i of inverters) {
    if (i.productWarrantyYears) years.push(i.productWarrantyYears);
  }
  return years.length > 0 ? Math.max(...years) : null;
}

function SpecRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 py-1.5">
      <span className="pt-px text-[11px] font-medium text-foreground-tertiary">{label}</span>
      <div className="min-w-0 text-[12.5px] leading-[1.45] text-foreground">{children}</div>
    </div>
  );
}

/** What is going on the roof, from the accepted quote's snapshot. */
export function SystemCard({
  project,
  projectPath,
  className,
}: SystemCardProps): React.JSX.Element {
  const panels = project.panelConfigs ?? [];
  const inverters = project.inverterConfigs ?? [];
  const kw = project.systemSizeKw ?? 0;
  const actualKw = project.actualSystemSizeKw;
  const hasDcrSplit =
    panels.length > 1 && panels.some((p) => p.isDcr) && panels.some((p) => !p.isDcr);
  const warranty = maxWarrantyYears(panels, inverters);
  const phase = project.phaseType ?? project.property?.connectionType;
  const impact = kw > 0 ? computeSolarImpact({ systemSizeKw: kw }) : null;
  const panelCount = project.panelCount ?? panels.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <DetailCard
      label="System"
      action={
        project.quoteId ? (
          <CardLink href={buildRoute(ROUTES.QUOTES.DETAIL, { id: project.quoteId })}>
            View quote
          </CardLink>
        ) : null
      }
      className={className}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
            {kw > 0 ? formatSystemSize(kw) : '—'}
          </span>
          <span className="ml-1.5 text-[13px] text-foreground-secondary">kW</span>
          <p className="mt-1.5 text-[11.5px] text-foreground-tertiary">
            {kw > 0
              ? panelCount > 0
                ? `Calculated from ${formatNumber(panelCount)} ${panelCount === 1 ? 'panel' : 'panels'}`
                : 'Calculated from the quote'
              : 'No system size on the quote yet'}
          </p>
        </div>
        {actualKw != null && actualKw > 0 && Math.abs(actualKw - kw) >= 0.05 ? (
          <div className="text-right">
            <span className="block text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-tertiary">
              Actual
            </span>
            <Mono className="mt-1 block text-[13px] font-medium text-foreground">
              {formatSystemSize(actualKw)} kW
            </Mono>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <SpecRow label="Panels">
          {panels.length === 0 ? (
            <span className="text-foreground-muted">—</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {panels.map((panel, index) => (
                <li
                  key={`${panel.name}-${index}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
                >
                  <span className="[overflow-wrap:anywhere]">{panelLine(panel)}</span>
                  {hasDcrSplit ? (
                    <TonePill
                      label={panel.isDcr ? 'DCR' : 'Non-DCR'}
                      tone={panel.isDcr ? 'accent' : 'neutral'}
                      className="h-[18px] px-1.5 text-[10px]"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SpecRow>
        <SpecRow label="Inverters">
          {inverters.length === 0 ? (
            <span className="text-foreground-muted">—</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {inverters.map((inverter, index) => (
                <li key={`${inverter.name}-${index}`} className="[overflow-wrap:anywhere]">
                  {inverterLine(inverter)}
                </li>
              ))}
            </ul>
          )}
        </SpecRow>
        <SpecRow label="Mounting">
          {enumLabel(project.structureType) ?? <span className="text-foreground-muted">—</span>}
        </SpecRow>
        <SpecRow label="Phase">
          {enumLabel(phase) ?? <span className="text-foreground-muted">—</span>}
        </SpecRow>
        <SpecRow label="Warranty">
          {warranty != null ? (
            `Up to ${warranty} years`
          ) : (
            <span className="text-foreground-muted">—</span>
          )}
        </SpecRow>
      </div>

      {impact ? (
        <p className="mt-3 text-[11.5px] text-foreground-tertiary">
          <span className="font-bold uppercase tracking-[0.1em]">Estimate</span> ·{' '}
          <Mono className="text-foreground-secondary">~{formatNumber(impact.annualKwh)} kWh</Mono> a
          year · <Mono className="text-foreground-secondary">{impact.co2TonnesPerYear} t</Mono> CO₂
          avoided
        </p>
      ) : null}

      <div className="pt-3">
        <CardLink href={`${projectPath}?tab=bom`}>Bill of materials</CardLink>
      </div>
    </DetailCard>
  );
}
