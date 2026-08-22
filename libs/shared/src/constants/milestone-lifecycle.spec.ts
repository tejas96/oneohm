import { MILESTONE_LIFECYCLE_SEQUENCE } from './milestone-lifecycle';
import {
  canonicalMilestoneOrder,
  compareMilestoneSequence,
  milestoneSequenceIndex,
} from '../utils/milestone';

/** Captured from GET /projects/:id/milestones on the broken overview rail. */
const REPRODUCED_AGGREGATES = [
  { name: 'Installation', order: 1 },
  { name: 'Net Metering Application', order: 1 },
  { name: 'Permits & Approvals', order: 1 },
  { name: 'DISCOM Application', order: 2 },
  { name: 'Loan Processing', order: 2 },
  { name: 'Planning', order: 2 },
  { name: 'Site Survey & Design', order: 3 },
  { name: 'Equipment Delivery', order: 4 },
  { name: 'Civil & Structural Work', order: 5 },
  { name: 'Electrical Work', order: 5 },
  { name: 'Inspection & Testing', order: 5 },
  { name: 'Documentation', order: 6 },
  { name: 'Commissioning & Testing', order: 7 },
  { name: 'Customer Training', order: 7 },
  { name: 'DISCOM Inspection', order: 7 },
  { name: 'Net Meter Installation', order: 7 },
  { name: 'Commissioning', order: 9 },
  { name: 'Handover', order: 9 },
] as const;

describe('milestone lifecycle sequence', () => {
  it('has unique catalog names', () => {
    expect(new Set(MILESTONE_LIFECYCLE_SEQUENCE).size).toBe(MILESTONE_LIFECYCLE_SEQUENCE.length);
  });

  it('does not let Installation substring-match Net Meter Installation', () => {
    expect(canonicalMilestoneOrder('Installation')).not.toBe(
      canonicalMilestoneOrder('Net Meter Installation'),
    );
    expect(canonicalMilestoneOrder('Installation')).toBeLessThan(
      canonicalMilestoneOrder('Net Meter Installation') ?? Infinity,
    );
  });

  it('sorts the reproduced project so Planning is first and Installation is after electrical work', () => {
    const sorted = [...REPRODUCED_AGGREGATES].sort(compareMilestoneSequence).map((m) => m.name);

    expect(sorted[0]).toBe('Planning');
    expect(sorted).not.toContainEqual(undefined);
    expect(sorted.indexOf('Installation')).toBeGreaterThan(sorted.indexOf('Planning'));
    expect(sorted.indexOf('Installation')).toBeGreaterThan(sorted.indexOf('Permits & Approvals'));
    expect(sorted.indexOf('Installation')).toBeGreaterThan(sorted.indexOf('Electrical Work'));
    expect(sorted.indexOf('Installation')).toBeLessThan(sorted.indexOf('Inspection & Testing'));
    expect(sorted).toEqual([
      'Planning',
      'Site Survey & Design',
      'Permits & Approvals',
      'DISCOM Application',
      'Net Metering Application',
      'Loan Processing',
      'Equipment Delivery',
      'Civil & Structural Work',
      'Electrical Work',
      'Installation',
      'Inspection & Testing',
      'Commissioning',
      'Commissioning & Testing',
      'DISCOM Inspection',
      'Net Meter Installation',
      'Handover',
      'Customer Training',
      'Documentation',
    ]);
  });

  it('places unknown names after the catalog, not among order-1 stages', () => {
    const sorted = [
      { name: 'Installation', order: 1 },
      { name: 'Custom Client Hold', order: 1 },
      { name: 'Planning', order: 2 },
    ].sort(compareMilestoneSequence);

    expect(sorted.map((m) => m.name)).toEqual([
      'Planning',
      'Installation',
      'Custom Client Hold',
    ]);
    expect(milestoneSequenceIndex('Custom Client Hold', 1)).toBeGreaterThan(
      milestoneSequenceIndex('Installation', 1),
    );
  });
});
