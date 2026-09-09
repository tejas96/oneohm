'use client';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Menu, MenuItem, TextField, Tooltip } from '@mui/material';
import { LOSS_REASON_LABELS } from '@tejas96/shared/constants';
import { LossReason, QuoteStatus } from '@tejas96/shared/types';
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
import { Input } from '@/components/ui/input';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { showToast } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAccessDialog, useCan } from '@/lib/rbac';

type BadgeVariant = 'muted' | 'info' | 'success' | 'warning' | 'error' | 'pending';

interface QuoteStatusDropdownProps {
  quoteId: string;
  status: QuoteStatus;
  /** Badge size — xs for list rows, sm for detail header */
  size?: 'xs' | 'sm' | 'default';
  disabled?: boolean;
  disabledReason?: string;
  onShareWhatsapp?: () => Promise<void>;
  canShareWhatsapp?: boolean;
  /** Draws a pulsing ripple around the trigger to point users at where to act (e.g. Draft quotes with no other indicator of where to send). */
  highlight?: boolean;
}

export const QuoteStatusDropdown = React.memo(
  ({
    quoteId,
    status,
    size = 'default',
    disabled,
    disabledReason,
    onShareWhatsapp,
    canShareWhatsapp = false,
    highlight = false,
  }: QuoteStatusDropdownProps): React.JSX.Element => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [acceptModalOpen, setAcceptModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const { can } = useCan();
    const { requestAccess } = useAccessDialog();
    const [customerSignature, setCustomerSignature] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [lossReason, setLossReason] = useState<LossReason | ''>('');
    // The "Site is lost" footer button doubles as the field's reveal trigger:
    // its first click arms the lost path (showing the loss-reason select
    // below the textarea) instead of submitting, so the field never shows on
    // the re-quote path, which has lost nothing. Its second click submits.
    const [lostPathArmed, setLostPathArmed] = useState(false);
    const [isSharingWhatsapp, setIsSharingWhatsapp] = useState(false);

    const acceptMutation = useAcceptQuote();
    const rejectMutation = useRejectQuote();
    const sendMutation = useSendQuote();

    const transitions = QUOTE_STATUS_TRANSITIONS[status];
    const label = QUOTE_STATUS_LABELS[status];
    const variant = QUOTE_STATUS_BADGE_VARIANTS[status] as BadgeVariant;
    const isTerminal = transitions.length === 0;

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    };

    const handleClose = (): void => {
      setAnchorEl(null);
    };

    const handleMenuClick = (event: React.MouseEvent): void => {
      event.stopPropagation();
    };

    const handleTransition = (event: React.MouseEvent, target: QuoteStatus): void => {
      event.stopPropagation();
      setAnchorEl(null);

      // Gated on the dispatcher rather than on each menu item: every status
      // change funnels through here, so one check cannot be bypassed by a
      // route we forgot to wrap.
      const gate =
        target === QuoteStatus.SENT
          ? ('quotes.send' as const)
          : target === QuoteStatus.ACCEPTED || target === QuoteStatus.REJECTED
            ? ('quotes.approve' as const)
            : null;

      if (gate && !can(gate)) {
        requestAccess(gate, target === QuoteStatus.SENT ? 'Send quote' : 'Accept or reject quote');
        return;
      }

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
      if (onShareWhatsapp && canShareWhatsapp) {
        setIsSharingWhatsapp(true);
        void onShareWhatsapp()
          .then(() => {
            setSendModalOpen(false);
          })
          .finally(() => {
            setIsSharingWhatsapp(false);
          });
        return;
      }

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

    /**
     * Move Draft → Sent without messaging anyone.
     *
     * The only route to Sent used to be the WhatsApp share, so a quote handed
     * over by email, print or in person could not be marked sent at all — and
     * nobody could walk the accept → project flow without transmitting a real
     * message to a real customer. The backend has always allowed the plain
     * transition; only the UI insisted on the side effect.
     */
    const handleMarkAsSent = (): void => {
      sendMutation.mutate(quoteId, {
        onSuccess: () => {
          showToast.success('Quote marked as sent');
          setSendModalOpen(false);
        },
        onError: (err) => {
          showToast.error(
            (err.response?.data as { message?: string } | undefined)?.message ??
              'Failed to update quote status',
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

    const submitRejection = (rejectionOutcome: 'requote' | 'close'): void => {
      rejectMutation.mutate(
        {
          quoteId,
          rejectionReason: rejectionReason.trim(),
          rejectionOutcome,
          // Optional even on the lost path — the backend defaults an
          // omitted reason to LossReason.OTHER rather than rejecting it.
          lossReason: rejectionOutcome === 'close' && lossReason ? lossReason : undefined,
        },
        {
          onSuccess: () => {
            showToast.success(
              rejectionOutcome === 'close' ? 'Quote rejected — site marked lost' : 'Quote rejected',
            );
            setRejectModalOpen(false);
            setRejectionReason('');
            setLossReason('');
            setLostPathArmed(false);
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

    const handleRequote = (): void => {
      if (!rejectionReason.trim()) {
        showToast.error('Please provide a reason for rejection');
        return;
      }
      setLostPathArmed(false);
      submitRejection('requote');
    };

    /**
     * First click arms the lost path and reveals the loss-reason select;
     * second click confirms and submits. One control doing two jobs, rather
     * than a separate toggle whose only purpose is to reveal the field.
     */
    const handleSiteIsLostClick = (): void => {
      if (!rejectionReason.trim()) {
        showToast.error('Please provide a reason for rejection');
        return;
      }
      if (!lostPathArmed) {
        setLostPathArmed(true);
        return;
      }
      submitRejection('close');
    };

    if (disabled) {
      return (
        <Tooltip title={disabledReason ?? 'Status changes are locked'} arrow>
          <span className="inline-flex items-center gap-1 cursor-help">
            <Badge variant={variant} shape="pill" size={size}>
              {label}
            </Badge>
            <HelpOutlineIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          </span>
        </Tooltip>
      );
    }

    if (isTerminal) {
      return (
        <Badge variant={variant} shape="pill" size={size}>
          {label}
        </Badge>
      );
    }

    return (
      <>
        <button
          type="button"
          className="group relative cursor-pointer focus:outline-none"
          onClick={handleOpen}
        >
          {highlight && (
            <>
              <span
                className="pointer-events-none absolute inset-0 rounded-full bg-primary animate-attention-ripple"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute inset-0 rounded-full bg-primary animate-attention-ripple [animation-delay:0.6s]"
                aria-hidden="true"
              />
            </>
          )}
          <Badge
            variant={variant}
            shape="pill"
            size={size}
            className={`gap-1 pr-1.5 relative ${highlight ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-white' : ''}`}
          >
            {label}
            <ChevronDown className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Badge>
        </button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          onClick={handleMenuClick}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              elevation: 2,
              sx: { minWidth: 140, borderRadius: 1.5, mt: 0.5 },
            },
          }}
        >
          {transitions.map((target) => {
            const targetVariant = QUOTE_STATUS_BADGE_VARIANTS[target] as BadgeVariant;
            return (
              <MenuItem
                key={target}
                dense
                onClick={(e) => handleTransition(e, target)}
                sx={{ gap: 1, px: 1.5 }}
              >
                <Badge variant={targetVariant} shape="pill" size="xs">
                  {QUOTE_STATUS_LABELS[target]}
                </Badge>
              </MenuItem>
            );
          })}
        </Menu>

        {/* Send Modal */}
        {/* size="default" (not "sm") — this footer can carry three buttons
            (Cancel / Mark as sent / Send via WhatsApp) and "sm"'s 400px was
            too narrow, wrapping "Send via WhatsApp" and "Mark as sent" onto
            two lines. */}
        <MUIDialog open={sendModalOpen} onOpenChange={setSendModalOpen} size="default">
          <MUIDialogHeader>
            <MUIDialogTitle>Send Quote</MUIDialogTitle>
            <MUIDialogDescription>
              {onShareWhatsapp && canShareWhatsapp
                ? 'Send the quotation PDF to the customer on WhatsApp.'
                : 'Send this quote to the customer.'}
            </MUIDialogDescription>
          </MUIDialogHeader>
          <MUIDialogBody>
            <p className="text-sm text-foreground-secondary">
              {onShareWhatsapp && canShareWhatsapp
                ? 'This will generate the quote PDF, upload it, and send it via WhatsApp. Draft quotes will move to Sent.'
                : 'This will change the quote status from Draft to Sent.'}
            </p>
            {onShareWhatsapp && canShareWhatsapp && (
              <p className="mt-2 text-sm text-foreground-tertiary">
                Already shared it by email, print or in person? Mark it as sent without messaging
                the customer.
              </p>
            )}
          </MUIDialogBody>
          <MUIDialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendModalOpen(false)}
              disabled={sendMutation.isPending || isSharingWhatsapp}
            >
              Cancel
            </Button>
            {/* Only offered alongside the WhatsApp path. Where WhatsApp is
                unavailable the single button below already does exactly this. */}
            {onShareWhatsapp && canShareWhatsapp && (
              <Button
                variant="outline"
                onClick={handleMarkAsSent}
                disabled={sendMutation.isPending || isSharingWhatsapp}
              >
                Mark as sent
              </Button>
            )}
            <Button onClick={handleSend} disabled={sendMutation.isPending || isSharingWhatsapp}>
              {sendMutation.isPending || isSharingWhatsapp
                ? 'Sending...'
                : onShareWhatsapp && canShareWhatsapp
                  ? 'Send via WhatsApp'
                  : 'Send Quote'}
            </Button>
          </MUIDialogFooter>
        </MUIDialog>

        {/* Accept Modal */}
        <MUIDialog
          open={acceptModalOpen}
          onOpenChange={(open) => {
            setAcceptModalOpen(open);
            if (!open) setCustomerSignature('');
          }}
          size="sm"
        >
          <MUIDialogHeader>
            <MUIDialogTitle>Accept Quote</MUIDialogTitle>
            <MUIDialogDescription>
              Confirm that the customer has accepted this quote.
            </MUIDialogDescription>
          </MUIDialogHeader>
          <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
          </MUIDialogBody>
          <MUIDialogFooter>
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
          </MUIDialogFooter>
        </MUIDialog>

        {/* Reject Modal */}
        {/* size="default" (not "sm") — the footer now carries three buttons
            (Cancel / Re-quote / Site is lost), and "sm"'s 400px wraps them
            onto two lines, same fix as the Send modal below. */}
        <MUIDialog
          open={rejectModalOpen}
          onOpenChange={(open) => {
            setRejectModalOpen(open);
            if (!open) {
              setRejectionReason('');
              setLossReason('');
              setLostPathArmed(false);
            }
          }}
          size="default"
        >
          <MUIDialogHeader>
            <MUIDialogTitle>Reject Quote</MUIDialogTitle>
            <MUIDialogDescription>
              Provide a reason, then say what happens to the site.
            </MUIDialogDescription>
          </MUIDialogHeader>
          <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            {/* Only for the "Site is lost" path — a re-quote has not lost
                anything, and showing this on both paths would state the same
                fact in two places. Revealed by the first click on that
                button below, not shown up front. */}
            {lostPathArmed && (
              <TextField
                select
                fullWidth
                size="small"
                label="Loss reason"
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value as LossReason)}
                helperText="Recorded against the site, so the loss can be counted later."
              >
                {Object.values(LossReason).map((value) => (
                  <MenuItem key={value} value={value}>
                    {LOSS_REASON_LABELS[value]}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </MUIDialogBody>
          <MUIDialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleRequote}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              Re-quote
            </Button>
            <Button
              variant={lostPathArmed ? 'destructive' : 'destructive-outline'}
              onClick={handleSiteIsLostClick}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending
                ? 'Rejecting...'
                : lostPathArmed
                  ? 'Confirm — site is lost'
                  : 'Site is lost'}
            </Button>
          </MUIDialogFooter>
        </MUIDialog>
      </>
    );
  },
);

QuoteStatusDropdown.displayName = 'QuoteStatusDropdown';
