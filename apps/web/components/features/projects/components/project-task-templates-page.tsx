'use client';

/**
 * ProjectTaskTemplatesPage
 * Manage reusable task templates for project workflows.
 * TODO: Implement CRUD for task templates with drag-and-drop ordering.
 */
export function ProjectTaskTemplatesPage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">Task Templates</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        Manage reusable task templates for projects
      </p>
    </div>
  );
}
