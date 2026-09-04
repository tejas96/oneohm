'use client';

import { formatCurrentLoadLabel } from '@tejas96/shared/utils';
import { MapPin } from 'lucide-react';
import * as React from 'react';

import type { ProjectDetail } from '../../../../hooks/types';
import { CardLink, DetailCard, IconCircle } from '../../primitives';

import type { DiscomResponse } from '@/components/features/properties/hooks/use-discoms';
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
 * The DISCOM, collapsed by default.
 *
 * The card used to give it a single slot showing the utility's name, which was
 * both too little and too much: too little because filing a net-metering
 * application needs the circle, division, subdivision and section it sits
 * under, each with its engineer, plus the office's address and contacts — and
 * too much because on most days nobody looks at any of it.
 *
 * So it sits at the end, shut, one line tall, naming the utility. Opened, it
 * lays out everything the form asks for. Native <details>, so it works without
 * JavaScript, keyboard-toggles for free, and the browser's own find-in-page can
 * reach inside it.
 *
 * Rows are omitted when empty rather than printed as "—": a shut panel promises
 * detail, and opening it onto a column of dashes is worse than the single slot
 * this replaces.
 */
function DiscomPanel({ discom }: { discom?: DiscomResponse | null }): React.JSX.Element {
  const rows: Array<{ label: string; value?: string | null; mono?: boolean; wide?: boolean }> = [
    { label: 'Circle', value: discom?.circleName },
    { label: 'Circle in-charge', value: discom?.circleInchargeName },
    { label: 'Division', value: discom?.divisionName },
    { label: 'Division in-charge', value: discom?.divisionInchargeName },
    { label: 'Subdivision', value: discom?.subdivisionName },
    { label: 'Subdivision in-charge', value: discom?.subdivisionInchargeName },
    { label: 'Section', value: discom?.sectionName },
    { label: 'Section engineer', value: discom?.sectionEngineerName },
    { label: 'Testing unit', value: discom?.testingUnitName },
    { label: 'AEQC engineer', value: discom?.aeqcEngineerName },
    { label: 'Office address', value: discom?.officeAddress, wide: true },
    { label: 'Mobile', value: discom?.mobileNo, mono: true },
    { label: 'Email', value: discom?.email },
  ].filter((row) => !!row.value?.trim());

  // Nothing to open into: state the fact in the same slot the old field used,
  // rather than offering a control that reveals an empty box.
  if (!discom || rows.length === 0) {
    return (
      <div className="mt-3 border-t border-border-subtle pt-3">
        <Field label="DISCOM" value={discom?.label} />
      </div>
    );
  }

  return (
    <details className="group mt-3 border-t border-border-subtle pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-rf-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-foreground-muted transition-transform duration-fast group-open:rotate-90"
        >
          <path
            d="m9 6 6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] font-medium text-foreground-tertiary">DISCOM</span>
        <span className="min-w-0 truncate text-[13px] text-foreground">{discom.label}</span>
      </summary>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map((row) => (
          <Field
            key={row.label}
            label={row.label}
            value={row.value}
            mono={row.mono}
            wide={row.wide}
          />
        ))}
      </div>
    </details>
  );
}

/**
 * The roof, and the numbers a DISCOM form asks for.
 *
 * Deliberately carries no customer contact block: the page header already holds
 * the name and phone, and it sits on every tab. A second copy one card down
 * would be the same links twice on one screen.
 *
 * No "Open site" link either. The card is the site — everything it would take
 * you to read is already on it, and the property page adds a survey and quote
 * history that belong to the site's own workflow rather than this project's.
 * "Open in Maps" below is the one link worth keeping, because it does something
 * this page cannot.
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
    <DetailCard label="Site" className={className}>
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
        {/* Raw DB enums ("single_phase") are not words. Title-case them. */}
        <Field label="Connection" value={enumLabel(property?.connectionType)} />
        <Field
          label="Sanctioned load"
          value={property?.sanctionedLoad ? `${property.sanctionedLoad} kW` : null}
        />
        <Field label="Current load" value={formatCurrentLoadLabel(property?.currentLoad)} />
        <Field label="Consumer name" value={property?.consumerName} />
        <Field label="Consumer number" value={property?.consumerNumber} mono wide />
      </div>

      <DiscomPanel discom={property?.discom} />
    </DetailCard>
  );
}
