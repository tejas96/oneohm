'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { type JSX, useCallback, useEffect, useMemo, useState } from 'react';

import {
  FINANCE_DEFAULT_SUB_TAB,
  FINANCE_SUB_TABS,
  isFinanceSubTab,
  type FinanceSubTab,
} from '../constants';
import { ExpensesSection } from './expenses-section';
import { FinanceSummaryStrip } from './finance-summary-strip';
import { PaymentTermsSection } from './payment-terms-section';
import { ReceiptsSection } from './receipts-section';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectReceiptSummary } from '@/lib/hooks/resources';

interface ProjectFinanceTabProps {
  projectId: string;
  isActive: boolean;
}

/**
 * Top-level Finance tab for the project detail page. Wraps three
 * subtabs — Payment Terms, Receipts, Expenses — under a single sticky
 * summary strip that always reflects canonical totals from the
 * receipts summary endpoint.
 *
 * The Expenses subtab is wired up in slice 3; until then it shows a
 * lightweight placeholder so the IA stays consistent.
 */
export const ProjectFinanceTab = React.memo(
  ({ projectId, isActive }: ProjectFinanceTabProps): JSX.Element => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const subParam = searchParams.get('sub');
    const initialSub: FinanceSubTab = isFinanceSubTab(subParam)
      ? subParam
      : FINANCE_DEFAULT_SUB_TAB;
    const [subTab, setSubTab] = useState<FinanceSubTab>(initialSub);

    // Keep local state in sync with URL navigation (back/forward etc.).
    useEffect(() => {
      const next: FinanceSubTab = isFinanceSubTab(subParam) ? subParam : FINANCE_DEFAULT_SUB_TAB;
      setSubTab(next);
    }, [subParam]);

    const handleSubChange = useCallback(
      (next: string) => {
        if (!isFinanceSubTab(next)) return;
        setSubTab(next);
        const params = new URLSearchParams(searchParams.toString());
        params.set('sub', next);
        router.replace(`?${params.toString()}`, { scroll: false });
      },
      [router, searchParams],
    );

    // Cross-section coordination: clicking "Receipt" on a term row jumps
    // to the Receipts subtab and pre-fills the term in the create dialog.
    const [pendingTermId, setPendingTermId] = useState<string | null>(null);

    const handleRecordForTerm = useCallback(
      (termId: string | null) => {
        setPendingTermId(termId);
        handleSubChange('receipts');
      },
      [handleSubChange],
    );

    const { data: summary, isLoading: summaryLoading } = useProjectReceiptSummary(projectId, {
      enabled: isActive,
    });

    const subTabs = useMemo(() => FINANCE_SUB_TABS, []);

    return (
      <div className="space-y-4">
        {/* Sticky summary header — sits just under the project page tabs so
          users keep canonical totals visible while scrolling long lists. */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border-light">
          <FinanceSummaryStrip summary={summary} isLoading={summaryLoading && isActive} />
        </div>

        <Tabs value={subTab} onValueChange={handleSubChange}>
          <TabsList>
            {subTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="terms" className="mt-4">
            <PaymentTermsSection projectId={projectId} onRecordReceipt={handleRecordForTerm} />
          </TabsContent>

          <TabsContent value="receipts" className="mt-4">
            <ReceiptsSection
              projectId={projectId}
              pendingTermId={pendingTermId}
              onConsumePendingTerm={() => setPendingTermId(null)}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <ExpensesSection projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    );
  },
);
