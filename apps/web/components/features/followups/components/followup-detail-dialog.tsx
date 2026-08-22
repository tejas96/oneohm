'use client';

import { Box, Button, Link as MuiLink, Skeleton, Stack } from '@mui/material';
import { FollowupStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, type JSX, type ReactNode } from 'react';

import { OUTCOME_LABELS } from '../constants';
import { useFollowup, type FollowupResponse } from '../hooks/use-followups';
import { followupIsPastDue } from '../lib/due';
import { followupDetailScopeError } from '../lib/followup-detail-scope';
import { followupRecordHref } from '../lib/followup-href';

import { CrmStatusPill, type CrmTone } from '@/components/shared/crm-table';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  showToast,
} from '@/components/ui';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import { formatDate, formatFollowupWhen, toTitleLabel } from '@/lib/utils';

const STATUS_TONE: Record<FollowupStatus, CrmTone> = {
  [FollowupStatus.PENDING]: 'warning',
  [FollowupStatus.COMPLETED]: 'success',
  [FollowupStatus.CANCELLED]: 'neutral',
};

const PRIORITY_TONE: Record<string, CrmTone> = {
  high: 'danger',
  normal: 'neutral',
  low: 'info',
};

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <MUITypography variant="metaLabel">{label}</MUITypography>
      <Box sx={{ mt: 0.25 }}>{children}</Box>
    </Box>
  );
}

function leadLabel(followup: FollowupResponse): string {
  if (followup.property) {
    return followup.property.propertyName?.trim() || followup.property.city?.trim() || 'Site';
  }
  return (
    [followup.customer?.firstName, followup.customer?.lastName].filter(Boolean).join(' ').trim() ||
    'Customer lead'
  );
}

function customerLabel(followup: FollowupResponse): string {
  return (
    [followup.customer?.firstName, followup.customer?.lastName].filter(Boolean).join(' ').trim() ||
    '—'
  );
}

function ownerLabel(followup: FollowupResponse): string {
  return (
    [followup.assignedToUser?.firstName, followup.assignedToUser?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Unassigned'
  );
}

export interface FollowupDetailDialogProps {
  followupId: string | null;
  initialData?: FollowupResponse;
  onClose: () => void;
  onComplete: (followup: FollowupResponse) => void;
  onReschedule: (followup: FollowupResponse) => void;
  onReassign: (followup: FollowupResponse) => void;
  onCancel: (followup: FollowupResponse) => void;
  /** When set, a loaded follow-up outside this customer is rejected. */
  scopeCustomerId?: string;
  /** When set, a loaded follow-up outside this property is rejected. */
  scopePropertyId?: string;
}

export function FollowupDetailDialog({
  followupId,
  initialData,
  onClose,
  onComplete,
  onReschedule,
  onReassign,
  onCancel,
  scopeCustomerId,
  scopePropertyId,
}: FollowupDetailDialogProps): JSX.Element {
  const pathname = usePathname();
  const open = Boolean(followupId);

  const {
    data: followup,
    isLoading,
    isError,
  } = useFollowup(followupId, {
    enabled: open,
    initialData: initialData?.id === followupId ? initialData : undefined,
  });

  const handleComplete = (): void => {
    if (!followup) return;
    onClose();
    onComplete(followup);
  };

  const handleReschedule = (): void => {
    if (!followup) return;
    onClose();
    onReschedule(followup);
  };

  const handleReassign = (): void => {
    if (!followup) return;
    onClose();
    onReassign(followup);
  };

  const handleCancel = (): void => {
    if (!followup) return;
    onClose();
    onCancel(followup);
  };

  const complete = useGatedAction('followups.manage', handleComplete, 'Complete follow-up');
  const reschedule = useGatedAction('followups.manage', handleReschedule, 'Reschedule follow-up');
  const reassign = useGatedAction('followups.manage', handleReassign, 'Reassign follow-up');
  const cancel = useGatedAction('followups.manage', handleCancel, 'Cancel follow-up');

  useEffect(() => {
    if (!open || isLoading) return;
    if (isError || !followup) {
      showToast.error('Follow-up not found');
      onClose();
      return;
    }
    const scopeError = followupDetailScopeError(followup, {
      customerId: scopeCustomerId,
      propertyId: scopePropertyId,
    });
    if (scopeError) {
      showToast.error('Follow-up not found');
      onClose();
    }
  }, [open, isLoading, isError, followup, scopeCustomerId, scopePropertyId, onClose]);

  const isPending = followup?.status === FollowupStatus.PENDING;
  const isPastDue =
    followup?.status === FollowupStatus.PENDING &&
    Boolean(followup?.scheduledAt) &&
    followupIsPastDue(followup.scheduledAt);

  const recordHref = followup ? followupRecordHref(followup) : null;
  const onSameRecord = useMemo(() => {
    if (!followup || !pathname || !recordHref) return false;
    if (followup.propertyId) {
      return pathname.includes(buildRouteSegment(ROUTES.PROPERTIES.DETAIL, followup.propertyId));
    }
    return pathname.includes(buildRouteSegment(ROUTES.CUSTOMERS.DETAIL, followup.customerId));
  }, [followup, pathname, recordHref]);

  const title = followup?.subject?.trim() || 'Untitled follow-up';
  const description = followup
    ? `${leadLabel(followup)} · ${toTitleLabel(followup.type)}`
    : undefined;

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>{title}</MUIDialogTitle>
        {description ? <MUIDialogDescription>{description}</MUIDialogDescription> : null}
      </MUIDialogHeader>

      <MUIDialogBody dividers>
        {isLoading && !followup ? (
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rounded" height={80} />
          </Stack>
        ) : followup ? (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <CrmStatusPill
                label={toTitleLabel(followup.type)}
                tone="accent"
                size="sm"
                dot={false}
              />
              <CrmStatusPill
                label={toTitleLabel(followup.priority)}
                tone={PRIORITY_TONE[followup.priority] ?? 'neutral'}
                size="sm"
              />
              <CrmStatusPill
                label={toTitleLabel(followup.status)}
                tone={STATUS_TONE[followup.status]}
                size="sm"
              />
              {isPastDue ? <CrmStatusPill label="Past due" tone="danger" size="sm" /> : null}
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <Field label="Scheduled">
                <MUITypography variant="bodyPrimary">
                  {formatFollowupWhen(followup.scheduledAt)}
                </MUITypography>
              </Field>

              <Field label="Owner">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <MUIAvatar name={ownerLabel(followup)} size="sm" />
                  <MUITypography variant="bodyPrimary" noWrap>
                    {ownerLabel(followup)}
                  </MUITypography>
                </Stack>
              </Field>

              <Field label="Customer">
                <MUITypography variant="bodyPrimary">{customerLabel(followup)}</MUITypography>
              </Field>

              {followup.propertyId ? (
                <Field label="Site">
                  <MUITypography variant="bodyPrimary">{leadLabel(followup)}</MUITypography>
                </Field>
              ) : null}

              {followup.status !== FollowupStatus.PENDING && followup.completedAt ? (
                <Field label="Completed">
                  <MUITypography variant="bodyPrimary">
                    {formatFollowupWhen(followup.completedAt)}
                  </MUITypography>
                </Field>
              ) : null}

              {followup.outcome ? (
                <Field label="Outcome">
                  <MUITypography variant="bodyPrimary">
                    {OUTCOME_LABELS[followup.outcome]}
                  </MUITypography>
                </Field>
              ) : null}

              <Field label="Created">
                <MUITypography variant="timestamp">{formatDate(followup.createdAt)}</MUITypography>
              </Field>

              <Field label="Updated">
                <MUITypography variant="timestamp">{formatDate(followup.updatedAt)}</MUITypography>
              </Field>
            </Box>

            <Field label="Notes">
              {followup.notes?.trim() ? (
                <MUITypography
                  variant="bodyPrimary"
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {followup.notes.trim()}
                </MUITypography>
              ) : (
                <MUITypography variant="placeholder">No notes</MUITypography>
              )}
            </Field>

            {recordHref && !onSameRecord ? (
              <MuiLink component={NextLink} href={recordHref} underline="hover">
                <MUITypography variant="bodyPrimary">Open lead</MUITypography>
              </MuiLink>
            ) : null}
          </Stack>
        ) : null}
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Box sx={{ flex: 1 }} />
        {isPending && followup ? (
          <>
            <Button
              variant="outlined"
              onClick={cancel.onGatedClick}
              aria-disabled={!cancel.allowed}
            >
              Cancel
            </Button>
            <Button
              variant="outlined"
              onClick={reassign.onGatedClick}
              aria-disabled={!reassign.allowed}
            >
              Reassign
            </Button>
            <Button
              variant="outlined"
              onClick={reschedule.onGatedClick}
              aria-disabled={!reschedule.allowed}
            >
              Reschedule
            </Button>
            <Button
              variant="contained"
              onClick={complete.onGatedClick}
              aria-disabled={!complete.allowed}
            >
              Complete
            </Button>
          </>
        ) : null}
      </MUIDialogFooter>
    </MUIDialog>
  );
}

/** Resolves a route template to a path prefix for "already on this record" checks. */
function buildRouteSegment(template: string, id: string): string {
  return template.replace('[id]', id);
}
