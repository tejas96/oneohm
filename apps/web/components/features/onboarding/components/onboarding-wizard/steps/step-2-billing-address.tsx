'use client';

import * as React from 'react';

import { Alert, MUIAddressAutocomplete } from '@/components/shared';

interface Step2BillingAddressProps {
  isLocked: boolean;
  /** Create flow only — the note explaining the customer saves on continue. */
  showSaveNote: boolean;
}

/**
 * Billing address, captured through the same Google Places + map block the
 * site address uses, so a rep gets one address behaviour across the wizard.
 *
 * Country and coordinates are bound to wizard-only fields: the customer API
 * fixes country to India and stores no lat/lng, but the map still needs
 * somewhere to hold the pin.
 */
export function Step2BillingAddress({
  isLocked,
  showSaveNote,
}: Step2BillingAddressProps): React.JSX.Element {
  return (
    <div className="space-y-5">
      <MUIAddressAutocomplete
        showMap
        required
        disabled={isLocked}
        addressName="customer.address"
        cityName="customer.city"
        stateName="customer.state"
        pincodeName="customer.pincode"
        countryName="customerCountry"
        latitudeName="customerLatitude"
        longitudeName="customerLongitude"
      />

      {showSaveNote && (
        <Alert variant="info" appearance="minimal">
          The customer is saved as soon as you continue, so the site details can be filled in later
          without re-typing any of this.
        </Alert>
      )}
    </div>
  );
}
