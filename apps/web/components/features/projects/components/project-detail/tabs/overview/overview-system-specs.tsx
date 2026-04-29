'use client';

import { Zap } from 'lucide-react';
import Link from 'next/link';

import type { ProjectDetail } from '../../../../hooks/types';

import { Card, CardContent, SystemSizeDisplay } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';

interface OverviewSystemSpecsProps {
  project: ProjectDetail;
}

function readCustomField(customFields: Record<string, unknown> | undefined, key: string): string {
  const value = customFields?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : '—';
}

function readNumericCustomField(
  customFields: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = customFields?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function formatPanelsSummary(customFields: Record<string, unknown>): string {
  const count = readNumericCustomField(customFields, 'numberOfPanels');
  const watts = readNumericCustomField(customFields, 'panelWattage');
  if (count != null && watts != null) {
    return `${count} × ${Math.round(watts)}W`;
  }
  if (count != null) {
    return `${count} × —`;
  }
  if (watts != null) {
    return `— × ${Math.round(watts)}W`;
  }
  return '—';
}

export function OverviewSystemSpecs({ project }: OverviewSystemSpecsProps): React.ReactElement {
  const customFields = project.metadata?.customFields ?? {};
  const panelsRight = formatPanelsSummary(customFields);

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
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

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-3 flex items-start justify-between gap-3">
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

        <div className="divide-y divide-border-light text-xs">
          <div className="flex justify-between py-2 gap-2 items-center">
            <span className="text-foreground-secondary inline-flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" aria-hidden />
              Inverter
            </span>
            <span className="font-medium text-foreground text-right">
              {readCustomField(customFields, 'inverterModel')}
            </span>
          </div>
          <div className="flex justify-between py-2 gap-2 items-center">
            <span className="text-foreground-secondary inline-flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-purple-400" aria-hidden />
              Mounting
            </span>
            <span className="font-medium text-foreground text-right">
              {readCustomField(customFields, 'mountingType')}
            </span>
          </div>
          <div className="flex justify-between py-2 gap-2 items-center">
            <span className="text-foreground-secondary inline-flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" aria-hidden />
              Phase
            </span>
            <span className="font-medium text-foreground text-right">
              {project.property.connectionType ?? '—'}
            </span>
          </div>
          <div className="flex justify-between py-2 gap-2 items-center">
            <span className="text-foreground-secondary inline-flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-400" aria-hidden />
              Roof Area
            </span>
            <span className="font-medium text-foreground text-right">
              {readCustomField(customFields, 'roofAreaSqFt')}
            </span>
          </div>
          <div className="flex justify-between py-2 gap-2 items-center">
            <span className="text-foreground-secondary inline-flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400" aria-hidden />
              Warranty
            </span>
            <span className="font-medium text-foreground text-right">
              {readCustomField(customFields, 'warranty')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
