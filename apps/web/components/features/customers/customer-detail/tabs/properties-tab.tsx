'use client';

import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import type { JSX } from 'react';

import type { CustomerPropertyResponse } from '../../hooks';

import { PropertyPipelineStrip } from '@/components/features/properties/property-detail/pipeline-strip';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { toTitleLabel } from '@/lib/utils';

export interface PropertiesTabProps {
  customerId: string;
  properties: CustomerPropertyResponse[];
  isLoading: boolean;
  isInactive: boolean;
  onAddProperty: () => void;
  onOpenProperty: (propertyId: string) => void;
}

export function PropertiesTab({
  properties,
  isLoading,
  isInactive,
  onAddProperty,
  onOpenProperty,
}: PropertiesTabProps): JSX.Element {
  const inactiveTooltip = 'This customer is inactive. Reactivate to continue this action.';

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Stack spacing={1}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (properties.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          No properties yet
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Add your first property to get started.
        </Typography>
        <Tooltip title={isInactive ? inactiveTooltip : ''}>
          <span>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddBusinessOutlinedIcon />}
              onClick={onAddProperty}
              disabled={isInactive}
            >
              Add Property
            </Button>
          </span>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={600}>
          Properties ({properties.length})
        </Typography>
        <Tooltip title={isInactive ? inactiveTooltip : ''}>
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddBusinessOutlinedIcon />}
              onClick={onAddProperty}
              disabled={isInactive}
            >
              Add Property
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Property</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell sx={{ minWidth: 280 }}>Pipeline</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow
                key={property.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onOpenProperty(property.id)}
              >
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="body2" fontWeight={500}>
                      {getPropertyDisplayName(property)}
                    </Typography>
                    {property.isPrimary && <Chip label="Primary" size="small" color="primary" />}
                  </Stack>
                </TableCell>
                <TableCell>{toTitleLabel(property.propertyType)}</TableCell>
                <TableCell>
                  {[property.city, property.state].filter(Boolean).join(', ') || '—'}
                </TableCell>
                <TableCell>{toTitleLabel(property.status)}</TableCell>
                <TableCell>
                  <PropertyPipelineStrip property={property} compact />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    endIcon={<OpenInNewIcon />}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenProperty(property.id);
                    }}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
