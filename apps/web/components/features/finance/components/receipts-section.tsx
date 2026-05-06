'use client';

import AddIcon from '@mui/icons-material/Add';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { Button, Skeleton } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';

import { ReceiptsTable } from './receipts-table';
import { RecordReceiptDialog } from './record-receipt-dialog';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { MUITypography } from '@/components/ui';
import { usePaymentTerms, useProjectReceipts } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface ReceiptsSectionProps {
  projectId: string;
  /** When set, opens the record dialog with this term pre-selected. Cleared after consume. */
  pendingTermId: string | null;
  onConsumePendingTerm: () => void;
}

export function ReceiptsSection({
  projectId,
  pendingTermId,
  onConsumePendingTerm,
}: ReceiptsSectionProps): JSX.Element {
  const { data: receipts, isLoading, isError, error, refetch } = useProjectReceipts(projectId);
  const { data: terms } = usePaymentTerms(projectId);

  const [recordOpen, setRecordOpen] = useState(false);

  // External request to record against a specific term — open the dialog
  // when the parent supplies a pendingTermId. The parent clears it via
  // onConsumePendingTerm once the dialog closes.
  useEffect(() => {
    if (pendingTermId) setRecordOpen(true);
  }, [pendingTermId]);

  const handleOpenChange = (open: boolean): void => {
    setRecordOpen(open);
    if (!open && pendingTermId) onConsumePendingTerm();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={192} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load receipts"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  const list = receipts ?? [];
  const termList = terms ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <MUITypography variant="sectionTitle">Receipt History</MUITypography>
          <MUITypography variant="finePrint" className="text-foreground-muted block">
            Money received from the customer. Linking to a term updates its paid amount atomically.
          </MUITypography>
        </div>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setRecordOpen(true)}
        >
          Record Receipt
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<PaymentsOutlinedIcon style={{ width: '100%', height: '100%' }} />}
          iconColor="muted"
          title="No receipts recorded"
          description="Receipts logged here update the linked payment term's paid amount automatically."
          action={{ label: 'Record Receipt', onClick: () => setRecordOpen(true) }}
        />
      ) : (
        <ReceiptsTable receipts={list} terms={termList} projectId={projectId} />
      )}

      <RecordReceiptDialog
        open={recordOpen}
        onOpenChange={handleOpenChange}
        projectId={projectId}
        defaultTermId={pendingTermId}
        terms={termList}
      />
    </div>
  );
}
