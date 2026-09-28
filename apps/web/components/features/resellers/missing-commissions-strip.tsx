'use client';

import { Alert, Box, Button, Collapse } from '@mui/material';
import { type JSX, useState } from 'react';

import { ReasonDialog } from './commission-dialogs';

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
  onDismissRequest,
  creating,
  dismissing,
}: {
  r: MissingRow;
  onCreate: (quoteId: string) => void;
  onDismissRequest: (r: MissingRow) => void;
  creating: boolean;
  dismissing: boolean;
}): JSX.Element {
  const create = useGatedAction('finance.payments.record', () => onCreate(r.quoteId), 'Fix missing commissions');
  // Opens the confirm dialog rather than prompting inline — `ReasonDialog`
  // (Task 15) replaces the `window.prompt` this strip used to call directly.
  const dismiss = useGatedAction('finance.payments.record', () => onDismissRequest(r), 'Fix missing commissions');

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
  // Wrapped in `{ row }` rather than a bare `MissingRow | null` — the raw
  // union tripped `no-redundant-type-constituents` (typescript-eslint reads
  // `MissingRow` as an error type in that position; `tsc --noEmit` is clean,
  // so this is a lint-only quirk of this module, same family as the
  // pre-existing `no-unsafe-return`s in `resellers.ts`). Nesting it inside an
  // object type sidesteps the false positive without changing behavior.
  const [dismissing, setDismissing] = useState<{ row: MissingRow } | null>(null);
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
      onDismissRequest={(target) => setDismissing({ row: target })}
      creating={m.createMissing.isPending}
      dismissing={m.dismissMissing.isPending}
    />
  );

  return (
    <>
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
      {dismissing && (
        <ReasonDialog
          open
          title={`Dismiss ${dismissing.row.quoteNumber}`}
          description="Why does this deal earn no commission?"
          confirmLabel="Dismiss"
          busy={m.dismissMissing.isPending}
          onClose={() => setDismissing(null)}
          onConfirm={(note) => {
            const quoteId = dismissing.row.quoteId;
            m.dismissMissing.mutate({ quoteId, note }, { onSuccess: () => setDismissing(null) });
          }}
        />
      )}
    </>
  );
}
