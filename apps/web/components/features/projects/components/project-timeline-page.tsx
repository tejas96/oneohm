'use client';

/**
 * ProjectTimelinePage
 * Timeline / Gantt chart view for project scheduling.
 * TODO: Implement Gantt chart with milestones, dependencies, and date ranges.
 */
export function ProjectTimelinePage(): React.JSX.Element {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-foreground">Timeline / Gantt</h1>
      <p className="text-sm text-foreground-secondary mt-1">
        View project schedules and milestones on a timeline
      </p>
    </div>
  );
}
