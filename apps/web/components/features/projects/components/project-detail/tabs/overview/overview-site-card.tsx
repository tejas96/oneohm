'use client';

import { MapPin } from 'lucide-react';

import type { ProjectDetail } from '../../../../hooks/types';

import { Card, CardContent } from '@/components/ui';

interface OverviewSiteCardProps {
  project: ProjectDetail;
}

type PropertyWithCoords = ProjectDetail['property'] & {
  latitude?: number | null;
  longitude?: number | null;
};

function formatLatLng(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${ns} · ${Math.abs(lng).toFixed(1)}°${ew}`;
}

export function OverviewSiteCard({ project }: OverviewSiteCardProps): React.ReactElement {
  const property = project.property as PropertyWithCoords;
  const hasCoords =
    typeof property.latitude === 'number' &&
    Number.isFinite(property.latitude) &&
    typeof property.longitude === 'number' &&
    Number.isFinite(property.longitude);

  const streetLine = property.address?.trim() || property.propertyName?.trim() || '';
  const cityState = [property.city, property.state].filter(Boolean).join(', ');
  const pincode = property.pincode?.trim();
  const secondLine =
    cityState || pincode
      ? `${cityState}${pincode ? `${cityState ? ' · ' : ''}${pincode}` : ''}`
      : '';

  const mapsQuery = [streetLine, cityState, pincode].filter(Boolean).join(', ');
  const mapsHref = mapsQuery
    ? `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`
    : undefined;

  return (
    <Card className="rounded-xl overflow-hidden h-[500px] flex flex-col">
      <div className="h-32 bg-gradient-to-br from-success/15 via-info/10 to-primary/10 relative shrink-0">
        {hasCoords && (
          <div className="absolute top-2 left-2 text-[10px] font-medium px-2 py-1 rounded-md bg-card/95 border border-border-light shadow-sm text-foreground">
            {formatLatLng(property.latitude!, property.longitude!)}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="size-8 text-error drop-shadow-md" />
        </div>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 text-[10px] font-medium px-2 py-1 rounded-md bg-card/95 border border-border-light shadow-sm hover:bg-card"
          >
            Open in Maps →
          </a>
        )}
      </div>

      <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin">
        <div>
          <p className="text-sm font-semibold text-foreground">Installation Site</p>
          {streetLine ? (
            <p className="text-xs font-semibold text-foreground mt-1">{streetLine}</p>
          ) : (
            <p className="text-xs font-semibold text-foreground-secondary mt-1">
              Address unavailable
            </p>
          )}
          {secondLine ? (
            <p className="text-xs text-foreground-secondary mt-0.5">{secondLine}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-foreground-tertiary uppercase">DISCOM</p>
            <p className="font-medium text-foreground">{property.discomName ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-tertiary uppercase">Connection</p>
            <p className="font-medium text-foreground">{property.connectionType ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-tertiary uppercase">Sanctioned Load</p>
            <p className="font-medium text-foreground">
              {property.sanctionedLoad ? `${property.sanctionedLoad} kW` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-tertiary uppercase">Current Load</p>
            <p className="font-medium text-foreground">{property.currentLoad ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-tertiary uppercase">Consumer Name</p>
            <p className="font-medium text-foreground">{property.consumerName ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-foreground-tertiary uppercase">Consumer Number</p>
            <p className="font-medium text-foreground font-mono text-[11px]">
              {property.consumerNumber ?? '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
