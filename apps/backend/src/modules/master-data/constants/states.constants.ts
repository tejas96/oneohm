/**
 * Indian States and Union Territories
 * Complete list of all 28 Indian states (alphabetically sorted)
 * Used for address form dropdowns and geolocation validation
 *
 * @module master-data/constants/states
 */

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

/**
 * Check if a state is valid
 */
export function isValidIndianState(state: string): state is IndianState {
  return INDIAN_STATES.includes(state as IndianState);
}

/**
 * Get normalized state name (handles case variations)
 */
export function getNormalizedState(state: string): IndianState | null {
  const normalized = state
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const found = INDIAN_STATES.find((s) => s.toLowerCase() === normalized.toLowerCase());
  return (found as IndianState) || null;
}
