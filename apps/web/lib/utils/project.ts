/**
 * Project-specific URL-building utilities.
 *
 * These helpers produce deep-link URLs that land on a specific tab
 * of the project detail page with pre-applied filter state.
 */

/**
 * Build a URL that navigates to the Tasks tab of a project detail page
 * with optional pre-applied filters.
 *
 * @param projectPath - Resolved project path, e.g. `/projects/abc123`
 * @param filter      - Optional filter values to pre-apply
 *
 * @example
 * buildTasksTabUrl('/projects/abc', { status: 'in_progress' })
 * // → '/projects/abc?tab=tasks&t_status=in_progress'
 *
 * buildTasksTabUrl('/projects/abc', { assignee: 'user-id' })
 * // → '/projects/abc?tab=tasks&t_assignee=user-id'
 */
export function buildTasksTabUrl(
  projectPath: string,
  filter?: { status?: string; priority?: string; assignee?: string },
): string {
  const params = new URLSearchParams({ tab: 'tasks' });
  if (filter?.status) params.set('t_status', filter.status);
  if (filter?.priority) params.set('t_priority', filter.priority);
  if (filter?.assignee) params.set('t_assignee', filter.assignee);
  return `${projectPath}?${params.toString()}`;
}
