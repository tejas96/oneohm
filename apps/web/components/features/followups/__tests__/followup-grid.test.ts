/**
 * Guards the follow-up row's column tracks.
 *
 * The first grid reused customer-list tracks (`col-onboarded` 102px for Due,
 * `col-actions` 40px for Complete + kebab). The due pill ("Today, 9:00 am")
 * painted over Lead, while Lead/Subject — the columns with leftover width —
 * never received tracks of their own. These assertions pin the fixed floors so
 * that cannot silently happen again. Lead and Subject are flexible with no
 * floor: their text truncates, and a floor would push the row past the list at
 * its narrowest wide width.
 */

import { FOLLOWUP_GRID_TRACKS } from '../constants';

import { crm } from '@/lib/theme/tokens';

function trackFloorPx(track: string): number {
  const minmax = /^minmax\((\d+)px,/.exec(track);
  if (minmax) return Number(minmax[1]);
  const fixed = /^(\d+)px$/.exec(track);
  if (fixed) return Number(fixed[1]);
  throw new Error(`Cannot read a pixel floor from "${track}"`);
}

describe('follow-up grid tracks', () => {
  const tracks = Object.values(FOLLOWUP_GRID_TRACKS);

  it('keeps each track a single grid column', () => {
    for (const track of tracks) {
      const collapsed = track.replace(/minmax\([^)]*\)/g, 'X');
      expect(collapsed.trim()).not.toMatch(/\s/);
    }
  });

  it('gives Due room for a nowrap status pill', () => {
    // "Today, 9:00 am" is ~107px as a pill; upcoming labels like
    // "15 Feb 2026, 10:00 am" are longer. The customer onboarded track (102px)
    // overflowed into Lead.
    expect(trackFloorPx(FOLLOWUP_GRID_TRACKS.due)).toBeGreaterThanOrEqual(160);
    expect(FOLLOWUP_GRID_TRACKS.due).not.toBe(crm['col-onboarded']);
  });

  it('lets Lead and Subject absorb leftover width', () => {
    expect(FOLLOWUP_GRID_TRACKS.lead).toContain('fr');
    expect(FOLLOWUP_GRID_TRACKS.subject).toContain('fr');
  });

  it('fits the list at its narrowest wide width', () => {
    // The row goes wide when the list is 960px; the card pads 20px each side
    // and there are six 18px gaps between the seven cells.
    const floors = tracks.reduce((sum, track) => sum + trackFloorPx(track), 0);
    expect(floors + 6 * 18).toBeLessThanOrEqual(960 - 40);
  });

  it('gives Actions room for Complete plus the kebab', () => {
    expect(trackFloorPx(FOLLOWUP_GRID_TRACKS.actions)).toBeGreaterThanOrEqual(150);
    expect(FOLLOWUP_GRID_TRACKS.actions).not.toBe(crm['col-actions']);
  });
});
