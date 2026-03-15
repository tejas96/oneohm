'use client';

import type { ItemCategory } from '@oneohm-epc/shared/types';
import { Package } from 'lucide-react';
import React, { useMemo } from 'react';

import { ITEM_CATEGORY_LABELS } from '../../../constants';
import type { QuoteDetail, QuoteLineItemDetail, QuoteVersionDetail } from '../../../hooks/types';

import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';

interface QuoteLineItemsTabProps {
  quote: QuoteDetail;
  viewingVersion?: QuoteVersionDetail;
  isActive: boolean;
}

interface GroupedLineItems {
  category: ItemCategory;
  categoryLabel: string;
  items: QuoteLineItemDetail[];
  subtotal: number;
}

export function QuoteLineItemsTab({
  quote,
  viewingVersion,
  isActive: _isActive,
}: QuoteLineItemsTabProps): React.JSX.Element {
  const lineItems = viewingVersion?.lineItems ?? quote.lineItems ?? [];

  const grouped = useMemo((): GroupedLineItems[] => {
    const groups = new Map<ItemCategory, QuoteLineItemDetail[]>();
    for (const item of lineItems) {
      const existing = groups.get(item.itemCategory) ?? [];
      existing.push(item);
      groups.set(item.itemCategory, existing);
    }

    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      categoryLabel: ITEM_CATEGORY_LABELS[category] ?? category,
      items,
      subtotal: items.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0),
    }));
  }, [lineItems]);

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0),
    [lineItems],
  );

  const totalTax = useMemo(
    () => lineItems.reduce((sum, li) => sum + (li.taxAmount ?? 0), 0),
    [lineItems],
  );

  if (lineItems.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={<Package className="w-full h-full" />}
          title="No line items"
          description="This quote version has no line items."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-foreground-secondary">
          {lineItems.length} item{lineItems.length !== 1 ? 's' : ''} across {grouped.length} categor
          {grouped.length !== 1 ? 'ies' : 'y'}
        </span>
        <span className="text-foreground-secondary">·</span>
        <span className="font-medium">Subtotal: {formatCurrency(totalAmount)}</span>
        {totalTax > 0 && (
          <>
            <span className="text-foreground-secondary">·</span>
            <span className="text-foreground-secondary">Tax: {formatCurrency(totalTax)}</span>
          </>
        )}
      </div>

      {grouped.map((group) => (
        <Card key={group.category}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{group.categoryLabel}</CardTitle>
              <Badge variant="muted" shape="rounded" size="xs">
                {formatCurrency(group.subtotal)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-background-secondary border-b border-border-light">
                <tr>
                  <th className="px-4 py-2 text-left text-2xs font-semibold text-foreground-secondary uppercase">
                    Item
                  </th>
                  <th className="px-4 py-2 text-right text-2xs font-semibold text-foreground-secondary uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-right text-2xs font-semibold text-foreground-secondary uppercase">
                    Unit Price
                  </th>
                  <th className="px-4 py-2 text-right text-2xs font-semibold text-foreground-secondary uppercase">
                    Tax
                  </th>
                  <th className="px-4 py-2 text-right text-2xs font-semibold text-foreground-secondary uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {group.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{item.itemName}</p>
                      {item.itemDescription && (
                        <p className="text-xs text-foreground-tertiary mt-0.5 line-clamp-1">
                          {item.itemDescription}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.quantity}
                      {item.unitOfMeasure ? ` ${item.unitOfMeasure}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground-secondary">
                      {item.taxRate != null ? `${item.taxRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
