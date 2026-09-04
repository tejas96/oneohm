'use client';

import Box from '@mui/material/Box';
import { FolderOpen } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ProjectChatWidget } from './project-chat-widget';
import { ProjectDetailHeader } from './project-detail-header';
import { ProjectDetailTabs, type TabCount } from './project-detail-tabs';
import { EditProjectModal } from '../edit-project-modal';
import { ProjectBomTab } from './tabs/project-bom-tab';
import { ProjectDocumentsTab } from './tabs/project-documents-tab';
import { ProjectOverviewTab } from './tabs/project-overview-tab';
import { ProjectReportsTab } from './tabs/project-reports-tab';
import { ProjectSurveysTab } from './tabs/project-surveys-tab';
import { ProjectTasksTab } from './tabs/project-tasks-tab';
import type { Panel, ProjectDetailData } from './types';
import { PROJECT_DETAIL_TABS, type ProjectDetailTab } from '../../constants';
import { useProjectAttention } from '../../hooks/use-project-attention';
import { useProject, useProjectTeam } from '../../hooks/use-project-detail';
import { useProjectMilestones } from '../../hooks/use-project-payments';
import { useProjectReports } from '../../hooks/use-project-reports';

import { ProjectAllocationsTab } from '@/components/features/inventory';
import { ProjectMoneyTab } from '@/components/features/ledger/project-money-tab';
import { EntityServiceTicketsTab } from '@/components/features/service-tickets';
import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useProjectSummary } from '@/lib/hooks/resources';
import { useProjectLedger } from '@/lib/hooks/resources/ledger';
import { AccessDeniedContent, ALWAYS_OPEN, useCan } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils/error';
import { recordRecentView } from '@/lib/utils/recent-views';
import { useAuth } from '@/providers/auth-provider';

interface ProjectDetailContentProps {
  projectId: string;
}

const VALID_TABS = new Set<string>(PROJECT_DETAIL_TABS.map((t) => t.value));

/**
 * Collapses a query into the three states a card draws.
 *
 * "Loading" means no data yet and no failure — regardless of react-query's own
 * `isLoading`, which is false while a query is disabled. "Error" only while
 * there is nothing to show: a refetch that fails after a success keeps the
 * figures on screen rather than replacing them with a retry button.
 */
function toPanel<T>(query: {
  data: T | undefined;
  isError: boolean;
  refetch: () => unknown;
}): Panel<T> {
  const hasData = query.data !== undefined;
  return {
    data: query.data,
    isLoading: !hasData && !query.isError,
    isError: query.isError && !hasData,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** Full-page placeholder: breadcrumb, identity band, tab rail, body. */
function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4 pb-10" aria-busy>
      <Skeleton className="h-3.5 w-44 rounded-md" />
      <Skeleton className="h-[280px] w-full rounded-3xl" />
      <Skeleton className="h-[42px] w-full max-w-[760px] rounded-pill" />
      <Skeleton className="h-[230px] w-full rounded-3xl" />
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-56 rounded-3xl lg:col-span-7" />
        <Skeleton className="col-span-12 h-56 rounded-3xl lg:col-span-5" />
      </div>
    </div>
  );
}

export function ProjectDetailContent({ projectId }: ProjectDetailContentProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Backward-compat: the legacy "payments" tab was renamed to "finance"
  // when the merged Finance subsystem shipped. Existing bookmarks /
  // deep-links keep working by transparently mapping the old slug.
  const normalizeTab = (raw: string | null): ProjectDetailTab => {
    const value = raw ?? 'overview';
    if (value === 'payments') return 'finance';
    return VALID_TABS.has(value) ? (value as ProjectDetailTab) : 'overview';
  };

  const initialTab = normalizeTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    setActiveTab(normalizeTab(tab));
  }, [searchParams]);

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);
  const projectLoaded = project !== undefined;

  // Every hook below sits above the early returns: a hook that only runs on
  // some renders changes the hook count between renders and React throws.
  const { user } = useAuth();
  const { can } = useCan();
  const canViewFinance = can('finance.view');

  // The header band and the phase rail sit on every tab, so these load with
  // the page rather than with the Overview tab. They are gated on the project
  // having loaded: a bad id should cost one 404, not seven.
  const teamQuery = useProjectTeam(projectId, { enabled: projectLoaded });
  const reportsQuery = useProjectReports(projectId, { enabled: projectLoaded });
  const summaryQuery = useProjectSummary(projectId, { enabled: projectLoaded });
  const milestonesQuery = useProjectMilestones(projectId, { enabled: projectLoaded });
  const attentionQuery = useProjectAttention(projectId, { enabled: projectLoaded });
  // Money is the one region behind a permission. Not requested when blocked,
  // so a blocked user never sees a failed request where a figure should be.
  const ledgerQuery = useProjectLedger(projectId, { enabled: projectLoaded && canViewFinance });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const openEditModal = useCallback(() => setEditModalOpen(true), []);

  useEffect(() => {
    if (project && user?.id) {
      recordRecentView(user.id, {
        type: 'project',
        id: project.id,
        label: project.name || project.projectNumber,
        href: buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id }),
      });
    }
  }, [project, user?.id]);

  const handleTabChange = useCallback(
    (tab: ProjectDetailTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const data = useMemo<ProjectDetailData>(
    () => ({
      summary: toPanel(summaryQuery),
      milestones: toPanel(milestonesQuery),
      attention: toPanel(attentionQuery),
      ledger: { ...toPanel(ledgerQuery), allowed: canViewFinance },
      reports: toPanel(reportsQuery),
      team: toPanel(teamQuery),
    }),
    // Each query object is a new identity when its state changes; listing the
    // fields the panels read keeps the memo honest without re-deriving on
    // unrelated renders.
    [
      summaryQuery.data,
      summaryQuery.isError,
      milestonesQuery.data,
      milestonesQuery.isError,
      attentionQuery.data,
      attentionQuery.isError,
      ledgerQuery.data,
      ledgerQuery.isError,
      reportsQuery.data,
      reportsQuery.isError,
      teamQuery.data,
      teamQuery.isError,
      canViewFinance,
    ],
  );

  const tabCounts = useMemo((): Partial<Record<ProjectDetailTab, TabCount>> => {
    const counts: Partial<Record<ProjectDetailTab, TabCount>> = {};
    const metrics = summaryQuery.data?.metrics;
    if (metrics) {
      counts.tasks = { count: Math.max(0, metrics.totalTasks - metrics.completedTasks) };
    }
    const pendingReports = reportsQuery.data?.pendingCount ?? 0;
    if (pendingReports > 0) {
      counts.reports = { count: pendingReports, tone: 'warning' };
    }
    return counts;
  }, [summaryQuery.data?.metrics, reportsQuery.data?.pendingCount]);

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !project) {
    return (
      <div className="py-4">
        {isError ? (
          <ErrorState
            title="Failed to load project"
            description={getErrorMessage(error)}
            onRetry={() => refetch()}
          />
        ) : (
          <EmptyState
            icon={<FolderOpen className="w-full h-full" />}
            iconColor="error"
            title="Project not found"
            description="The project you're looking for doesn't exist or has been removed."
            action={{
              label: 'Back to Projects',
              onClick: () => router.push(ROUTES.PROJECTS.LIST),
            }}
          />
        )}
      </div>
    );
  }

  const activeTabGate =
    PROJECT_DETAIL_TABS.find((t) => t.value === activeTab)?.permission ?? ALWAYS_OPEN;

  return (
    <div className="pb-10">
      <ProjectDetailHeader
        project={project}
        data={data}
        onEdit={openEditModal}
        showPhaseRail={activeTab !== 'overview'}
      />

      <div className="mt-2">
        <ProjectDetailTabs activeTab={activeTab} onTabChange={handleTabChange} counts={tabCounts} />
      </div>

      {/* Guarded around the whole panel region, not per tab.
          These tabs toggle with `display: none`, so every one of them stays
          mounted and fires its data hooks regardless of which is showing.
          Gating them individually would still let a blocked tab fetch. */}
      {!can(activeTabGate) ? (
        <Box role="tabpanel" className="py-12">
          <AccessDeniedContent gate={activeTabGate} />
        </Box>
      ) : (
        <Box role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="mt-2">
          <Box sx={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            <ProjectOverviewTab project={project} data={data} onEditProject={openEditModal} />
          </Box>

          <Box sx={{ display: activeTab === 'tasks' ? 'block' : 'none' }}>
            <ProjectTasksTab
              projectId={projectId}
              project={project}
              isActive={activeTab === 'tasks'}
            />
          </Box>

          <Box sx={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
            <ProjectDocumentsTab projectId={projectId} propertyId={project.propertyId} />
          </Box>

          <Box sx={{ display: activeTab === 'finance' ? 'block' : 'none' }}>
            {/* `project` supplies the receipt's customer, site and project header
              with no extra request — the Money tab has no such data of its own. */}
            <ProjectMoneyTab
              projectId={projectId}
              project={project}
              isActive={activeTab === 'finance'}
            />
          </Box>

          <Box sx={{ display: activeTab === 'bom' ? 'block' : 'none' }}>
            <ProjectBomTab
              projectId={projectId}
              defaultWarehouseId={project.defaultWarehouseId}
              quoteId={project.quoteId}
            />
          </Box>

          <Box sx={{ display: activeTab === 'allocations' ? 'block' : 'none' }}>
            <ProjectAllocationsTab projectId={projectId} isActive={activeTab === 'allocations'} />
          </Box>

          <Box sx={{ display: activeTab === 'reports' ? 'block' : 'none' }}>
            <ProjectReportsTab projectId={projectId} />
          </Box>

          <Box sx={{ display: activeTab === 'surveys' ? 'block' : 'none' }}>
            <ProjectSurveysTab propertyId={project.propertyId} />
          </Box>

          <Box sx={{ display: activeTab === 'service' ? 'block' : 'none' }}>
            <EntityServiceTicketsTab
              scope="project"
              id={projectId}
              customerId={project.property?.customerId}
              enabled={activeTab === 'service'}
            />
          </Box>
        </Box>
      )}

      <EditProjectModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        project={project}
        currentTeam={teamQuery.data ?? []}
        onSuccess={() => {
          void refetch();
          void teamQuery.refetch();
        }}
      />

      <ProjectChatWidget projectId={projectId} />
    </div>
  );
}
