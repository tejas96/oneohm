'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { generateReceiptPdfBlob, downloadReceiptPdf } from '../services/receipt-pdf.service';
import {
  RECEIPT_DEFAULT_COMPANY,
  type ReceiptAllocationLine,
  type ReceiptPdfData,
} from '../services/receipt-pdf.template';

import type { ProjectDetail } from '@/components/features/projects/hooks/types';
import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { useOrgContext } from '@/lib/hooks/core';
import type { LedgerEntry, ProjectLedgerSummary } from '@/lib/hooks/resources/ledger';
import { getErrorMessage } from '@/lib/utils/error';

/**
 * Build the receipt payload from data already on the page.
 *
 * The per-milestone split is the part that matters and the part that has to be
 * read back from the server: the waterfall decides which instalments a payment
 * lands on, and the client must not guess. `summary.milestones[].allocations[]`
 * carries `entryId`, so the rows belonging to this entry can be picked out
 * exactly rather than inferred from amounts.
 */
export function buildReceiptData(
  entry: LedgerEntry,
  summary: ProjectLedgerSummary,
  project: ProjectDetail,
): ReceiptPdfData {
  const allocations: ReceiptAllocationLine[] = summary.milestones.flatMap((m) =>
    m.allocations
      .filter((a) => a.entryId === entry.id && a.allocatedPaise > 0)
      .map((a) => ({ milestoneName: m.name, allocatedPaise: a.allocatedPaise })),
  );

  const applied = allocations.reduce((sum, a) => sum + a.allocatedPaise, 0);

  return {
    entry: {
      entryNo: entry.entryNo,
      amountPaise: entry.amountPaise,
      valueDate: entry.valueDate,
      paymentMethod: entry.paymentMethod,
      reference: entry.reference,
      notes: entry.notes,
    },
    project: { projectNumber: project.projectNumber, name: project.name },
    customer: {
      name: project.property?.customerName,
      phone: project.property?.customerPhone,
      email: project.property?.customerEmail,
    },
    site: {
      address: project.property?.address,
      city: project.property?.city,
      state: project.property?.state,
      pincode: project.property?.pincode,
      consumerNumber: project.property?.consumerNumber,
    },
    allocations,
    // Whatever this payment did not settle sits as credit. Derived from THIS
    // entry, not from the project's total unallocated — an older overpayment is
    // not part of today's receipt.
    unappliedPaise: Math.max(0, entry.amountPaise - applied),
    balance: {
      contractPaise: summary.contractPaise,
      receivedPaise: summary.receivedPaise,
      outstandingPaise: summary.outstandingPaise,
    },
    company: RECEIPT_DEFAULT_COMPANY,
  };
}

interface UseReceiptPdfResult {
  /** Render, upload, and file the receipt. Never throws. */
  generateAndFile: (
    entry: LedgerEntry,
    summary: ProjectLedgerSummary,
    project: ProjectDetail,
  ) => Promise<boolean>;
  /** Render and save locally — the fallback when filing failed. */
  download: (
    entry: LedgerEntry,
    summary: ProjectLedgerSummary,
    project: ProjectDetail,
  ) => Promise<void>;
  isBusy: boolean;
}

export function useReceiptPdf(): UseReceiptPdfResult {
  const { orgHeaders } = useOrgContext();
  const queryClient = useQueryClient();
  const [isBusy, setIsBusy] = useState(false);

  const generateAndFile = useCallback(
    async (entry: LedgerEntry, summary: ProjectLedgerSummary, project: ProjectDetail) => {
      setIsBusy(true);
      try {
        const data = buildReceiptData(entry, summary, project);
        const { blob, filename } = await generateReceiptPdfBlob(data);

        const form = new FormData();
        form.append('file', new File([blob], filename, { type: 'application/pdf' }));

        await apiClient.post(`/ledger/entries/${entry.id}/receipt-document`, form, {
          headers: orgHeaders,
        });

        // The document list is a different query key; without this an already
        // open Documents tab keeps showing the pre-receipt list.
        await queryClient.invalidateQueries({ queryKey: ['documents'] });
        return true;
      } catch (error) {
        // Deliberately NOT rethrown. The payment is already committed and must
        // not appear to have failed because a PDF did not render. The message
        // says what actually went wrong and points at the retry.
        showToast.error(
          `Payment saved, but the receipt could not be filed: ${getErrorMessage(error)}. ` +
            'Use Receipt on the entry to try again.',
        );
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [orgHeaders, queryClient],
  );

  const download = useCallback(
    async (entry: LedgerEntry, summary: ProjectLedgerSummary, project: ProjectDetail) => {
      setIsBusy(true);
      try {
        await downloadReceiptPdf(buildReceiptData(entry, summary, project));
      } catch (error) {
        showToast.error(getErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [],
  );

  return { generateAndFile, download, isBusy };
}
