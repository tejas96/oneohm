'use client';

import { useCallback } from 'react';

import { useProject } from '@/components/features/projects/hooks/use-project-detail';
import { showToast } from '@/components/ui';
import {
  type PaymentTerm,
  type ProjectExpense,
  type Receipt,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

import { type ExpenseVoucherPdfData } from '../pdf/expense-pdf.template';
import { downloadExpenseVoucherPdf } from '../pdf/expense-pdf.service';
import { type ReceiptPdfData } from '../pdf/receipt-pdf.template';
import { downloadReceiptPdf } from '../pdf/receipt-pdf.service';

interface UseFinancePdfReturn {
  printReceipt: (receipt: Receipt, term?: PaymentTerm | null) => Promise<void>;
  printExpenseVoucher: (expense: ProjectExpense) => Promise<void>;
  isReady: boolean;
}

/**
 * Bundles the PDF download helpers for the Finance subsystem. Reads
 * the cached project (already fetched by ProjectDetailContent) so we
 * can populate company/customer/project blocks without prop drilling
 * through every section + table.
 *
 * Errors are surfaced via toast — html2pdf rarely fails, but DOM
 * cleanup is wrapped in try/finally inside the services so even a
 * failed render leaves no stray off-screen container.
 */
export function useFinancePdf(projectId: string): UseFinancePdfReturn {
  const { data: project } = useProject(projectId);

  const printReceipt = useCallback(
    async (receipt: Receipt, term?: PaymentTerm | null): Promise<void> => {
      if (!project) {
        showToast.error('Project data not loaded yet — try again in a moment');
        return;
      }
      const data: ReceiptPdfData = {
        receipt: {
          paymentNumber: receipt.paymentNumber,
          paidAmount: Number(receipt.paidAmount),
          paymentMethod: receipt.paymentMethod,
          paymentReference: receipt.paymentReference,
          bankName: receipt.bankName,
          accountNumber: receipt.accountNumber,
          ifscCode: receipt.ifscCode,
          notes: receipt.notes,
          status: receipt.status,
          paidAt: receipt.reconciledAt ?? null,
          createdAt: receipt.createdAt,
        },
        project: {
          projectNumber: project.projectNumber,
          name: project.name,
        },
        term: term
          ? {
              name: term.name,
              expectedAmount: Number(term.expectedAmount),
              paidAmount: Number(term.paidAmount),
            }
          : null,
        customer: {
          name: project.property.customerName,
          phone: project.property.customerPhone,
          email: project.property.customerEmail,
          address: [
            project.property.address,
            project.property.city,
            project.property.state,
            project.property.pincode,
          ]
            .filter(Boolean)
            .join(', '),
        },
      };
      try {
        await downloadReceiptPdf(data);
      } catch (err) {
        showToast.error(`Failed to generate PDF: ${getErrorMessage(err)}`);
      }
    },
    [project],
  );

  const printExpenseVoucher = useCallback(
    async (expense: ProjectExpense): Promise<void> => {
      if (!project) {
        showToast.error('Project data not loaded yet — try again in a moment');
        return;
      }
      const data: ExpenseVoucherPdfData = {
        expense: {
          expenseNumber: expense.expenseNumber,
          category: expense.category,
          vendorName: expense.vendorName,
          amount: Number(expense.amount),
          expenseDate: expense.expenseDate,
          paymentMethod: expense.paymentMethod,
          paidBy: expense.paidBy,
          // Employee name is not on ProjectExpense in v1; keep null and
          // surface ID/email later when the resource exposes it.
          paidByEmployeeName: null,
          reimbursementStatus: expense.reimbursementStatus,
          overrideUsed: expense.overrideUsed,
          overrideReason: expense.overrideReason,
          notes: expense.notes,
          productLinks: expense.productLinks?.map((l) => ({
            itemName: l.itemName,
            productId: l.productId,
            unit: l.unit,
            quantity: Number(l.quantity),
            unitPrice: l.unitPrice == null ? null : Number(l.unitPrice),
          })),
          createdAt: expense.createdAt,
        },
        project: {
          projectNumber: project.projectNumber,
          name: project.name,
        },
      };
      try {
        await downloadExpenseVoucherPdf(data);
      } catch (err) {
        showToast.error(`Failed to generate PDF: ${getErrorMessage(err)}`);
      }
    },
    [project],
  );

  return {
    printReceipt,
    printExpenseVoucher,
    isReady: Boolean(project),
  };
}
