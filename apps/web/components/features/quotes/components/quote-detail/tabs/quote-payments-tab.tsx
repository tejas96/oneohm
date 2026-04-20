'use client';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Wallet } from 'lucide-react';
import React from 'react';

import type { QuoteDetail, QuoteVersionDetail } from '../../../hooks/types';

import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
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

  const sorted = [...milestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-4 mt-4">
      {finalPrice != null && (
        <div className="flex items-center gap-4">
          <Typography variant="body2" color="text.secondary">
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ·
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            Total: {formatCurrency(finalPrice)}
          </Typography>
        </div>
      )}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Milestone</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell align="right">%</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((milestone, idx) => (
                <TableRow key={`${milestone.stage}-${idx}`} hover>
                  <TableCell>{milestone.order ?? idx + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {milestone.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted" shape="rounded" size="xs">
                      {milestone.stage.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">{milestone.percentage}%</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(milestone.amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
