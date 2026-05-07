'use client';

import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Button, Skeleton } from '@mui/material';
import { type JSX, useState } from 'react';

import { AddPaymentTermDialog } from './add-payment-term-dialog';
import { PaymentTermRow } from './payment-term-row';
import { WaivePaymentTermDialog } from './waive-payment-term-dialog';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { MUITypography } from '@/components/ui';
import { type PaymentTerm, usePaymentTermMutations, usePaymentTerms } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface PaymentTermsSectionProps {
  projectId: string;
  /** Lifted to the parent so the Receipts subtab can pre-select a term when invoked from this section. */
  onRecordReceipt: (termId: string | null) => void;
}

export function PaymentTermsSection({
  projectId,
  onRecordReceipt,
}: PaymentTermsSectionProps): JSX.Element {
  const { data: terms, isLoading, isError, error, refetch } = usePaymentTerms(projectId);
  const { resnapshot } = usePaymentTermMutations(projectId);

  const [addOpen, setAddOpen] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState<PaymentTerm | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={96} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load payment terms"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  const list = terms ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <MUITypography variant="sectionTitle">Planned Installments</MUITypography>
          <MUITypography variant="finePrint" className="text-foreground-muted block">
            What you expect to receive from the customer, mapped to milestones.
          </MUITypography>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={() => resnapshot.mutate()}
            disabled={resnapshot.isPending}
            title="Re-snapshot from latest quote (only allowed when no receipts are linked)"
          >
            Re-snapshot
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setAddOpen(true)}
          >
            Add Term
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarMonthOutlinedIcon style={{ width: '100%', height: '100%' }} />}
          iconColor="muted"
          title="No payment terms defined"
          description="Terms are usually snapshotted from the project's quote. Add manual installments for ad-hoc collections."
          action={{ label: 'Add Term', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="space-y-2">
          {list.map((term) => (
            <PaymentTermRow
              key={term.id}
              term={term}
              projectId={projectId}
              onRecordReceipt={(termId) => onRecordReceipt(termId)}
              onWaive={(t) => setWaiveTarget(t)}
            />
          ))}
        </div>
      )}

      <AddPaymentTermDialog open={addOpen} onOpenChange={setAddOpen} projectId={projectId} />
      <WaivePaymentTermDialog
        open={waiveTarget !== null}
        onOpenChange={(open) => !open && setWaiveTarget(null)}
        projectId={projectId}
        term={waiveTarget}
      />
    </div>
  );
}
