'use client';

/**
 * ProjectNewPage
 * Create new project form.
 * TODO: Implement project creation form with react-hook-form + Zod schema.
 */
export function ProjectNewPage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">New Project</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        Create a new project
      </p>
    </div>
  );
}
