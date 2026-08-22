/**
 * One root so completing a follow-up on the dashboard can invalidate the whole
 * screen in a single call. A card whose count survived the action it just
 * performed is the fastest way to make people stop trusting the page.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  /**
   * The subject is part of the key, and that is load-bearing. Without it,
   * React Query serves the previously selected employee's cached dashboard
   * under the next employee's name — a leak that looks exactly like a working
   * feature, because the page renders and the numbers are real. They are just
   * the wrong person's.
   *
   * `undefined` collapses to 'me' rather than being left out, so the key shape
   * is constant and the common case stays a single stable entry.
   */
  myWork: (subjectUserId?: string) =>
    [...dashboardKeys.all, 'my-work', subjectUserId ?? 'me'] as const,
};
