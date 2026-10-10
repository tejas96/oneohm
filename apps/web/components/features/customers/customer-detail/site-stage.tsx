'use client';

import type { JSX } from 'react';

import { siteJourneyText } from '../components/list/format';
import { JourneyTrack } from '../components/list/journey-track';
import type { CustomerPropertyResponse } from '../hooks';

import { cn } from '@/lib/utils';

/**
 * How far a site has travelled: the same words and the same track the
 * customers list draws for it.
 *
 * Reads the server's journey (`stageIndex`, `lost`, `journeyLostReason`) —
 * the one SQL rule behind the list — and names the step from
 * `SITE_JOURNEY_STEPS`. It never works a stage out from quote or project
 * fields, so a site reads identically in the list, its panel, the customer
 * page and the site page. A lost site says "Lost", where it stopped and why,
 * and its track goes grey.
 *
 * Both site reads carry the journey (`GET /customer-properties/customer/:id`
 * and `GET /customer-properties/:id`). A record from an endpoint that does not
 * (the paged site list) renders nothing rather than a guessed stage.
 */
export interface SiteStageBarProps {
  property: Pick<CustomerPropertyResponse, 'stageIndex' | 'lost' | 'journeyLostReason'>;
  /** Hide the words and render the track alone — for dense table cells. */
  compact?: boolean;
}

export function SiteStageBar({ property, compact }: SiteStageBarProps): JSX.Element | null {
  const journey = siteJourneyText(property);
  if (!journey || property.stageIndex === undefined) return null;

  const words = journey.detail ? `${journey.title} · ${journey.detail}` : journey.title;

  return (
    <div className="w-full min-w-0 text-[12px] leading-[1.45]" title={compact ? words : undefined}>
      {!compact ? (
        <div className="mb-2 min-w-0">
          <b className={cn('block font-semibold', property.lost && 'text-error')}>
            {journey.title}
          </b>
          {journey.detail ? (
            <span title={journey.detail} className="block truncate text-foreground-tertiary">
              {journey.detail}
            </span>
          ) : null}
        </div>
      ) : null}
      {/* The pin overhangs the 6px track by 4px above and below. */}
      <div className="px-[7px] py-1">
        <JourneyTrack stageIndex={property.stageIndex} lost={property.lost} />
      </div>
    </div>
  );
}
