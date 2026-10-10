'use client';

import { ProjectStatus } from '@tejas96/shared/types';
import { formatFollowupWhen, formatSystemSize } from '@tejas96/shared/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { JSX, MouseEvent, ReactNode } from 'react';

import { followupDue, followupTypeLabel, shortDay, siteJourneyText } from './format';
import { JourneyTrack } from './journey-track';
import { customerLinks } from './links';
import { getSiteLifecycle } from '../../constants';
import type { CustomerPropertyResponse } from '../../hooks/use-customer-properties';

import {
  PropertyRowActionsMenu,
  type PropertyRowActionsTarget,
} from '@/components/features/properties/components/property-row-actions-menu';
import { PROPERTY_TYPE_LABELS } from '@/components/features/properties/constants';
import { cn, formatCurrency, toTitleLabel } from '@/lib/utils';

const stopBlockClick = (event: MouseEvent): void => event.stopPropagation();

const LINK = 'font-medium text-primary-dark hover:underline';

function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <>
      <dt className="text-foreground-tertiary">{label}</dt>
      <dd className="m-0 min-w-0 text-foreground-secondary">{children}</dd>
    </>
  );
}

export interface SiteBlockProps {
  property: CustomerPropertyResponse;
  showDelete: boolean;
  onMarkAsLost: (property: PropertyRowActionsTarget) => void;
  onReopen: (property: PropertyRowActionsTarget) => void;
  onRequestDelete: (property: PropertyRowActionsTarget) => void;
}

/**
 * One site in the focus panel: what it is, how far it has got, its quote, its
 * connection, its next follow-up and its state. Everything the old nested
 * sites table showed, without the table.
 *
 * The block opens the site; the consumer number is the real link that does the
 * same for the keyboard. Stage and "lost" come from the server (`stageIndex`,
 * `lost`, `journeyLostReason`) — never worked out here.
 */
export function SiteBlock({
  property,
  showDelete,
  onMarkAsLost,
  onReopen,
  onRequestDelete,
}: SiteBlockProps): JSX.Element {
  const router = useRouter();
  const siteHref = customerLinks.site(property.id);
  const journey = siteJourneyText(property);
  const lifecycle = getSiteLifecycle(property);
  const typeLabel =
    PROPERTY_TYPE_LABELS[property.propertyType] ?? toTitleLabel(property.propertyType);
  const place = property.address ?? property.city ?? null;

  // The quote the stage was read from (the quote list's pick for this site) —
  // not `latestQuote*`, which takes the newest live quote and so can name a
  // later draft while the journey says "Won" on the accepted one.
  const quote = property.dealQuote ?? null;
  const price = quote?.finalPrice ?? null;
  const size = quote?.systemSizeKw ?? null;

  const connection = [
    property.discom?.label,
    property.sanctionedLoad != null
      ? `${formatSystemSize(Number(property.sanctionedLoad))} kW load`
      : null,
    property.connectionType ? toTitleLabel(property.connectionType) : null,
  ].filter(Boolean);

  const next = property.nextFollowup ?? null;
  const due = next ? followupDue(next.scheduledAt) : null;

  const projectCancelled = property.projectStatus === ProjectStatus.CANCELLED;
  const meterInOpenProject =
    Boolean(property.meterInstalled) &&
    Boolean(property.projectId) &&
    !projectCancelled &&
    property.projectStatus !== ProjectStatus.COMPLETED;

  return (
    // The consumer-number link below is the keyboard path to the same place.
    <div
      onClick={() => router.push(siteHref)}
      className="group/site cursor-pointer border-t border-border py-3.5 first:border-t-0 first:pt-0 last:pb-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={siteHref}
              prefetch={false}
              onClick={stopBlockClick}
              className={cn(
                'truncate font-semibold group-hover/site:text-primary-dark',
                property.consumerNumber
                  ? 'tabular-nums text-foreground'
                  : 'font-normal italic text-foreground-tertiary',
              )}
            >
              {property.consumerNumber || 'Consumer no. not available'}
            </Link>
            {property.isPrimary ? (
              <span className="flex-none rounded-pill bg-accent-subtle px-2 py-0.5 text-[11px] font-medium leading-[13px] text-primary-dark">
                Primary
              </span>
            ) : null}
          </div>
          <small
            title={[typeLabel, place].filter(Boolean).join(' · ')}
            className="block truncate text-[12px] text-foreground-tertiary"
          >
            {[typeLabel, place].filter(Boolean).join(' · ')}
          </small>
        </div>

        <div className="flex flex-none items-start gap-1">
          <div className="whitespace-nowrap text-right">
            <b
              className={cn(
                'block font-semibold tabular-nums',
                (price == null || quote?.voided) && 'font-normal text-foreground-tertiary',
              )}
            >
              {price != null ? formatCurrency(price) : 'Not quoted'}
            </b>
            {size != null ? (
              <small className="block text-[12px] text-foreground-tertiary">
                {formatSystemSize(size)} kW
              </small>
            ) : null}
          </div>
          {/* A click on the menu, or on the backdrop that closes it, is not a click on the site. */}
          <div onClick={stopBlockClick} className="-mr-2 -mt-1.5">
            {/* "View Quote" opens the same quote the line below names. */}
            <PropertyRowActionsMenu
              property={quote ? { ...property, latestQuoteId: quote.id } : property}
              onMarkAsLost={onMarkAsLost}
              onReopen={onReopen}
              onRequestDelete={onRequestDelete}
              showDelete={showDelete}
            />
          </div>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <b className={cn('flex-none text-[13px] font-semibold', property.lost && 'text-error')}>
            {journey?.title ?? '—'}
          </b>
          {journey?.detail ? (
            <span
              title={journey.detail}
              className="min-w-0 truncate text-[12px] text-foreground-tertiary"
            >
              {journey.detail}
            </span>
          ) : null}
        </div>
        {journey ? (
          <JourneyTrack stageIndex={property.stageIndex ?? 0} lost={property.lost} animateIn />
        ) : null}
      </div>

      <dl className="m-0 mt-3 grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12px]">
        <Fact label="Quote">
          {quote ? (
            <>
              <Link
                href={customerLinks.quote(quote.id)}
                prefetch={false}
                onClick={stopBlockClick}
                className={LINK}
              >
                {quote.number}
              </Link>
              {' · '}
              {toTitleLabel(quote.status)}
              {quote.voided ? ' · voided' : null}
            </>
          ) : (
            'Not quoted'
          )}
        </Fact>

        {connection.length > 0 ? (
          <Fact label="Connection">
            <span className="block truncate" title={connection.join(' · ')}>
              {connection.join(' · ')}
            </span>
          </Fact>
        ) : null}

        {next && due ? (
          <Fact label="Follow-up">
            <span
              title={next.subject}
              className={cn('block truncate', due.kind === 'overdue' && 'text-error')}
            >
              {[
                followupTypeLabel(next),
                formatFollowupWhen(next.scheduledAt),
                next.assigneeName,
                due.kind === 'overdue' ? due.label : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </Fact>
        ) : (
          // Needs a follow-up FIRST: an open site whose quote was rejected reads
          // "lost" on its journey but still owes someone an action.
          <Fact label="Follow-up">
            {property.needsFollowup ? (
              <span className="text-error">No follow-up planned</span>
            ) : property.lost ? (
              'Closed'
            ) : (
              'Nothing due'
            )}
          </Fact>
        )}

        <Fact label="Status">
          {/* A meter that is in on a project nobody has closed yet: the journey
              says "Commissioned" while the project still reads "In progress".
              Say both halves in one line instead of leaving them to argue. */}
          {meterInOpenProject ? 'Meter installed · project still open' : lifecycle.label} · added{' '}
          {shortDay(property.createdAt)}
        </Fact>

        {/* A cancelled project is not this site's project any more: a reopened
            site shows none; a lost one may still name the one that was cancelled. */}
        {property.projectId && !projectCancelled ? (
          <Fact label="Project">
            <Link
              href={customerLinks.project(property.projectId)}
              prefetch={false}
              onClick={stopBlockClick}
              className={LINK}
            >
              Open project
            </Link>
          </Fact>
        ) : property.projectId && property.lost ? (
          <Fact label="Project">
            <Link
              href={customerLinks.project(property.projectId)}
              prefetch={false}
              onClick={stopBlockClick}
              className={LINK}
            >
              Cancelled project
            </Link>
          </Fact>
        ) : null}
      </dl>
    </div>
  );
}
