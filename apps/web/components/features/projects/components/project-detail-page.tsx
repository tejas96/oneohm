'use client';

/**
 * ProjectDetailPage
 * Single project detail view with tabs for overview, tasks, documents, financials.
 * TODO: Implement project detail with tabbed layout, progress tracking, and task lists.
 */
export function ProjectDetailPage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">Project Detail</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        View and manage project details
      </p>
    </div>
  );
}
