/**
 * Google Maps Geocoding Utilities
 * Handles address parsing, geocoding, and reverse geocoding for India-only locations
 * Supports partial address component extraction
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

export interface PartialAddressComponents extends Partial<AddressComponents> {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface ExtractionResult {
  components: PartialAddressComponents;
  missingFields: (keyof AddressComponents)[];
  hasPartialData: boolean;
}

export interface PlaceDetails {
  placeId: string;
  fullAddress: string;
  components: PartialAddressComponents;
}

/**
 * Extract address components from Google Places API result
 * Returns both extracted data and missing fields
 * Handles partial data gracefully (doesn't fail if some components missing)
 *
 * @param place Google Places API PlaceResult
 * @returns ExtractionResult with components, missing fields, and partial data flag
 */
export function extractAddressComponentsFromPlace(
  place: google.maps.places.PlaceResult,
): ExtractionResult {
  if (!place.address_components) {
    return {
      components: {},
      missingFields: ['address', 'city', 'state', 'pincode', 'country'],
      hasPartialData: false,
    };
  }

  const components = place.address_components;
  const addressObj: PartialAddressComponents = {
    address: place.formatted_address || '',
    country: 'India',
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
  };

  // Extract components by type (fill what's available)
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

  // Determine which required fields are missing
  const requiredFields: (keyof AddressComponents)[] = [
    'address',
    'city',
    'state',
    'pincode',
    'country',
  ];
  const missingFields = requiredFields.filter((field) => !addressObj[field]);

  // Check if we have any extractable data (at least one optional field exists)
  const hasPartialData = !!(
    addressObj.address ||
    addressObj.city ||
    addressObj.state ||
    addressObj.pincode
  );

  return {
    components: addressObj,
    missingFields,
    hasPartialData,
  };
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

/**
 * Generate user-friendly message for missing components
 * @param missingFields Array of missing field names
 * @returns Formatted message string
 */
export function generateMissingFieldsMessage(
  missingFields: (keyof AddressComponents)[],
): string {
  if (missingFields.length === 0) return '';

  const fieldLabels: Record<keyof AddressComponents, string> = {
    address: 'Address',
    city: 'City',
    state: 'State',
    pincode: 'Postal Code',
    country: 'Country',
    lat: 'Latitude',
    lng: 'Longitude',
  };

  // Filter out lat/lng from labels (these are auto-filled and not user-visible)
  const userVisibleMissing = missingFields.filter((f) => f !== 'lat' && f !== 'lng');
  
  if (userVisibleMissing.length === 0) return '';

  const labels = userVisibleMissing.map((field) => fieldLabels[field]);
  const fieldList = labels.join(', ');
  const isPlural = userVisibleMissing.length > 1;

  return `${fieldList} ${isPlural ? 'were' : 'was'} not found in this address. Please fill ${isPlural ? 'them' : 'it'} manually.`;
}
