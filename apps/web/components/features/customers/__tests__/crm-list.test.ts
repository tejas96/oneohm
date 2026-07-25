/**
 * Guards for the derived values behind the CRM customer list.
 *
 * The list renders three things that are computed rather than read: a site's
 * pipeline stage, a semantic tone per enum value, and the site-status
 * distribution bar. Each fails *silently* when it goes wrong — a wrong stage
 * still renders a plausible bar, a missing tone still renders a grey pill, and
 * a missing bar segment still renders a bar that just doesn't add up. These
 * tests make each of those loud instead.
 */

import { CustomerStatus, PropertyStatus, PropertyType, QuoteStatus } from '@tejas96/shared/types';

import {
  CUSTOMER_STATUS_TONE,
  getSiteStageIndex,
  LEAD_SOURCE_TONE,
  PROPERTY_STATUS_BAR_ORDER,
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

  it('covers every lead source the enum defines', () => {
    // LeadSource permits free-text values under `other`, so this checks the
    // enumerated members only — unknown strings legitimately fall back.
    for (const source of [
      'website',
      'referral',
      'reseller',
      'walk_in',
      'social_media',
      'advertisement',
      'exhibition',
      'cold_call',
      'other',
    ]) {
      expect(LEAD_SOURCE_TONE[source]).toBeDefined();
    }
  });
});

describe('site-status distribution bar', () => {
  it('renders a segment for every possible site status', () => {
    // The bar widths are `count / siteCount`. A status missing from the order
    // is dropped from the bar entirely, so the segments quietly stop summing
    // to 100% and the row under-reports its own portfolio.
    expect([...PROPERTY_STATUS_BAR_ORDER].sort()).toEqual(Object.values(PropertyStatus).sort());
  });

  it('lists no status twice', () => {
    expect(new Set(PROPERTY_STATUS_BAR_ORDER).size).toBe(PROPERTY_STATUS_BAR_ORDER.length);
  });

  it('sums to the full width for any status distribution', () => {
    const statusCounts: Record<string, number> = {
      [PropertyStatus.CONVERTED]: 4,
      [PropertyStatus.ACTIVE]: 2,
      [PropertyStatus.PENDING_VERIFICATION]: 1,
      [PropertyStatus.INACTIVE]: 3,
    };
    const siteCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const total = PROPERTY_STATUS_BAR_ORDER.reduce(
      (sum, status) => sum + ((statusCounts[status] ?? 0) / siteCount) * 100,
      0,
    );
    expect(total).toBeCloseTo(100, 10);
  });
});

describe('CRM grid tokens', () => {
  const CUSTOMER_TRACKS = [
    crm['col-select'],
    crm['col-caret'],
    crm['col-customer'],
    crm['col-contact'],
    crm['col-location'],
    crm['col-source'],
    crm['col-portfolio'],
    crm['col-status'],
    crm['col-onboarded'],
    crm['col-owner'],
    crm['col-creator'],
    crm['col-actions'],
  ];

  const SITE_TRACKS = [
    crm['sites-col-site'],
    crm['sites-col-type'],
    crm['sites-col-stage'],
    crm['sites-col-quote'],
    crm['sites-col-cost'],
    crm['sites-col-discom'],
    crm['sites-col-status'],
    crm['sites-col-added'],
    crm['sites-col-actions'],
  ];

  it('defines every column track', () => {
    for (const track of [...CUSTOMER_TRACKS, ...SITE_TRACKS]) {
      expect(track).toBeTruthy();
    }
  });

  it('keeps each track a single grid column', () => {
    // CrmTable joins visible tracks with a space to build
    // `grid-template-columns`. A token holding two tracks would silently shift
    // every column after it by one, misaligning header from body.
    for (const track of [...CUSTOMER_TRACKS, ...SITE_TRACKS]) {
      // Strip minmax(...) — its internal comma and space are part of one track.
      const collapsed = track.replace(/minmax\([^)]*\)/g, 'X');
      expect(collapsed.trim()).not.toMatch(/\s/);
    }
  });

  it('gives the sites sub-grid one track per header', () => {
    expect(SITE_TRACKS).toHaveLength(9);
  });
});
