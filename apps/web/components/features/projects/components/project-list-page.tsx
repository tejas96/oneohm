'use client';

/**
 * ProjectListPage
 * All projects list with status filters (active, planning, on_hold, completed).
 * TODO: Implement data table, search, filters, and pagination.
 */
export function ProjectListPage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">All Projects</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        Browse and manage all projects
      </p>
    </div>
  );
}
