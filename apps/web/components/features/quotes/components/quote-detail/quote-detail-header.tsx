'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { QuoteStatus } from '@oneohm-epc/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';

import type { QuoteDetail } from '../../hooks/types';
import { useDeleteQuote, usePropertyLockStatus } from '../../hooks/use-quotes';
import { QuoteStatusDropdown } from '../quote-status-dropdown';

import { Can } from '@/components/shared/guards';
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
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { showToast } from '@/components/ui/sonner';
import { ROUTES } from '@/lib/config/routes';
import { formatDate } from '@/lib/utils/format';

interface QuoteDetailHeaderProps {
  quote: QuoteDetail;
  isLatestPropertyQuote: boolean;
}

export const QuoteDetailHeader = React.memo(
  ({ quote, isLatestPropertyQuote }: QuoteDetailHeaderProps): React.JSX.Element => {
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
              <h1 className="text-xl font-semibold text-foreground">{quote.quoteNumber}</h1>
              <QuoteStatusDropdown
                quoteId={quote.id}
                status={quote.status}
                size="sm"
                disabled={!!isPropertyLocked}
                disabledReason={lockReason}
              />
              <Badge variant={isLatestPropertyQuote ? 'success' : 'muted'} shape="pill" size="xs">
                {isLatestPropertyQuote ? 'Current' : 'Historical'}
              </Badge>
              {isExpired && quote.status !== QuoteStatus.EXPIRED && (
                <Badge variant="warning" shape="pill" size="xs">
                  Expired
                </Badge>
              )}
            </div>
            <p className="text-xs text-foreground-secondary mt-1">
              Created {formatDate(quote.createdAt, 'medium')}
              {' · '}Valid until {formatDate(quote.validUntil, 'medium')}
              {quote.salesPersonName ? ` · ${quote.salesPersonName}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {quote.status === QuoteStatus.ACCEPTED && (
              <Button
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams({
                    quoteId: quote.id,
                    customerId: quote.customerId,
                  });
                  if (quote.propertyId) params.set('propertyId', quote.propertyId);
                  router.push(`${ROUTES.PROJECTS.NEW}?${params.toString()}`);
                }}
              >
                Convert to Project
              </Button>
            )}

            <IconButton size="small" onClick={handleMenuOpen}>
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
