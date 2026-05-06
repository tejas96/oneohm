'use client';

import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { type JSX, useState } from 'react';

import { Button, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import {
  type PaymentTerm,
  usePaymentTermMutations,
  usePaymentTerms,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

import { AddPaymentTermDialog } from './add-payment-term-dialog';
import { PaymentTermRow } from './payment-term-row';
import { WaivePaymentTermDialog } from './waive-payment-term-dialog';

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
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
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
          <h3 className="text-sm font-semibold text-foreground">Planned Installments</h3>
          <p className="text-2xs text-foreground-muted">
            What you expect to receive from the customer, mapped to milestones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => resnapshot.mutate()}
            disabled={resnapshot.isPending}
            title="Re-snapshot from latest quote (only allowed when no receipts are linked)"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Re-snapshot
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5 mr-1" />
            Add Term
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-full h-full" />}
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
