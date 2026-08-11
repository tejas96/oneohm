import { maskAadhaar } from './validation';

describe('maskAadhaar', () => {
  it('masks a valid 12-digit Aadhaar number', () => {
    expect(maskAadhaar('234567890123')).toBe('XXXX-XXXX-0123');
  });

  it('normalizes formatted input before masking', () => {
    expect(maskAadhaar('2345 6789 0123')).toBe('XXXX-XXXX-0123');
  });

  it('returns undefined for missing or invalid values', () => {
    expect(maskAadhaar(undefined)).toBeUndefined();
    expect(maskAadhaar('')).toBeUndefined();
    expect(maskAadhaar('12345')).toBeUndefined();
  });
});
