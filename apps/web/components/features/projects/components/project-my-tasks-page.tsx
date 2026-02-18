'use client';

/**
 * ProjectMyTasksPage
 * Current user's assigned project tasks across all projects.
 * TODO: Implement task list grouped by project with status filters.
 */
export function ProjectMyTasksPage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">My Tasks</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        View tasks assigned to you across all projects
      </p>
    </div>
  );
}
