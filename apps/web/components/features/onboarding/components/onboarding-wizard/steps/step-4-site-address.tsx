'use client';

import { Box } from '@mui/material';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { MUIAddressAutocomplete } from '@/components/shared';
import { MUISwitch } from '@/components/ui';
import { color, radius } from '@/lib/theme/tokens';

interface BillingAddress {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface Step4SiteAddressProps {
  /** The resolved customer's billing address — copied in when "same as billing" is on. */
  billingAddress: BillingAddress;
  /**
   * Hidden when editing an existing site: the shortcut only makes sense while
   * first capturing a site, and edit mode never loads the customer's billing
   * address to copy from.
   */
  showSameAsBilling: boolean;
}

/**
 * "Same as billing" toggle + the shared Google-Places address block.
 *
 * The toggle is a one-way copy rather than the mockup's disabled-fields
 * treatment: the address component owns its own inputs (and the map's
 * drag-to-reposition), so locking them would break pin adjustment. Copying
 * in and leaving them editable gives the same shortcut without that cost.
 */
export function Step4SiteAddress({
  billingAddress,
  showSameAsBilling,
}: Step4SiteAddressProps): React.JSX.Element {
  const { watch, setValue } = useFormContext();
  const sameAsBilling = Boolean(watch('sameAsBilling'));
  const hasBillingAddress = Boolean(billingAddress.address || billingAddress.city);

  React.useEffect(() => {
    if (!sameAsBilling) return;
    setValue('address', billingAddress.address ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('city', billingAddress.city ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('state', billingAddress.state ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('pincode', billingAddress.pincode ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('country', billingAddress.country || 'India', {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [
    sameAsBilling,
    billingAddress.address,
    billingAddress.city,
    billingAddress.state,
    billingAddress.pincode,
    billingAddress.country,
    setValue,
  ]);

  return (
    <div className="space-y-5">
      {showSameAsBilling && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.75,
            p: '13px 15px',
            borderRadius: radius['rf-lg'],
            background: sameAsBilling ? color['accent-subtle'] : color['canvas-sunken'],
            transition: 'background 160ms ease',
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Same as billing address
            </Box>
            <Box sx={{ fontSize: 12.5, color: color['text-secondary'], textWrap: 'pretty' }}>
              {hasBillingAddress
                ? [billingAddress.address, billingAddress.city, billingAddress.pincode]
                    .filter(Boolean)
                    .join(', ')
                : 'No billing address on file'}
            </Box>
          </Box>
          <MUISwitch
            id="sameAsBilling"
            checked={sameAsBilling}
            onCheckedChange={(checked) => setValue('sameAsBilling', checked, { shouldDirty: true })}
            disabled={!hasBillingAddress}
          />
        </Box>
      )}

      <MUIAddressAutocomplete showMap required />
    </div>
  );
}
