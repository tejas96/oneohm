/**
 * One root so completing a follow-up on the dashboard can invalidate the whole
 * screen in a single call. A card whose count survived the action it just
 * performed is the fastest way to make people stop trusting the page.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  myWork: () => [...dashboardKeys.all, 'my-work'] as const,
};
