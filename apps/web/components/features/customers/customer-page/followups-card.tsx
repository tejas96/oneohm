'use client';

import { FollowupStatus } from '@tejas96/shared/types';
import { type JSX, useEffect, useMemo, useState } from 'react';

import type { CustomerPropertyResponse } from '../hooks';
import { CardBones, CardError, MoreToggle, PageCard, TEXT_ACTION } from './parts';

import {
  FollowupCompleteDialog,
  FollowupReassignDialog,
  FollowupRescheduleDialog,
  FollowupRowActions,
  OUTCOME_LABELS,
  followupIsPastDue,
  useCancelFollowup,
  type FollowupResponse,
} from '@/components/features/followups';
import { MarkAsLostDialog } from '@/components/features/properties';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { QuietPill } from '@/components/shared/calm-list';
import { showToast } from '@/components/ui';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatFollowupWhen, getErrorMessage, toTitleLabel } from '@/lib/utils';

/** A follow-up belongs to a site, or to the customer as a whole. */
function scopeLabel(followup: FollowupResponse): string {
  return followup.property
    ? getPropertyDisplayName(followup.property as CustomerPropertyResponse)
    : 'Customer-level';
}

/** The assignee is the lead's owner — there is no separate owner field. */
function ownerName(followup: FollowupResponse): string {
  return (
    [followup.assignedToUser?.firstName, followup.assignedToUser?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Unassigned'
  );
}

export interface FollowupsCardProps {
  /** Every follow-up of the customer, all sites. */
  followups: FollowupResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** The customer has more follow-ups than one read returns. */
  cut: boolean;
  onSchedule: () => void;
  onView: (followupId: string) => void;
  /** Set by the attention list's "Complete": opens that follow-up's dialog. */
  completeRequest: string | null;
  onCompleteRequestHandled: () => void;
  delayMs?: number;
}

/**
 * Every follow-up of the customer: the open ones with their actions, the done
 * ones one click away. The dialogs are the shared ones every follow-up list
 * uses, so completing here cannot behave differently from completing there.
 */
export function FollowupsCard({
  followups,
  isLoading,
  isError,
  onRetry,
  cut,
  onSchedule,
  onView,
  completeRequest,
  onCompleteRequestHandled,
  delayMs,
}: FollowupsCardProps): JSX.Element {
  const schedule = useGatedAction('followups.manage', onSchedule, 'Schedule follow-up');
  const cancelFollowup = useCancelFollowup();
  const [showDone, setShowDone] = useState(false);
  const [completing, setCompleting] = useState<FollowupResponse | null>(null);
  const [rescheduling, setRescheduling] = useState<FollowupResponse | null>(null);
  const [reassigning, setReassigning] = useState<FollowupResponse[]>([]);
  const [markingLost, setMarkingLost] = useState<{ id: string; name: string } | null>(null);

  const open = useMemo(
    () =>
      followups
        .filter((followup) => followup.status === FollowupStatus.PENDING)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [followups],
  );
  const closed = useMemo(
    () => followups.filter((followup) => followup.status !== FollowupStatus.PENDING),
    [followups],
  );

  // The attention list asked for one to be completed.
  useEffect(() => {
    if (!completeRequest) return;
    const target = open.find((followup) => followup.id === completeRequest);
    if (target) setCompleting(target);
    onCompleteRequestHandled();
  }, [completeRequest, open, onCompleteRequestHandled]);

  /*
   * Pending follow-ups on the SAME lead unit as the one being completed. The
   * list spans the whole customer, so a sibling site's follow-ups must not
   * count: they would make the next-follow-up block optional and let this
   * site go dark.
   */
  const pendingSiblings = completing
    ? open.filter(
        (followup) =>
          followup.id !== completing.id &&
          (followup.propertyId ?? null) === (completing.propertyId ?? null),
      ).length
    : 0;

  const actions = (followup: FollowupResponse): JSX.Element => (
    <FollowupRowActions
      followup={followup}
      onViewDetails={() => onView(followup.id)}
      onComplete={setCompleting}
      onReschedule={setRescheduling}
      onReassign={(target) => setReassigning([target])}
      onCancel={(target) =>
        cancelFollowup.mutate(target.id, {
          onSuccess: () => showToast.success('Follow-up cancelled — the lead now needs a new one'),
          onError: (error) => showToast.error(getErrorMessage(error)),
        })
      }
    />
  );

  return (
    <PageCard
      id="followups"
      delayMs={delayMs}
      // No count until the list is in: "0 open" over a loading card is a claim.
      title={isLoading || isError ? 'Follow-ups' : `Follow-ups · ${open.length} open`}
      action={
        <button
          type="button"
          className={TEXT_ACTION}
          aria-disabled={!schedule.allowed}
          onClick={schedule.onGatedClick}
        >
          Schedule
        </button>
      }
    >
      {isLoading ? (
        <CardBones rows={2} />
      ) : isError ? (
        <CardError what="the follow-ups" onRetry={onRetry} />
      ) : open.length === 0 && !showDone ? (
        <p className="m-0 text-[13px] text-foreground-secondary">Nothing is planned.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {open.map((followup) => {
            const late = followupIsPastDue(followup.scheduledAt);
            return (
              <li
                key={followup.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border py-2.5 first:border-t-0 first:pt-0"
              >
                <button
                  type="button"
                  onClick={() => onView(followup.id)}
                  className="min-w-0 text-left"
                >
                  <span className="block truncate text-[14px] font-medium">
                    {followup.subject.trim() || 'Untitled follow-up'}
                  </span>
                  <span
                    className={cn(
                      'block text-[13px] tabular-nums',
                      late ? 'text-error' : 'text-foreground-secondary',
                    )}
                  >
                    {formatFollowupWhen(followup.scheduledAt)}
                    {late ? ' · past due' : ''}
                  </span>
                  <span className="block truncate text-[13px] text-foreground-secondary">
                    {[toTitleLabel(followup.type), scopeLabel(followup), ownerName(followup)].join(
                      ' · ',
                    )}
                  </span>
                  {followup.notes ? (
                    <span className="block truncate text-[12px] text-foreground-tertiary">
                      {followup.notes}
                    </span>
                  ) : null}
                </button>
                {actions(followup)}
              </li>
            );
          })}
          {showDone
            ? closed.map((followup) => (
                <li
                  key={followup.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                >
                  <button
                    type="button"
                    onClick={() => onView(followup.id)}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate text-[14px] font-medium text-foreground-secondary">
                      {followup.subject.trim() || 'Untitled follow-up'}
                    </span>
                    <span className="block truncate text-[13px] text-foreground-secondary">
                      {[
                        toTitleLabel(followup.type),
                        scopeLabel(followup),
                        ownerName(followup),
                        `planned ${formatFollowupWhen(followup.scheduledAt)}`,
                        followup.completedAt
                          ? `done ${formatFollowupWhen(followup.completedAt)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {followup.notes ? (
                      <span className="block truncate text-[12px] text-foreground-tertiary">
                        {followup.notes}
                      </span>
                    ) : null}
                  </button>
                  <span className="flex items-center gap-1">
                    <QuietPill
                      label={
                        followup.outcome
                          ? OUTCOME_LABELS[followup.outcome]
                          : toTitleLabel(followup.status)
                      }
                      tone={followup.status === FollowupStatus.COMPLETED ? 'success' : 'neutral'}
                      whole
                    />
                    {actions(followup)}
                  </span>
                </li>
              ))
            : null}
        </ul>
      )}
      {cut ? (
        <p className="m-0 mt-2 text-[12px] text-foreground-tertiary">
          This customer has many follow-ups. Every open one and the newest finished ones are listed;
          some old ones are not.
        </p>
      ) : null}
      {closed.length > 0 ? (
        <MoreToggle
          open={showDone}
          onToggle={() => setShowDone((value) => !value)}
          closedLabel={`${closed.length} done or cancelled`}
        />
      ) : null}

      <FollowupCompleteDialog
        open={Boolean(completing)}
        followup={completing}
        pendingSiblings={pendingSiblings}
        onClose={() => setCompleting(null)}
        /*
         * Only a site's follow-up can end in "lost": losing a site is a
         * per-site action, and a customer-level lead has no site to lose.
         */
        onMarkLost={
          completing?.propertyId
            ? () => {
                const target = {
                  id: completing.propertyId as string,
                  name: scopeLabel(completing),
                };
                setCompleting(null);
                setMarkingLost(target);
              }
            : undefined
        }
      />
      <FollowupRescheduleDialog followup={rescheduling} onClose={() => setRescheduling(null)} />
      <FollowupReassignDialog followups={reassigning} onClose={() => setReassigning([])} />
      {markingLost ? (
        <MarkAsLostDialog
          open
          onClose={() => setMarkingLost(null)}
          propertyId={markingLost.id}
          propertyName={markingLost.name}
        />
      ) : null}
    </PageCard>
  );
}
