'use client';

import { Eye, History } from 'lucide-react';
import React from 'react';

import type { QuoteDetail } from '../../../hooks/types';

import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface QuoteVersionsTabProps {
  quote: QuoteDetail;
  selectedVersionId: string | null;
  onVersionSelect: (versionId: string | null) => void;
  isActive: boolean;
}

export function QuoteVersionsTab({
  quote,
  selectedVersionId,
  onVersionSelect,
  isActive: _isActive,
}: QuoteVersionsTabProps): React.JSX.Element {
  const versions = quote.versions ?? [];

  if (versions.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={<History className="w-full h-full" />}
          title="No versions"
          description="No version history available for this quote."
        />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-background-secondary border-b border-border-light">
              <tr>
                <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Version</th>
                <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Date</th>
                <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Changes</th>
                <th className="px-4 py-3 text-right text-2xs font-semibold text-foreground-secondary uppercase">System</th>
                <th className="px-4 py-3 text-right text-2xs font-semibold text-foreground-secondary uppercase">Price</th>
                <th className="px-4 py-3 text-right text-2xs font-semibold text-foreground-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {versions.map((version) => {
                const isSelected = selectedVersionId === version.id;
                return (
                  <tr
                    key={version.id}
                    className={`hover:bg-muted ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">v{version.versionNumber}</span>
                        {version.isCurrent && (
                          <Badge variant="success" size="xs" shape="pill">Current</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">
                      {formatDate(version.createdAt, 'medium')}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">
                      {version.changeSummary || (version.versionNumber === 1 ? 'Initial quote' : '—')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground-secondary">
                      {version.systemSizeKw} kW
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {version.effectivePrice != null
                        ? formatCurrency(version.effectivePrice)
                        : version.finalPrice != null
                          ? formatCurrency(version.finalPrice)
                          : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {version.isCurrent ? (
                        isSelected ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVersionSelect(null)}
                          >
                            Clear
                          </Button>
                        ) : null
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onVersionSelect(isSelected ? null : version.id)
                          }
                        >
                          <Eye className="size-icon-sm mr-1" />
                          {isSelected ? 'Deselect' : 'View'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
