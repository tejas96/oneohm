'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

import {
  QUOTE_STATUS_BADGE_VARIANTS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TRANSITIONS,
} from '../constants';
import { useAcceptQuote, useRejectQuote, useSendQuote } from '../hooks';

import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';

type BadgeVariant = 'muted' | 'info' | 'success' | 'warning' | 'error' | 'pending';

interface QuoteStatusDropdownProps {
  quoteId: string;
  status: QuoteStatus;
  /** Badge size — xs for list rows, sm for detail header */
  size?: 'xs' | 'sm' | 'default';
}

export const QuoteStatusDropdown = React.memo(
  ({ quoteId, status, size = 'default' }: QuoteStatusDropdownProps): React.JSX.Element => {
    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [customerSignature, setCustomerSignature] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    const acceptMutation = useAcceptQuote();
    const rejectMutation = useRejectQuote();
    const sendMutation = useSendQuote();

    const transitions = QUOTE_STATUS_TRANSITIONS[status];
    const label = QUOTE_STATUS_LABELS[status];
    const variant = QUOTE_STATUS_BADGE_VARIANTS[status] as BadgeVariant;
    const isTerminal = transitions.length === 0;

    const handleTransition = (target: QuoteStatus): void => {
      switch (target) {
        case QuoteStatus.SENT:
          setSendModalOpen(true);
          break;
        case QuoteStatus.ACCEPTED:
          setAcceptModalOpen(true);
          break;
        case QuoteStatus.REJECTED:
          setRejectModalOpen(true);
          break;
        case QuoteStatus.DRAFT:
        case QuoteStatus.VIEWED:
        case QuoteStatus.EXPIRED:
          break;
      }
    };

    const handleSend = (): void => {
      sendMutation.mutate(quoteId, {
        onSuccess: () => {
          showToast.success('Quote sent successfully');
          setSendModalOpen(false);
        },
        onError: (err) => {
          showToast.error(
            (err.response?.data as { message?: string } | undefined)?.message ??
              'Failed to send quote',
          );
        },
      });
    };

    const handleAccept = (): void => {
      if (!customerSignature.trim()) {
        showToast.error('Please enter customer name as signature');
        return;
      }
      acceptMutation.mutate(
        { quoteId, customerSignature: customerSignature.trim() },
        {
          onSuccess: () => {
            showToast.success('Quote accepted successfully');
            setAcceptModalOpen(false);
            setCustomerSignature('');
          },
          onError: (err) => {
            showToast.error(
              (err.response?.data as { message?: string } | undefined)?.message ??
                'Failed to accept quote',
            );
          },
        },
      );
    };

    const handleReject = (): void => {
      if (!rejectionReason.trim()) {
        showToast.error('Please provide a reason for rejection');
        return;
      }
      rejectMutation.mutate(
        { quoteId, rejectionReason: rejectionReason.trim() },
        {
          onSuccess: () => {
            showToast.success('Quote rejected');
            setRejectModalOpen(false);
            setRejectionReason('');
          },
          onError: (err) => {
            showToast.error(
              (err.response?.data as { message?: string } | undefined)?.message ??
                'Failed to reject quote',
            );
          },
        },
      );
    };

    if (isTerminal) {
      return (
        <Badge variant={variant} shape="pill" size={size}>
          {label}
        </Badge>
      );
    }

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="group cursor-pointer focus:outline-none">
              <Badge variant={variant} shape="pill" size={size} className="gap-1 pr-1.5">
                {label}
                <ChevronDown className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            {transitions.map((target) => {
              const targetVariant = QUOTE_STATUS_BADGE_VARIANTS[target] as BadgeVariant;
              return (
                <DropdownMenuItem
                  key={target}
                  onClick={() => handleTransition(target)}
                  className="gap-2"
                >
                  <Badge variant={targetVariant} shape="pill" size="xs">
                    {QUOTE_STATUS_LABELS[target]}
                  </Badge>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Send Modal */}
        <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Quote</DialogTitle>
              <DialogDescription>Send this quote to the customer.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-foreground-secondary">
                This will change the quote status from Draft to Sent.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSendModalOpen(false)}
                disabled={sendMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? 'Sending...' : 'Send Quote'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Accept Modal */}
        <Dialog
          open={acceptModalOpen}
          onOpenChange={(open: boolean) => {
            setAcceptModalOpen(open);
            if (!open) setCustomerSignature('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Quote</DialogTitle>
              <DialogDescription>
                Confirm that the customer has accepted this quote.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <p className="text-sm text-foreground-secondary">
                This will mark the quote as accepted. You can then convert it to a project.
              </p>
              <div>
                <label htmlFor="dropdown-signature" className="text-sm font-medium text-foreground">
                  Customer Name (as signature)
                </label>
                <Input
                  id="dropdown-signature"
                  placeholder="Enter customer name..."
                  value={customerSignature}
                  onChange={(e) => setCustomerSignature(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAcceptModalOpen(false)}
                disabled={acceptMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAccept}
                disabled={acceptMutation.isPending || !customerSignature.trim()}
              >
                {acceptMutation.isPending ? 'Accepting...' : 'Confirm Acceptance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog
          open={rejectModalOpen}
          onOpenChange={(open: boolean) => {
            setRejectModalOpen(open);
            if (!open) setRejectionReason('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Quote</DialogTitle>
              <DialogDescription>Please provide a reason for rejection.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Quote'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

QuoteStatusDropdown.displayName = 'QuoteStatusDropdown';
