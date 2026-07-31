'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { QuoteStatus } from '@tejas96/shared/types';
import { Briefcase, Download, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';

import type { QuoteDetail } from '../../hooks/types';
import { useDeleteQuote, usePropertyLockStatus } from '../../hooks/use-quotes';
import { QuoteStatusDropdown } from '../quote-status-dropdown';

import { Can } from '@/components/shared/guards';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { showToast } from '@/components/ui/sonner';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatDate } from '@/lib/utils/format';

interface QuoteDetailHeaderProps {
  quote: QuoteDetail;
  isLatestPropertyQuote: boolean;
  canDownloadPdf: boolean;
  pdfLoading: boolean;
  handleDownloadPdf: () => void;
  canSendWhatsapp?: boolean;
  showWhatsappButton?: boolean;
  whatsappLoading?: boolean;
  whatsappBlockedReason?: string;
  whatsappLabel?: string;
  handleSendWhatsapp?: () => void;
  onShareWhatsapp?: () => Promise<void>;
}

export const QuoteDetailHeader = React.memo(
  ({
    quote,
    isLatestPropertyQuote,
    canDownloadPdf,
    pdfLoading,
    handleDownloadPdf,
    canSendWhatsapp = false,
    showWhatsappButton = false,
    whatsappLoading = false,
    whatsappBlockedReason,
    whatsappLabel = 'Send via WhatsApp',
    handleSendWhatsapp,
    onShareWhatsapp,
  }: QuoteDetailHeaderProps): React.JSX.Element => {
    const router = useRouter();
    const isExpired = new Date(quote.validUntil) < new Date();
    const deleteQuote = useDeleteQuote();
    const { data: lockStatus } = usePropertyLockStatus(quote.propertyId);

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const isPropertyLocked = lockStatus?.locked && quote.status !== QuoteStatus.ACCEPTED;
    const lockReason = lockStatus?.acceptedQuoteNumber
      ? `Another quote for this property has been accepted (${lockStatus.acceptedQuoteNumber}). Status changes are locked.`
      : undefined;

    const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
      setMenuAnchor(e.currentTarget);
    }, []);

    const handleMenuClose = useCallback(() => {
      setMenuAnchor(null);
    }, []);

    const handleEdit = useCallback(() => {
      handleMenuClose();
      const params = new URLSearchParams({
        quoteId: quote.id,
        customerId: quote.customerId,
      });
      if (quote.propertyId) params.set('propertyId', quote.propertyId);
      router.push(`${ROUTES.QUOTES.NEW}?${params.toString()}`);
    }, [handleMenuClose, quote, router]);

    const handleDeleteClick = useCallback(() => {
      handleMenuClose();
      setDeleteOpen(true);
    }, [handleMenuClose]);

    const handleDeleteConfirm = useCallback(() => {
      deleteQuote.mutate(quote.id, {
        onSuccess: () => {
          showToast.success('Quote deleted successfully');
          router.push(ROUTES.QUOTES.LIST);
        },
        onError: () => {
          showToast.error('Failed to delete quote');
        },
      });
      setDeleteOpen(false);
    }, [deleteQuote, quote.id, router]);

    const canDelete = quote.status !== QuoteStatus.ACCEPTED;

    return (
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ROUTES.CUSTOMERS.LIST}>Customers</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {quote.customerId && quote.customerName && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: quote.customerId })}>
                      {quote.customerName}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            {quote.propertyId && quote.propertyName && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: quote.propertyId })}>
                      {quote.propertyName}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {quote.quoteNumber}
              </h1>
              <QuoteStatusDropdown
                quoteId={quote.id}
                status={quote.status}
                size="sm"
                disabled={!!isPropertyLocked}
                disabledReason={lockReason}
                onShareWhatsapp={onShareWhatsapp}
                canShareWhatsapp={canSendWhatsapp}
                highlight={!isPropertyLocked && quote.status === QuoteStatus.DRAFT}
              />
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${
                  isLatestPropertyQuote
                    ? 'bg-gray-100 text-gray-700 border border-gray-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                {isLatestPropertyQuote ? 'Current Version' : 'Historical Version'}
              </span>
              {isExpired && quote.status !== QuoteStatus.EXPIRED && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-warning/10 text-warning border border-warning/20">
                  Expired
                </span>
              )}
            </div>

            <p className="text-xs text-foreground-tertiary flex items-center gap-1.5 flex-wrap mt-1">
              {quote.propertyName && quote.propertyId && (
                <>
                  <Link
                    href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: quote.propertyId })}
                    className="text-primary hover:underline font-medium"
                  >
                    {quote.propertyName}
                  </Link>
                  <span>·</span>
                </>
              )}
              {quote.customerName && quote.customerId && (
                <>
                  <Link
                    href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: quote.customerId })}
                    className="text-primary hover:underline font-medium"
                  >
                    {quote.customerName}
                  </Link>
                  <span>·</span>
                </>
              )}
              <span>Created: {formatDate(quote.createdAt, 'medium')}</span>
              <span>·</span>
              <span>Valid Until: {formatDate(quote.validUntil, 'medium')}</span>
              {quote.salesPersonName && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 font-medium">
                    <User className="h-3.5 w-3.5 text-foreground-muted inline" /> Representative:{' '}
                    {quote.salesPersonName}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {quote.status === QuoteStatus.ACCEPTED && (
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    quoteId: quote.id,
                    customerId: quote.customerId,
                  });
                  if (quote.propertyId) params.set('propertyId', quote.propertyId);
                  router.push(`${ROUTES.PROJECTS.NEW}?${params.toString()}`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark shadow-sm transition-all"
              >
                <Briefcase className="h-3.5 w-3.5" /> Convert to Project
              </button>
            )}

            <button
              disabled={!canDownloadPdf || pdfLoading}
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-border hover:bg-background-secondary text-foreground-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" /> {pdfLoading ? 'Downloading...' : 'Download PDF'}
            </button>

            {handleSendWhatsapp && showWhatsappButton && (
              <button
                disabled={!canSendWhatsapp || whatsappLoading}
                onClick={handleSendWhatsapp}
                title={
                  whatsappBlockedReason
                    ? whatsappBlockedReason
                    : !quote.customerPhone
                      ? 'Customer phone number is required'
                      : !canDownloadPdf
                        ? 'Quote calculation required before sending'
                        : whatsappLabel
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#25D366] text-white hover:bg-[#1ebe57] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                {whatsappLoading ? 'Sending...' : whatsappLabel}
              </button>
            )}

            <IconButton
              size="small"
              onClick={handleMenuOpen}
              className="bg-white border border-border hover:bg-background-secondary rounded-lg p-2 shrink-0"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleEdit}>
                <ListItemIcon>
                  <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Create New Quote</ListItemText>
              </MenuItem>
              <Can permission="quotes:delete">
                {canDelete && (
                  <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                      <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Quote</ListItemText>
                  </MenuItem>
                )}
              </Can>
            </Menu>
          </div>
        </div>

        <MUIDialog open={deleteOpen} onOpenChange={setDeleteOpen} size="sm">
          <MUIDialogHeader>
            <MUIDialogTitle>Delete Quote</MUIDialogTitle>
          </MUIDialogHeader>
          <MUIDialogBody>
            Are you sure you want to delete quote <strong>{quote.quoteNumber}</strong>? This will
            remove all versions and associated data. This action cannot be undone.
          </MUIDialogBody>
          <MUIDialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={deleteQuote.isPending}
            >
              {deleteQuote.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </MUIDialogFooter>
        </MUIDialog>
      </div>
    );
  },
);

QuoteDetailHeader.displayName = 'QuoteDetailHeader';
