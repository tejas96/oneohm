export interface IndianStateOption {
  code: string;
  label: string;
  aliases?: readonly string[];
}

export const INDIAN_STATE_OPTIONS: readonly IndianStateOption[] = [
  { code: 'AP', label: 'Andhra Pradesh' },
  { code: 'AR', label: 'Arunachal Pradesh' },
  { code: 'AS', label: 'Assam' },
  { code: 'BR', label: 'Bihar' },
  { code: 'CG', label: 'Chhattisgarh' },
  { code: 'GA', label: 'Goa' },
  { code: 'GJ', label: 'Gujarat' },
  { code: 'HR', label: 'Haryana' },
  { code: 'HP', label: 'Himachal Pradesh' },
  { code: 'JH', label: 'Jharkhand' },
  { code: 'KA', label: 'Karnataka' },
  { code: 'KL', label: 'Kerala' },
  { code: 'MP', label: 'Madhya Pradesh' },
  { code: 'MH', label: 'Maharashtra' },
  { code: 'MN', label: 'Manipur' },
  { code: 'ML', label: 'Meghalaya' },
  { code: 'MZ', label: 'Mizoram' },
  { code: 'NL', label: 'Nagaland' },
  { code: 'OD', label: 'Odisha', aliases: ['orissa'] },
  { code: 'PB', label: 'Punjab' },
  { code: 'RJ', label: 'Rajasthan' },
  { code: 'SK', label: 'Sikkim' },
  { code: 'TN', label: 'Tamil Nadu' },
  { code: 'TS', label: 'Telangana' },
  { code: 'TR', label: 'Tripura' },
  { code: 'UP', label: 'Uttar Pradesh' },
  { code: 'UK', label: 'Uttarakhand', aliases: ['uttaranchal'] },
  { code: 'WB', label: 'West Bengal' },
  { code: 'AN', label: 'Andaman and Nicobar Islands' },
  { code: 'CH', label: 'Chandigarh' },
  {
    code: 'DNDD',
    label: 'Dadra and Nagar Haveli and Daman and Diu',
    aliases: ['dadra nagar haveli daman diu'],
  },
  { code: 'DL', label: 'Delhi', aliases: ['nct of delhi', 'new delhi'] },
  {
    code: 'JK',
    label: 'Jammu and Kashmir',
    aliases: ['jammu & kashmir', 'jammu and kashmir union territory'],
  },
  { code: 'LA', label: 'Ladakh' },
  { code: 'LD', label: 'Lakshadweep' },
  { code: 'PY', label: 'Puducherry', aliases: ['pondicherry'] },
] as const;

export const INDIAN_STATE_LABELS: readonly string[] = INDIAN_STATE_OPTIONS.map((state) => state.label);

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDIAN_STATE_LOOKUP = new Map<string, IndianStateOption>();

for (const state of INDIAN_STATE_OPTIONS) {
  INDIAN_STATE_LOOKUP.set(normalizeKey(state.label), state);
  INDIAN_STATE_LOOKUP.set(normalizeKey(state.code), state);
  for (const alias of state.aliases ?? []) {
    INDIAN_STATE_LOOKUP.set(normalizeKey(alias), state);
  }
}

export function findIndianState(value?: string | null): IndianStateOption | undefined {
  if (!value) return undefined;
  return INDIAN_STATE_LOOKUP.get(normalizeKey(value));
}

export function normalizeIndianStateLabel(value?: string | null): string {
  const state = findIndianState(value);
  return state?.label ?? (value ?? '');
}
