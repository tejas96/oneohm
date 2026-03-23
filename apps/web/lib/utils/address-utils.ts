/**
 * Extracted address components from Google Places API
 */
export interface PlaceDetails {
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Extracts address components from a Google Places PlaceResult.
 * Handles null/undefined place data safely.
 *
 * @param place - PlaceResult from PlacesService.getDetails()
 * @returns PlaceDetails with extracted components (empty strings for missing values)
 */
export function extractAddressComponents(
  place: google.maps.places.PlaceResult | null | undefined,
): PlaceDetails {
  const empty: PlaceDetails = {
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    lat: null,
    lng: null,
  };

  if (!place) return empty;

  const components = place.address_components ?? [];
  const getComponent = (types: string[]): string => {
    const c = components.find((comp) =>
      types.some((t) => comp.types?.includes(t)),
    );
    return c?.long_name ?? '';
  };

  const streetNumber = getComponent(['street_number']);
  const route = getComponent(['route']);
  const address =
    [streetNumber, route].filter(Boolean).join(' ') ||
    (place.formatted_address ?? '');

  const city =
    getComponent(['locality']) ||
    getComponent(['sublocality', 'sublocality_level_1']) ||
    getComponent(['administrative_area_level_2']) ||
    '';

  const state = getComponent(['administrative_area_level_1']) ?? '';
  const pincode = getComponent(['postal_code']) ?? '';
  const country = getComponent(['country']) ?? '';

  let lat: number | null = null;
  let lng: number | null = null;
  if (place.geometry?.location) {
    const loc = place.geometry.location;
    if (typeof loc.lat === 'function') {
      lat = loc.lat();
      lng = loc.lng();
    } else {
      lat = (loc as { lat: number; lng: number }).lat ?? null;
      lng = (loc as { lat: number; lng: number }).lng ?? null;
    }
  }

  return {
    address: address || (place.formatted_address ?? ''),
    city,
    state,
    pincode,
    country,
    lat,
    lng,
  };
}
