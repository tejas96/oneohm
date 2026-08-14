'use client';

import { useCallback } from 'react';

import { useReceiptPdf } from '@/components/features/ledger/hooks/use-receipt-pdf';
import type { ProjectDetail } from '@/components/features/projects/hooks/types';
import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import type { LedgerEntry, ProjectLedgerSummary } from '@/lib/hooks/resources/ledger';
import type { PaymentApproval } from '@/lib/hooks/resources/payment-approvals';
import { getErrorMessage } from '@/lib/utils/error';

interface ProjectBundle {
  project: ProjectDetail;
  summary: ProjectLedgerSummary;
  entries: LedgerEntry[];
}

async function fetchProjectBundle(projectId: string): Promise<ProjectBundle> {
  const [project, summary, entries] = await Promise.all([
    apiClient.get<ProjectDetail>(`/projects/${projectId}`).then((r) => r.data),
    apiClient
      .get<ProjectLedgerSummary>(`/projects/${projectId}/ledger/summary`)
      .then((r) => r.data),
    apiClient.get<LedgerEntry[]>(`/projects/${projectId}/ledger/entries`).then((r) => r.data),
  ]);
  return { project, summary, entries };
}

/**
 * Files the receipt PDF the moment a receipt clears approval.
 *
 * Before the approval queue existed, `RecordMoneyDialog` fired
 * `onReceiptRecorded` the instant `recordReceipt` returned, because recording
 * a payment and creating its ledger entry were the same step. The approval
 * queue split that in two: recording now only creates a pending row, and the
 * ledger entry — the thing a receipt actually needs — is not created until
 * someone approves it. `onReceiptRecorded` was removed with the old dialog,
 * and nothing was ever wired to the new place the entry is born, so every
 * approved receipt has been going undocumented since. This is that wiring,
 * moved to where the entry now actually exists.
 *
 * `regenerateReceipt` on the project Money tab (`use-receipt-pdf.ts`) stays
 * as the manual retry for when this fails, exactly as it was the retry for
 * the original automatic filing.
 */
export function useAutoFileApprovedReceipts(): {
  fileOne: (approval: PaymentApproval, bundle?: ProjectBundle) => Promise<void>;
  fileMany: (approvals: PaymentApproval[]) => Promise<void>;
  fileManyByIds: (ids: string[]) => Promise<void>;
} {
  const receiptPdf = useReceiptPdf();

  const fileOne = useCallback(
    async (approval: PaymentApproval, bundle?: ProjectBundle): Promise<void> => {
      // Expenses and reversals never had a customer-facing receipt; nothing to file.
      if (approval.kind !== 'receipt' || !approval.ledgerEntryId) return;

      let resolved: ProjectBundle;
      try {
        resolved = bundle ?? (await fetchProjectBundle(approval.projectId));
      } catch (error) {
        showToast.error(
          `${approval.requestNo} approved, but its receipt could not be filed: ` +
            `${getErrorMessage(error)}. Use Receipt on the entry in the project Money tab to try again.`,
        );
        return;
      }

      const entry = resolved.entries.find((e) => e.id === approval.ledgerEntryId);
      if (!entry) {
        showToast.error(
          `${approval.requestNo} approved, but its receipt could not be filed: the ledger entry ` +
            'was not found. Use Receipt on the entry in the project Money tab to try again.',
        );
        return;
      }

      // generateAndFile never throws — it reports its own failure and returns false.
      const filed = await receiptPdf.generateAndFile(entry, resolved.summary, resolved.project);
      if (filed) {
        showToast.success(`Receipt for ${entry.entryNo} filed in customer documents`);
      }
    },
    [receiptPdf],
  );

  /**
   * Sequential on purpose, same as backend bulk-approve: `generateAndFile`
   * guards against a second call starting before the first finishes, so
   * running these concurrently would silently drop every entry after the
   * first. One project bundle is fetched per distinct project in the batch,
   * not per row, since bulk-approving several receipts on the same project
   * is the common case.
   */
  const fileMany = useCallback(
    async (approvals: PaymentApproval[]): Promise<void> => {
      const receipts = approvals.filter((a) => a.kind === 'receipt' && a.ledgerEntryId);
      const bundles = new Map<string, ProjectBundle>();

      for (const approval of receipts) {
        let bundle = bundles.get(approval.projectId);
        if (!bundle) {
          try {
            bundle = await fetchProjectBundle(approval.projectId);
            bundles.set(approval.projectId, bundle);
          } catch (error) {
            showToast.error(
              `Approved, but receipts for ${approval.projectNumber ?? 'this project'} could not ` +
                `be filed: ${getErrorMessage(error)}.`,
            );
            continue;
          }
        }
        await fileOne(approval, bundle);
      }
    },
    [fileOne],
  );

  /**
   * Bulk-approve only returns the approved ids, not the rows — the pre-approval
   * rows in hand still have `ledgerEntryId: null`. Refetching each one is a
   * plain read, so these run in parallel; only the filing itself is sequential.
   */
  const fileManyByIds = useCallback(
    async (ids: string[]): Promise<void> => {
      if (ids.length === 0) return;
      const rows = await Promise.all(
        ids.map((id) =>
          apiClient
            .get<PaymentApproval>(`/payment-approvals/${id}`)
            .then((r) => r.data)
            .catch(() => null),
        ),
      );
      await fileMany(rows.filter((row): row is PaymentApproval => row !== null));
    },
    [fileMany],
  );

  return { fileOne, fileMany, fileManyByIds };
}
