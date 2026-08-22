'use client';

import { FollowupStatus } from '@tejas96/shared/types';
import { useMemo, useState, type JSX } from 'react';

import { FollowupCompleteDialog } from './followup-complete-dialog';
import { FollowupDetailDialog } from './followup-detail-dialog';
import { FollowupReassignDialog } from './followup-reassign-dialog';
import { FollowupRescheduleDialog } from './followup-reschedule-dialog';
import { useCancelFollowup } from '../hooks/use-followup-mutations';
import { type FollowupResponse } from '../hooks/use-followups';

import { showToast } from '@/components/ui';
import { getErrorMessage } from '@/lib/utils';

export interface FollowupDetailHostProps {
  followupId: string | null;
  initialData?: FollowupResponse;
  onClose: () => void;
  /** Rows used to count pending siblings when completing from the detail modal. */
  siblingRows?: FollowupResponse[];
  scopeCustomerId?: string;
  scopePropertyId?: string;
  onMarkLost?: (followup: FollowupResponse) => void;
}

/**
 * One place for the detail modal and the write dialogs it hands off to.
 *
 * Mounted once per page so tab, overview, and activity never each grow their
 * own copy.
 */
export function FollowupDetailHost({
  followupId,
  initialData,
  onClose,
  siblingRows = [],
  scopeCustomerId,
  scopePropertyId,
  onMarkLost,
}: FollowupDetailHostProps): JSX.Element {
  const [completing, setCompleting] = useState<FollowupResponse | null>(null);
  const [rescheduling, setRescheduling] = useState<FollowupResponse | null>(null);
  const [reassigning, setReassigning] = useState<FollowupResponse[]>([]);
  const cancelMutation = useCancelFollowup();

  const pendingSiblings = useMemo(() => {
    if (!completing) return 0;
    const unitId = completing.propertyId ?? null;
    return siblingRows.filter(
      (row) =>
        row.status === FollowupStatus.PENDING &&
        row.id !== completing.id &&
        row.customerId === completing.customerId &&
        (row.propertyId ?? null) === unitId,
    ).length;
  }, [siblingRows, completing]);

  return (
    <>
      <FollowupDetailDialog
        followupId={followupId}
        initialData={initialData}
        onClose={onClose}
        scopeCustomerId={scopeCustomerId}
        scopePropertyId={scopePropertyId}
        onComplete={setCompleting}
        onReschedule={setRescheduling}
        onReassign={(followup) => setReassigning([followup])}
        onCancel={(followup) =>
          cancelMutation.mutate(followup.id, {
            onSuccess: () =>
              showToast.success('Follow-up cancelled — the lead now needs a new one'),
            onError: (error) => showToast.error(getErrorMessage(error)),
          })
        }
      />

      <FollowupCompleteDialog
        open={Boolean(completing)}
        followup={completing}
        pendingSiblings={pendingSiblings}
        onClose={() => setCompleting(null)}
        onMarkLost={
          onMarkLost && completing?.propertyId
            ? () => {
                onMarkLost(completing);
                setCompleting(null);
              }
            : undefined
        }
      />

      <FollowupRescheduleDialog followup={rescheduling} onClose={() => setRescheduling(null)} />

      <FollowupReassignDialog followups={reassigning} onClose={() => setReassigning([])} />
    </>
  );
}
