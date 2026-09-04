'use client';

import { formatCurrentLoadLabel } from '@tejas96/shared/utils';
import { MapPin } from 'lucide-react';
import * as React from 'react';

import type { ProjectDetail } from '../../../../hooks/types';
import { CardLink, DetailCard, IconCircle } from '../../primitives';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, toTitleLabel } from '@/lib/utils';

interface SiteCardProps {
  project: ProjectDetail;
  className?: string;
}

/** Turns a stored enum into readable words, leaving a real sentence alone. */
function enumLabel(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return value.includes('_') ? toTitleLabel(value) : value;
}

function Field({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  wide?: boolean;
}): React.JSX.Element {
  const text = value == null || String(value).trim() === '' ? null : String(value);
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <span className="block text-[11px] font-medium text-foreground-tertiary">{label}</span>
      {text ? (
        <span
          className={cn(
            'mt-0.5 block text-[13px] leading-[1.45] text-foreground [overflow-wrap:anywhere]',
            mono && 'font-mono tabular-nums',
          )}
        >
          {text}
        </span>
      ) : (
        <span className="mt-0.5 block text-[13px] text-foreground-muted">—</span>
      )}
    </div>
  );
}

/**
 * The roof, and the numbers a DISCOM form asks for.
 *
 * Deliberately carries no customer contact block: the page header already
 * holds the name, phone, WhatsApp and email, and it sits on every tab. A
 * second copy one card down would be the same four links twice on one screen.
 */
export function SiteCard({ project, className }: SiteCardProps): React.JSX.Element {
  const property = project.property;
  const street = property?.address?.trim() || property?.propertyName?.trim() || '';
  const cityState = [property?.city, property?.state].filter(Boolean).join(', ');
  const pincode = property?.pincode?.trim();

  /*
   * The second line carries only what the address above does NOT already say.
   *
   * `address` is free text, and how much of the location it repeats varies by
   * how it was typed. One site here reads "Sangli Bus Stand, VH36+6W5, Sangli,
   * Patrakar Nagar, Sangli Miraj Kupwad, Maharashtra 416416" — city, state and
   * pincode all present — and the line beneath restated every one of them.
   * Another reads "Plot 14, Shivaji Nagar", where that same line is the only
   * place the city appears at all. So neither always-show nor always-hide is
   * right; each part is dropped on its own, and the line disappears when
   * nothing is left to add.
   */
  const streetHaystack = street.toLowerCase();
  const addsSomething = (part?: string | null): boolean =>
    !!part?.trim() && !streetHaystack.includes(part.trim().toLowerCase());
  const secondLine = [
    [property?.city, property?.state].filter(addsSomething).join(', '),
    addsSomething(pincode) ? pincode : '',
  ]
    .filter(Boolean)
    .join(' · ');

  // The maps query keeps every part regardless: a search wants the fullest
  // string available, and duplication costs nothing there.
  const mapsQuery = [street, cityState, pincode].filter(Boolean).join(', ');
  const mapsHref = mapsQuery ? `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}` : null;

  return (
    <DetailCard
      label="Site"
      action={
        project.propertyId ? (
          <CardLink href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: project.propertyId })}>
            Open site
          </CardLink>
        ) : null
      }
      className={className}
    >
      <div className="flex gap-3">
        <IconCircle tone="accent" size={40}>
          <MapPin className="size-[18px]" strokeWidth={1.75} />
        </IconCircle>
        <div className="min-w-0 flex-1">
          {street ? (
            <p className="text-[13.5px] font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
              {street}
            </p>
          ) : (
            <p className="text-[13.5px] font-semibold text-foreground-muted">
              Address not recorded
            </p>
          )}
          {secondLine ? (
            <p className="mt-0.5 text-[12px] text-foreground-secondary">{secondLine}</p>
          ) : null}
          {mapsHref ? (
            <CardLink href={mapsHref} external className="mt-1.5 text-[12px]">
              Open in Maps
            </CardLink>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="DISCOM" value={property?.discom?.label} />
        {/* Raw DB enums ("single_phase") are not words. Title-case them. */}
        <Field label="Connection" value={enumLabel(property?.connectionType)} />
        <Field
          label="Sanctioned load"
          value={property?.sanctionedLoad ? `${property.sanctionedLoad} kW` : null}
        />
        <Field label="Current load" value={formatCurrentLoadLabel(property?.currentLoad)} />
        <Field label="Consumer name" value={property?.consumerName} />
        <Field label="Consumer number" value={property?.consumerNumber} mono />
      </div>
    </DetailCard>
  );
}
