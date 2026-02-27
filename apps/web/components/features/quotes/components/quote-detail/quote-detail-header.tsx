'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { CheckCircle, History, Send, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import {
  QUOTE_STATUS_BADGE_VARIANTS,
  QUOTE_STATUS_LABELS,
} from '../../constants';
import { useAcceptQuote, useRejectQuote, useSendQuote } from '../../hooks';
import type { QuoteDetail, QuoteVersionDetail } from '../../hooks/types';

import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/sonner';
import { ROUTES } from '@/lib/config/routes';
import { formatDate } from '@/lib/utils/format';

interface QuoteDetailHeaderProps {
  quote: QuoteDetail;
  viewingVersion?: QuoteVersionDetail;
  isViewingHistorical: boolean;
  onClearVersionView: () => void;
}

export const QuoteDetailHeader = React.memo(({
  quote,
  viewingVersion,
  isViewingHistorical,
  onClearVersionView,
}: QuoteDetailHeaderProps): React.JSX.Element => {
  const router = useRouter();

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

  const acceptMutation = useAcceptQuote();
  const rejectMutation = useRejectQuote();
  const sendMutation = useSendQuote();

  const statusLabel = QUOTE_STATUS_LABELS[quote.status] ?? quote.status;
  const statusVariant = QUOTE_STATUS_BADGE_VARIANTS[quote.status] ?? 'secondary';
  const isExpired = new Date(quote.validUntil) < new Date();

  const handleAccept = () => {
    if (!customerSignature.trim()) {
      showToast.error('Please enter customer name as signature');
      return;
    }
    acceptMutation.mutate(
      { quoteId: quote.id, customerSignature: customerSignature.trim() },
      {
        onSuccess: () => {
          showToast.success('Quote accepted successfully');
          setAcceptModalOpen(false);
          setCustomerSignature('');
        },
        onError: (err) => {
          showToast.error(
            (err.response?.data as { message?: string })?.message ?? 'Failed to accept quote',
          );
        },
      },
    );
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      showToast.error('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate(
      { quoteId: quote.id, rejectionReason: rejectionReason.trim() },
      {
        onSuccess: () => {
          showToast.success('Quote rejected');
          setRejectModalOpen(false);
          setRejectionReason('');
        },
        onError: (err) => {
          showToast.error(
            (err.response?.data as { message?: string })?.message ?? 'Failed to reject quote',
          );
        },
      },
    );
  };

  const handleSend = () => {
    sendMutation.mutate(quote.id, {
      onSuccess: () => {
        showToast.success('Quote sent successfully');
        setSendModalOpen(false);
      },
      onError: (err) => {
        showToast.error(
          (err.response?.data as { message?: string })?.message ?? 'Failed to send quote',
        );
      },
    });
  };

  return (
    <>
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ROUTES.QUOTES.LIST}>Quotes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">
                {quote.quoteNumber}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">
                {quote.quoteNumber}
              </h1>
              <Badge variant={statusVariant as 'success'} shape="pill" size="sm">
                {statusLabel}
              </Badge>
              <Badge variant="muted" shape="pill" size="xs">
                v{quote.currentVersion}
              </Badge>
              {isExpired && quote.status !== QuoteStatus.EXPIRED && (
                <Badge variant="warning" shape="pill" size="xs">Expired</Badge>
              )}
            </div>
            <p className="text-xs text-foreground-secondary mt-1">
              Created {formatDate(quote.createdAt, 'medium')}
              {' · '}Valid until {formatDate(quote.validUntil, 'medium')}
              {quote.salesPersonName ? ` · ${quote.salesPersonName}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {quote.status === QuoteStatus.DRAFT && (
              <Button size="sm" onClick={() => setSendModalOpen(true)}>
                <Send className="mr-1.5 size-icon-xs" />
                Send Quote
              </Button>
            )}
            {(quote.status === QuoteStatus.SENT || quote.status === QuoteStatus.VIEWED) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(true)}>
                  <XCircle className="mr-1.5 size-icon-xs" />
                  Reject
                </Button>
                <Button size="sm" onClick={() => setAcceptModalOpen(true)}>
                  <CheckCircle className="mr-1.5 size-icon-xs" />
                  Accept
                </Button>
              </>
            )}
            {quote.status === QuoteStatus.ACCEPTED && (
              <Button size="sm" onClick={() => router.push(`${ROUTES.PROJECTS.NEW}?quoteId=${quote.id}`)}>
                Convert to Project
              </Button>
            )}
          </div>
        </div>

        {isViewingHistorical && viewingVersion && (
          <div className="flex items-center gap-2 rounded-lg bg-info/5 border border-info/20 px-3 py-2">
            <History className="size-icon-sm text-info shrink-0" />
            <p className="text-xs text-foreground-secondary flex-1">
              Viewing version {viewingVersion.versionNumber} of {quote.currentVersion}
              {viewingVersion.changeSummary ? ` — ${viewingVersion.changeSummary}` : ''}
            </p>
            <Button variant="ghost" size="sm" onClick={onClearVersionView}>
              View Current
            </Button>
          </div>
        )}
      </div>

      {/* Accept Modal */}
      <Dialog open={acceptModalOpen} onOpenChange={(open) => { setAcceptModalOpen(open); if (!open) setCustomerSignature(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Quote</DialogTitle>
            <DialogDescription>
              Confirm that the customer has accepted this quote.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              This will mark quote <span className="font-medium text-foreground">{quote.quoteNumber}</span> as accepted.
              You can then convert it to a project.
            </p>
            <div>
              <label htmlFor="signature" className="text-sm font-medium text-foreground">
                Customer Name (as signature)
              </label>
              <Input
                id="signature"
                placeholder="Enter customer name..."
                value={customerSignature}
                onChange={(e) => setCustomerSignature(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptModalOpen(false)} disabled={acceptMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={acceptMutation.isPending || !customerSignature.trim()}>
              {acceptMutation.isPending ? 'Accepting...' : 'Confirm Acceptance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={(open) => { setRejectModalOpen(open); if (!open) setRejectionReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} disabled={rejectMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !rejectionReason.trim()}>
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Modal */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
            <DialogDescription>
              Send this quote to the customer.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-foreground-secondary">
              This will change the quote status from Draft to Sent for{' '}
              <span className="font-medium text-foreground">{quote.quoteNumber}</span>.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModalOpen(false)} disabled={sendMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? 'Sending...' : 'Send Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

QuoteDetailHeader.displayName = 'QuoteDetailHeader';
