'use client';

import { Wallet } from 'lucide-react';
import React from 'react';

import type { QuoteDetail, QuoteVersionDetail } from '../../../hooks/types';

import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';

interface QuotePaymentsTabProps {
  quote: QuoteDetail;
  viewingVersion?: QuoteVersionDetail;
  isActive: boolean;
}

export function QuotePaymentsTab({
  quote,
  viewingVersion,
  isActive: _isActive,
}: QuotePaymentsTabProps): React.JSX.Element {
  const milestones = viewingVersion?.paymentMilestones ?? quote.paymentMilestones ?? [];
  const finalPrice = viewingVersion?.finalPrice ?? quote.finalPrice;

  if (milestones.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={<Wallet className="w-full h-full" />}
          title="No payment milestones"
          description="No payment milestones have been configured for this quote."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Summary */}
      {finalPrice != null && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-foreground-secondary">
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
          </span>
          <span className="text-foreground-secondary">·</span>
          <span className="font-medium">Total: {formatCurrency(finalPrice)}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-background-secondary border-b border-border-light">
              <tr>
                <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Order</th>
                <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Milestone</th>
                <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Stage</th>
                <th className="px-4 py-3 text-right text-2xs font-semibold text-foreground-secondary uppercase">Percentage</th>
                <th className="px-4 py-3 text-right text-2xs font-semibold text-foreground-secondary uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {[...milestones]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((milestone, idx) => (
                  <tr key={`${milestone.stage}-${idx}`} className="hover:bg-muted">
                    <td className="px-4 py-3 text-sm text-foreground-secondary">
                      {milestone.order ?? idx + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {milestone.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="muted" shape="rounded" size="xs">
                        {milestone.stage.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {milestone.percentage}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatCurrency(milestone.amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
