/**
 * The cards that the old tabs became.
 *
 * `/customers/<id>?tab=finance` and `/properties/<id>?tab=followups` are in
 * notifications already sent and in people's bookmarks, so they must keep
 * landing on the right part of the page: the value is the id of the card to
 * scroll to. A tab with no card of its own (the old Overview) lands at the top.
 */
const TAB_CARD: Record<string, string> = {
  // A link made by this page names the card itself.
  money: 'money',
  quote: 'quote',
  site: 'site',
  history: 'history',
  properties: 'site',
  quotes: 'quote',
  projects: 'project',
  project: 'project',
  documents: 'documents',
  followups: 'followups',
  finance: 'money',
  service: 'service',
  activity: 'history',
};

/** The id of the card an old `?tab=` value points at, or null for the top of the page. */
export function legacyTabTarget(tab: string | null): string | null {
  return tab ? (TAB_CARD[tab] ?? null) : null;
}
