/**
 * Google Maps Geocoding Utilities
 * Handles address parsing, geocoding, and reverse geocoding for India-only locations
 */

export interface AddressComponents {
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface PlaceDetails {
  placeId: string;
  fullAddress: string;
  components: AddressComponents;
}

/**
 * Extract address components from Google Places API result
 * Filters and structures the data specific to Indian addresses
 */
export function extractAddressComponentsFromPlace(
  place: google.maps.places.PlaceResult,
): AddressComponents | null {
  if (!place.address_components) return null;

  const components = place.address_components;
  const addressObj: Partial<AddressComponents> = {
    address: place.formatted_address || '',
    country: 'India',
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
  };

  // Extract components by type
  components.forEach((component) => {
    const types = component.types;
    const longName = component.long_name;
    const shortName = component.short_name;

    if (types.includes('postal_code')) {
      addressObj.pincode = shortName;
    } else if (types.includes('administrative_area_level_1')) {
      // State/Province
      addressObj.state = longName;
    } else if (types.includes('administrative_area_level_2')) {
      // District/City
      if (!addressObj.city) {
        addressObj.city = longName;
      }
    } else if (types.includes('locality')) {
      // City/Town
      if (!addressObj.city) {
        addressObj.city = longName;
      }
    } else if (types.includes('administrative_area_level_3')) {
      // Sometimes city is at level 3
      if (!addressObj.city) {
        addressObj.city = longName;
      }
    }
  });

  // Verify we have required fields
  if (!addressObj.city || !addressObj.state || !addressObj.pincode) {
    return null;
  }

  return addressObj as AddressComponents;
}

/**
 * Validate if a place is within India
 * Check country code from address components
 */
export function isPlaceInIndia(place: google.maps.places.PlaceResult): boolean {
  if (!place.address_components) return false;

  const countryComponent = place.address_components.find((component) =>
    component.types.includes('country'),
  );

  return (
    countryComponent?.short_name === 'IN' || countryComponent?.long_name === 'India'
  );
}

/**
 * Format a place prediction into a readable address string
 */
export function formatPlacePrediction(prediction: google.maps.places.AutocompletePrediction): string {
  return prediction.description;
}

/**
 * Sanitize user input for address search
 * Remove special characters that might cause issues
 */
export function sanitizeAddressInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 150); // Limit length
}

/**
 * Check if address has all required components
 */
export function hasAllAddressComponents(components: Partial<AddressComponents>): boolean {
  return !!(components.address && components.city && components.state && components.pincode);
}
