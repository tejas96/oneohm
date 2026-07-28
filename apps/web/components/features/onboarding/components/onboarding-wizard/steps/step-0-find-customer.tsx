'use client';

import AddIcon from '@mui/icons-material/Add';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { Box, Button, Chip } from '@mui/material';
import { CustomerStatus } from '@tejas96/shared/types';
import * as React from 'react';

import { useCustomerLookup } from '../../../hooks';

import {
  CUSTOMER_STATUS_CHIP_COLOR,
  useCustomerProperties,
  type Customer,
} from '@/components/features/customers';
import { MUIAvatar, MUIInput, MUITypography } from '@/components/ui';
import { color, radius, shadow } from '@/lib/theme/tokens';
import { toTitleLabel } from '@/lib/utils';

interface Step0FindCustomerProps {
  /** "Add a site for this customer" — jumps straight to the property steps. */
  onContinueExisting: (customer: Customer) => void;
  /**
   * "Create new customer" (no match) or "Not them — create new" (match found).
   * `prefillPhone` is only carried forward when nothing matched — reusing a
   * number that's already taken by the customer just found would immediately
   * fail duplicate-phone validation.
   */
  onStartNew: (prefillPhone: string | undefined) => void;
  /** Surfaces the inactive-customer block to the wizard shell. */
  onBlockedChange: (blocked: { title: string; body: string } | null) => void;
}

function digitsOnly(v: string): string {
  return v.replace(/\D/g, '').slice(0, 10);
}

export function Step0FindCustomer({
  onContinueExisting,
  onStartNew,
  onBlockedChange,
}: Step0FindCustomerProps): React.JSX.Element {
  const [phone, setPhone] = React.useState('');
  const [checked, setChecked] = React.useState(false);

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);
  const { customer: found, isLoading, isFetched } = useCustomerLookup(phone, { enabled: checked });
  const { data: foundProperties = [] } = useCustomerProperties(found?.id ?? '', {
    enabled: !!found,
  });

  const noMatch = checked && isFetched && !isLoading && !found;
  const isInactive = found?.status === CustomerStatus.INACTIVE;

  React.useEffect(() => {
    onBlockedChange(
      isInactive && found
        ? {
            title: 'This customer is inactive',
            body: `${found.firstName} ${found.lastName ?? ''}`
              .trim()
              .concat(
                ' was marked inactive, so no new site can be added. Reactivate the profile from the customer record first.',
              ),
          }
        : null,
    );
  }, [isInactive, found, onBlockedChange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <MUIInput
            fieldLabel="Mobile number"
            placeholder="98765 43210"
            inputMode="numeric"
            size="small"
            startIcon={<span className="text-sm text-foreground-secondary">+91</span>}
            inputProps={{ maxLength: 10 }}
            value={phone}
            onChange={(e) => {
              setPhone(digitsOnly(e.target.value));
              setChecked(false);
            }}
            error={
              phone && !isValidPhone ? 'Enter all 10 digits of an Indian mobile number' : undefined
            }
          />
        </Box>
        <Button
          type="button"
          variant="contained"
          size="small"
          onClick={() => isValidPhone && setChecked(true)}
          disabled={!isValidPhone || (checked && isLoading)}
          sx={{ mb: '2px' }}
        >
          {checked && isLoading ? 'Checking…' : 'Check number'}
        </Button>
      </Box>

      {noMatch && (
        <Box
          sx={{
            p: 2,
            borderRadius: radius['rf-lg'],
            background: color['canvas-sunken'],
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            alignItems: 'flex-start',
          }}
        >
          <Box>
            <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
              No customer on this number
            </Box>
            <Box sx={{ fontSize: 12.5, color: color['text-secondary'], mt: '3px' }}>
              We&apos;ll create a fresh profile and carry this number through.
            </Box>
          </Box>
          <Button
            type="button"
            variant="contained"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => onStartNew(phone)}
          >
            Create new customer
          </Button>
        </Box>
      )}

      {found && (
        <Box
          sx={{
            p: 2,
            borderRadius: radius['rf-lg'],
            background: color['canvas-sunken'],
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MUIAvatar name={`${found.firstName} ${found.lastName ?? ''}`} size="md" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {found.firstName} {found.lastName ?? ''}
              </Box>
              <Box sx={{ fontSize: 12, color: color['text-secondary'] }}>
                +91 {phone} · {found.city || 'No city on file'}
              </Box>
            </Box>
            <Chip
              label={toTitleLabel(found.status)}
              color={CUSTOMER_STATUS_CHIP_COLOR[found.status] ?? 'default'}
              size="small"
            />
          </Box>

          {foundProperties.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <Box
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: color['text-tertiary'],
                }}
              >
                Sites already on this profile
              </Box>
              {foundProperties.map((p) => (
                <Box
                  key={p.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    p: '9px 12px',
                    background: color.surface,
                    borderRadius: radius['rf-md'],
                    boxShadow: shadow.e1,
                  }}
                >
                  <HomeOutlinedIcon sx={{ color: color['accent-ink'], fontSize: 17 }} />
                  <Box sx={{ fontSize: 13, fontWeight: 500 }}>
                    {p.propertyName || 'Unnamed property'}
                  </Box>
                  <Box sx={{ fontSize: 12, color: color['text-tertiary'] }}>
                    {[p.city, p.pincode].filter(Boolean).join(' · ')}
                  </Box>
                  <Box
                    sx={{
                      ml: 'auto',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: color['text-tertiary'],
                    }}
                  >
                    {p.propertyCode}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="contained"
              size="small"
              startIcon={<AddIcon fontSize="small" />}
              disabled={isInactive}
              onClick={() => onContinueExisting(found)}
            >
              Add a site for this customer
            </Button>
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={() => onStartNew(undefined)}
            >
              Not them — create new
            </Button>
          </Box>
        </Box>
      )}

      {!checked && !found && (
        <MUITypography variant="timestamp" className="text-foreground-tertiary">
          Enter the mobile number and check it to continue.
        </MUITypography>
      )}
    </Box>
  );
}
