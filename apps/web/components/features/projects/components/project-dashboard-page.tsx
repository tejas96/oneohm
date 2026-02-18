'use client';

/**
 * ProjectDashboardPage
 * Projects overview dashboard with stats, active projects, milestones, and team workload.
 * TODO: Implement dashboard cards, progress rings, and milestone timeline.
 */
export function ProjectDashboardPage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">Projects Dashboard</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        Track project progress, milestones, and team workload
      </p>
    </div>
  );
}
