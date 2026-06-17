import { UserGender } from '@tejas96/shared/types';

// ── Gender ──────────────────────────────────────────────────────

export const GENDER_OPTIONS = [
  { value: UserGender.MALE, label: 'Male' },
  { value: UserGender.FEMALE, label: 'Female' },
  { value: UserGender.OTHER, label: 'Other' },
];

// ── Country ─────────────────────────────────────────────────────

export const COUNTRY_OPTIONS = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'UAE', label: 'UAE' },
  { value: 'Other', label: 'Other' },
];

// ── Profile Completion ──────────────────────────────────────────

export const PROFILE_COMPLETION_FIELDS = [
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'PIN Code' },
] as const;
