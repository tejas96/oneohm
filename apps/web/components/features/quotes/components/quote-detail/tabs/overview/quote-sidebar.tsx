'use client';

import { Paper, Typography } from '@mui/material';
import { QuoteStatus } from '@oneohm-epc/shared/types';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Can } from '@/components/shared/guards';
import { ROUTES } from '@/lib/config/routes';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { formatCurrency } from '@/lib/utils/format';

interface QuoteSidebarProps {
  status: string;
  customerId: string;
  quoteId: string;
  propertyId?: string | null;
  profitPercent?: number | null;
  profitAmount?: number | null;
  rejectionReason?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
}

export function QuoteSidebar({
  status,
  customerId,
  quoteId,
  propertyId,
  profitPercent,
  profitAmount,
  rejectionReason,
  customerNotes,
  internalNotes,
}: QuoteSidebarProps): React.JSX.Element {
  const router = useRouter();

  const handleConvertToProject = () => {
    const params = new URLSearchParams({
      quoteId,
      customerId,
    });
    if (propertyId) params.set('propertyId', propertyId);
    router.push(`${ROUTES.PROJECTS.NEW}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Paper
        variant="outlined"
        className="p-5 rounded-xl border border-border bg-white shadow-sm space-y-3"
      >
        {status === (QuoteStatus.ACCEPTED as string) ? (
          <button
            onClick={handleConvertToProject}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark shadow-sm text-xs transition-all"
          >
            ⚡ Convert to Project
          </button>
        ) : (
          <button
            disabled
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gray-100 text-gray-400 font-semibold text-xs cursor-not-allowed border border-border"
          >
            ⚡ Convert to Project (Requires Accepted Status)
          </button>
        )}
      </Paper>

      {/* Profitability */}
      {profitPercent != null && profitAmount != null && (profitPercent > 0 || profitAmount > 0) && (
        <Can permission={PERMISSIONS.QUOTES.VIEW_PRICE_BREAKDOWN}>
          <Paper
            variant="outlined"
            className="p-5 rounded-xl border border-border bg-white shadow-sm"
          >
            <Typography
              variant="subtitle2"
              className="mb-3 font-semibold text-foreground text-sm leading-none"
            >
              Profitability
            </Typography>
            <div className="space-y-3">
              <div>
                <Typography
                  variant="caption"
                  className="uppercase font-semibold text-[0.65rem] text-foreground-tertiary block leading-none"
                >
                  Margin
                </Typography>
                <Typography
                  variant="body2"
                  className="text-xs font-semibold text-foreground-secondary mt-1.5 leading-none"
                >
                  {profitPercent}%
                </Typography>
              </div>
              <div>
                <Typography
                  variant="caption"
                  className="uppercase font-semibold text-[0.65rem] text-foreground-tertiary block leading-none"
                >
                  Profit Amount
                </Typography>
                <Typography
                  variant="body2"
                  className="text-xs font-semibold text-foreground-secondary mt-1.5 leading-none"
                >
                  {formatCurrency(profitAmount)}
                </Typography>
              </div>
            </div>
          </Paper>
        </Can>
      )}

      {/* Rejection Reason */}
      {rejectionReason && (
        <Paper
          variant="outlined"
          className="p-5 rounded-xl border border-border bg-white shadow-sm"
        >
          <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground text-sm">
            Rejection Reason
          </Typography>
          <Typography variant="body2" className="text-xs text-foreground-secondary leading-relaxed">
            {rejectionReason}
          </Typography>
        </Paper>
      )}

      {/* Customer Notes */}
      {customerNotes && (
        <Paper
          variant="outlined"
          className="p-5 rounded-xl border border-border bg-white shadow-sm"
        >
          <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground text-sm">
            Customer Notes
          </Typography>
          <Typography variant="body2" className="text-xs text-foreground-secondary leading-relaxed">
            {customerNotes}
          </Typography>
        </Paper>
      )}

      {/* Internal Notes */}
      {internalNotes && (
        <Paper
          variant="outlined"
          className="p-5 rounded-xl border border-border bg-white shadow-sm"
        >
          <Typography variant="subtitle2" className="mb-2 font-semibold text-foreground text-sm">
            Internal Notes
          </Typography>
          <Typography variant="body2" className="text-xs text-foreground-secondary leading-relaxed">
            {internalNotes}
          </Typography>
        </Paper>
      )}
    </div>
  );
}
