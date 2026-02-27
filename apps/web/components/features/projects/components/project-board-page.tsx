'use client';

/**
 * ProjectBoardPage
 * Kanban board view for project task management.
 * TODO: Implement drag-and-drop kanban columns with task cards.
 */
export function ProjectBoardPage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">Kanban Board</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        Manage project tasks in board view
      </p>
    </div>
  );
}
