import { describe, it, expect } from '@jest/globals';
import { COMPANY } from '@tejas96/shared/constants';

import { RECEIPT_COMPANY } from './receipt-pdf.template';

describe('COMPANY', () => {
  it('carries the registered company identity', () => {
    expect(COMPANY.name).toBe('OneOhm');
    expect(COMPANY.email).toBe('sanjay@oneohm.com');
    expect(COMPANY.phone).toBe('+919850808484');
    expect(COMPANY.address).toBe('Plot No.93, Vasantdada Industrial Estate, Sangli');
    expect(COMPANY.pincode).toBe('416416');
  });

  it('carries the tax identifiers for reference', () => {
    expect(COMPANY.gstin).toBe('27AABCU9603R1ZM');
    expect(COMPANY.pan).toBe('AABCU9603R');
  });

  it('carries the business defaults that used to live on the organizations row', () => {
    expect(COMPANY.currency).toBe('INR');
    expect(COMPANY.timezone).toBe('Asia/Kolkata');
    expect(COMPANY.defaultQuoteValidityDays).toBe(30);
    expect(COMPANY.maxQuoteVersions).toBe(3);
    expect(COMPANY.defaultProjectTimelineWeeks).toBe(4);
  });
});

describe('RECEIPT_COMPANY', () => {
  it('is derived from the shared COMPANY constant, not hardcoded', () => {
    expect(RECEIPT_COMPANY.name).toBe(COMPANY.name);
    expect(RECEIPT_COMPANY.email).toBe(COMPANY.email);
    expect(RECEIPT_COMPANY.phone).toBe(COMPANY.phone);
  });

  it('prints a postal address assembled from COMPANY parts', () => {
    expect(RECEIPT_COMPANY.address).toContain(COMPANY.address);
    expect(RECEIPT_COMPANY.address).toContain(COMPANY.pincode);
  });

  it('never exposes tax identifiers — a receipt is not a tax invoice', () => {
    const printed = JSON.stringify(RECEIPT_COMPANY);
    expect(printed).not.toContain(COMPANY.gstin);
    expect(printed).not.toContain(COMPANY.pan);
  });
});
