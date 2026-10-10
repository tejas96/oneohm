/**
 * Guards for derived values in the customers feature.
 *
 * `getSiteStageIndex` (the detail pages' stage rail) and the semantic tone maps
 * are computed rather than read, and each fails *silently* when it goes wrong —
 * a wrong stage still renders a plausible bar and a missing tone still renders
 * a grey pill. These tests make those loud instead.
 *
 * The customers LIST no longer derives a stage: it reads the server's journey.
 */

import { CustomerStatus, PropertyStatus, PropertyType, QuoteStatus } from '@tejas96/shared/types';

import {
  CUSTOMER_STATUS_TONE,
  getSiteStageIndex,
  PROPERTY_STATUS_TONE,
  PROPERTY_TYPE_TONE,
  QUOTE_STATUS_TONE,
  SITE_STAGES,
} from '../constants';

import { crm } from '@/lib/theme/tokens';

describe('getSiteStageIndex', () => {
  it('reports the earliest stage for a bare lead', () => {
    expect(getSiteStageIndex({})).toBe(0);
    expect(SITE_STAGES[getSiteStageIndex({})]).toBe('Lead captured');
  });

  it('advances on survey or site visit completion', () => {
    expect(getSiteStageIndex({ surveyDone: true })).toBe(1);
    expect(getSiteStageIndex({ siteVisitDone: true })).toBe(1);
    expect(SITE_STAGES[1]).toBe('Survey done');
  });

  it('treats an unsent quote as design-ready, not quote-sent', () => {
    const stage = getSiteStageIndex({ latestQuoteId: 'q1', latestQuoteStatus: QuoteStatus.DRAFT });
    expect(stage).toBe(2);
    expect(SITE_STAGES[stage]).toBe('Design ready');
  });

  it.each([QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.ACCEPTED, QuoteStatus.REJECTED])(
    'treats a %s quote as sent',
    (status) => {
      expect(getSiteStageIndex({ latestQuoteId: 'q1', latestQuoteStatus: status })).toBe(3);
    },
  );

  it('lets converted status win over every earlier signal', () => {
    // A converted site whose latest quote was rejected (e.g. re-quoted and won
    // on a later revision) must still read as converted, not "quote sent".
    expect(
      getSiteStageIndex({
        status: PropertyStatus.CONVERTED,
        latestQuoteId: 'q1',
        latestQuoteStatus: QuoteStatus.REJECTED,
        surveyDone: true,
      }),
    ).toBe(4);
    expect(SITE_STAGES[4]).toBe('Converted');
  });

  it('never returns an index outside the stage ladder', () => {
    const cases = [
      {},
      { surveyDone: true },
      { latestQuoteId: 'q1' },
      { latestQuoteStatus: QuoteStatus.SENT },
      { status: PropertyStatus.CONVERTED },
      { status: PropertyStatus.INACTIVE, latestQuoteStatus: QuoteStatus.EXPIRED },
    ];
    for (const input of cases) {
      const stage = getSiteStageIndex(input);
      expect(stage).toBeGreaterThanOrEqual(0);
      expect(stage).toBeLessThan(SITE_STAGES.length);
    }
  });
});

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
