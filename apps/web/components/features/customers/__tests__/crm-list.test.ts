/**
 * Guards for derived values in the customers feature.
 *
 * The semantic tone maps are computed rather than read, and fail *silently*
 * when they go wrong — a missing tone still renders a grey pill. These tests
 * make that loud instead.
 *
 * No stage is derived on the web any more: every screen reads the server's
 * journey (`stageIndex` / `lost`), so there is no client stage rule to test.
 */

import { CustomerStatus, PropertyStatus, PropertyType, QuoteStatus } from '@tejas96/shared/types';

import {
  CUSTOMER_STATUS_TONE,
  PROPERTY_STATUS_TONE,
  PROPERTY_TYPE_TONE,
  QUOTE_STATUS_TONE,
} from '../constants';

import { crm } from '@/lib/theme/tokens';

describe('tone maps are exhaustive over their enums', () => {
  // A missing entry falls back to 'neutral' at the call site, so a new enum
  // member would ship as an unremarkable grey pill rather than an error.
  it.each([
    ['customer status', Object.values(CustomerStatus), CUSTOMER_STATUS_TONE],
    ['property status', Object.values(PropertyStatus), PROPERTY_STATUS_TONE],
    ['property type', Object.values(PropertyType), PROPERTY_TYPE_TONE],
    ['quote status', Object.values(QuoteStatus), QUOTE_STATUS_TONE],
  ])('covers every %s value', (_label, values, map) => {
    for (const value of values as string[]) {
      expect((map as Record<string, string>)[value]).toBeDefined();
    }
  });
});

describe('CRM grid tokens', () => {
  // The tracks other CrmTable pages still borrow. (The customers list is no
  // longer a grid, so its own tracks and the sites sub-grid's are gone.)
  const SHARED_TRACKS = [
    crm['col-select'],
    crm['col-caret'],
    crm['col-customer'],
    crm['col-portfolio'],
    crm['col-status'],
    crm['col-onboarded'],
    crm['col-actions'],
  ];

  it('defines every column track', () => {
    for (const track of SHARED_TRACKS) {
      expect(track).toBeTruthy();
    }
  });

  it('keeps each track a single grid column', () => {
    // CrmTable joins visible tracks with a space to build
    // `grid-template-columns`. A token holding two tracks would silently shift
    // every column after it by one, misaligning header from body.
    for (const track of SHARED_TRACKS) {
      // Strip minmax(...) — its internal comma and space are part of one track.
      const collapsed = track.replace(/minmax\([^)]*\)/g, 'X');
      expect(collapsed.trim()).not.toMatch(/\s/);
    }
  });
});
