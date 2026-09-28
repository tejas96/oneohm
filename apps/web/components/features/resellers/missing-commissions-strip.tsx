'use client';

import { Alert, Box, Button, Collapse } from '@mui/material';
import { type JSX, useState } from 'react';

import { useCommissionMutations, useMissingCommissions, type MissingRow } from '@/lib/hooks/resources/resellers';
import { useGatedAction } from '@/lib/rbac';
import { formatBusinessDate } from '@/lib/utils';

/**
 * One row of the strip.
 *
 * A real component, not a plain function called from `.map()` — `since` and
 * `before` change length as rows get fixed, and `useGatedAction` is a hook.
 * Calling a hook from a loop-body function whose iteration count varies across
 * renders breaks the rules of hooks; giving each row its own component gives
 * each item a stable hook-call sequence instead.
 */
function MissingCommissionRow({
  r,
  onCreate,
  onDismiss,
  creating,
  dismissing,
}: {
  r: MissingRow;
  onCreate: (quoteId: string) => void;
  onDismiss: (v: { quoteId: string; note: string }) => void;
  creating: boolean;
  dismissing: boolean;
}): JSX.Element {
  const create = useGatedAction('finance.payments.record', () => onCreate(r.quoteId), 'Fix missing commissions');
  const dismiss = useGatedAction(
    'finance.payments.record',
    () => {
      const note = window.prompt(`Why does ${r.quoteNumber} earn no commission?`);
      if (note && note.trim().length >= 3) onDismiss({ quoteId: r.quoteId, note: note.trim() });
    },
    'Fix missing commissions',
  );

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 0.75, flexWrap: 'wrap' }}>
      <Box sx={{ flex: '1 1 260px' }}>
        <strong>{r.quoteNumber}</strong> · {r.customerName} · {r.resellerName} · won {formatBusinessDate(r.acceptedAt)}
      </Box>
      <Button
        size="small"
        variant="contained"
        disabled={creating}
        aria-disabled={!create.allowed}
        sx={{ opacity: create.allowed ? 1 : 0.45 }}
        onClick={create.onGatedClick}
      >
        Create
      </Button>
      <Button
        size="small"
        disabled={dismissing}
        aria-disabled={!dismiss.allowed}
        sx={{ opacity: dismiss.allowed ? 1 : 0.45 }}
        onClick={dismiss.onGatedClick}
      >
        Dismiss
      </Button>
    </Box>
  );
}

/**
 * Accepted reseller deals with no commission row (spec §10.3). Renders
 * NOTHING at zero — a green "all good" strip is a fact nobody needs.
 */
export function MissingCommissionsStrip(): JSX.Element | null {
  const { data } = useMissingCommissions();
  const [open, setOpen] = useState(false);
  const m = useCommissionMutations();

  const since = data?.sinceLaunch ?? [];
  const before = data?.beforeLaunch ?? [];
  const total = since.length + before.length;
  if (total === 0) return null;

  const row = (r: MissingRow): JSX.Element => (
    <MissingCommissionRow
      key={r.quoteId}
      r={r}
      onCreate={(quoteId) => m.createMissing.mutate(quoteId)}
      onDismiss={(v) => m.dismissMissing.mutate(v)}
      creating={m.createMissing.isPending}
      dismissing={m.dismissMissing.isPending}
    />
  );

  return (
    <Alert
      severity="warning"
      action={
        <Button size="small" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Review'}
        </Button>
      }
    >
      {total === 1 ? '1 accepted deal has no commission row.' : `${total} accepted deals have no commission row.`}
      <Collapse in={open}>
        {since.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <strong>Since launch</strong>
            {since.map(row)}
          </Box>
        )}
        {before.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <strong>Before launch</strong> — decide each one
            {before.map(row)}
          </Box>
        )}
      </Collapse>
    </Alert>
  );
}
