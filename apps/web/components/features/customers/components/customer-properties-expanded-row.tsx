'use client';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX, useCallback, useState } from 'react';

import { useCustomerProperties } from '@/components/features/customers/hooks/use-customer-properties';
import {
  PropertyRowActionsMenu,
  type PropertyRowActionsTarget,
} from '@/components/features/properties/components/property-row-actions-menu';
import { PROPERTY_TYPE_LABELS } from '@/components/features/properties/constants';
import { useDeleteProperty } from '@/components/features/properties/hooks/use-properties';
import { MarkAsLostDialog } from '@/components/features/properties/property-detail/mark-as-lost-dialog';
import { ORG_ADMIN_ROLES } from '@/components/features/properties/utils/delete-eligibility';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { formatCurrency, toTitleLabel } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface CustomerPropertiesExpandedRowProps {
  customerId: string;
}

export function CustomerPropertiesExpandedRow({
  customerId,
}: CustomerPropertiesExpandedRowProps): JSX.Element {
  const router = useRouter();
  const { hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const deletePropertyMutation = useDeleteProperty();
  const deleteConfirmation = useDeleteConfirmation<PropertyRowActionsTarget>({
    mutation: deletePropertyMutation,
    getId: (property) => property.id,
  });

  const {
    data: properties = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomerProperties(customerId);

  const [markLostTarget, setMarkLostTarget] = useState<PropertyRowActionsTarget | null>(null);

  const handleMarkAsLost = useCallback((property: PropertyRowActionsTarget): void => {
    setMarkLostTarget(property);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 2,
          pl: 4,
        }}
      >
        <ErrorOutlineIcon color="error" fontSize="small" />
        <MUITypography variant="finePrint" sx={{ flex: 1 }}>
          {error?.message || 'Failed to load properties'}
        </MUITypography>
        <Button size="small" variant="outlined" color="error" onClick={() => void refetch()}>
          Retry
        </Button>
      </Box>
    );
  }

  if (properties.length === 0) {
    return (
      <Box sx={{ py: 2, pl: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <MUITypography variant="body">No properties for this customer.</MUITypography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            void router.push(buildRoute(ROUTES.CUSTOMERS.ADD_PROPERTY, { id: customerId }));
          }}
        >
          Add Property
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pl: 4, borderLeft: '3px solid', borderColor: 'divider' }}>
      <TableContainer>
        <Table size="small" aria-label="Customer properties">
          <TableHead>
            <TableRow>
              {[
                'Property Code',
                'Quoted Cost',
                'Property Type',
                'Quote Status',
                'Discom / Load',
                'Status',
                'Created At',
                '',
              ].map((header) => (
                <TableCell
                  key={header || 'actions'}
                  sx={{
                    fontWeight: 500,
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    py: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => {
              const discom = property.discomName;
              const load =
                property.sanctionedLoad !== undefined ? Number(property.sanctionedLoad) : undefined;
              const connection = property.connectionType;
              const subtitleParts: string[] = [];
              if (load !== undefined) subtitleParts.push(`${load.toFixed(2)} kW`);
              if (connection) subtitleParts.push(toTitleLabel(connection));

              return (
                <TableRow
                  key={property.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    void router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id }));
                  }}
                >
                  <TableCell sx={{ py: 1 }}>
                    <MuiLink
                      component={NextLink}
                      href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id })}
                      prefetch={false}
                      underline="hover"
                      color="inherit"
                      sx={{ fontWeight: 500, fontSize: '0.8125rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {property.propertyCode ?? property.propertyName ?? 'Unnamed Property'}
                    </MuiLink>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <MUITypography variant="timestamp">
                      {property.latestQuoteFinalPrice != null
                        ? formatCurrency(Number(property.latestQuoteFinalPrice))
                        : '-'}
                    </MUITypography>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <MUIStatusChip
                      label={
                        PROPERTY_TYPE_LABELS[property.propertyType] ??
                        toTitleLabel(property.propertyType)
                      }
                      colorSeed={property.propertyType}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    {property.latestQuoteStatus ? (
                      <MUIStatusChip
                        label={toTitleLabel(property.latestQuoteStatus)}
                        colorSeed={property.latestQuoteStatus}
                      />
                    ) : (
                      <MUITypography variant="placeholder">None</MUITypography>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Box>
                      <MUITypography variant="timestamp" sx={{ fontWeight: 500 }}>
                        {discom ?? '-'}
                      </MUITypography>
                      {subtitleParts.length > 0 && (
                        <MUITypography variant="timestamp" sx={{ mt: 0.25 }}>
                          {subtitleParts.join(' · ')}
                        </MUITypography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <MUIStatusChip
                      label={toTitleLabel(property.status)}
                      colorSeed={property.status}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <MUITypography variant="timestamp">
                      {new Date(property.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </MUITypography>
                  </TableCell>
                  <TableCell sx={{ py: 1, width: 48 }} onClick={(e) => e.stopPropagation()}>
                    <PropertyRowActionsMenu
                      property={property}
                      onMarkAsLost={handleMarkAsLost}
                      onRequestDelete={deleteConfirmation.requestDelete}
                      showDelete={isOrgAdmin}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <MarkAsLostDialog
        open={!!markLostTarget}
        onClose={() => setMarkLostTarget(null)}
        propertyName={markLostTarget?.propertyName ?? markLostTarget?.propertyCode}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete Property"
        itemName={
          deleteConfirmation.target?.propertyName ||
          deleteConfirmation.target?.propertyCode ||
          'this property'
        }
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />
    </Box>
  );
}
