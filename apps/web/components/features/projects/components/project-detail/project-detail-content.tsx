'use client';

import Box from '@mui/material/Box';
import { ProjectStatus } from '@tejas96/shared/types';
import { FolderOpen } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { ProjectChatWidget } from './project-chat-widget';
import { ProjectDetailHeader } from './project-detail-header';
import { ProjectDetailTabs } from './project-detail-tabs';
import { EditProjectModal } from '../edit-project-modal';
import { ProjectBomTab } from './tabs/project-bom-tab';
import { ProjectDocumentsTab } from './tabs/project-documents-tab';
import { ProjectOverviewTab } from './tabs/project-overview-tab';
import { ProjectReportsTab } from './tabs/project-reports-tab';
import { ProjectSummaryTab } from './tabs/project-summary-tab';
import { ProjectSurveysTab } from './tabs/project-surveys-tab';
import { ProjectTasksTab } from './tabs/project-tasks-tab';
import { PROJECT_DETAIL_TABS, type ProjectDetailTab } from '../../constants';
import { useProject, useProjectTeam } from '../../hooks/use-project-detail';

import { ProjectFinanceTab } from '@/components/features/finance';
import { ProjectAllocationsTab } from '@/components/features/inventory';
import { Alert } from '@/components/shared/alerts/alert';
import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils/error';
import { recordRecentView } from '@/lib/utils/recent-views';
import { useAuth } from '@/providers/auth-provider';

interface ProjectDetailContentProps {
  projectId: string;
}

const VALID_TABS = new Set<string>(PROJECT_DETAIL_TABS.map((t) => t.value));

const STATUS_BANNERS = {
  [ProjectStatus.PLANNING]: {
    variant: 'info' as const,
    title: 'Project in Planning Phase',
    description:
      'This project is currently in the planning stage. Standard operations and schedules are not yet active.',
  },
  [ProjectStatus.ON_HOLD]: {
    variant: 'warning' as const,
    title: 'Project On Hold',
    description:
      'This project is currently on hold. Normal construction and execution activities are paused.',
  },
  [ProjectStatus.CANCELLED]: {
    variant: 'error' as const,
    title: 'Project Cancelled',
    description:
      'This project has been cancelled. No further actions or transactions should be processed.',
  },
};

function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
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
  const { data: projectTeam = [], refetch: refetchTeam } = useProjectTeam(projectId);
  const { user } = useAuth();

  const [editModalOpen, setEditModalOpen] = useState(false);

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

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !project) {
    return (
      <div className="p-4">
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

  const showStatusBanner =
    project.status !== ProjectStatus.ACTIVE && project.status !== ProjectStatus.COMPLETED;

  const statusBannerConfig = showStatusBanner
    ? STATUS_BANNERS[project.status as keyof typeof STATUS_BANNERS]
    : null;

  return (
    <div className="p-4 space-y-4">
      <ProjectDetailHeader project={project} onEdit={() => setEditModalOpen(true)} />

      {showStatusBanner && statusBannerConfig && (
        <Alert variant={statusBannerConfig.variant} title={statusBannerConfig.title}>
          {statusBannerConfig.description}
        </Alert>
      )}

      <ProjectDetailTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <Box className="mt-4">
        <Box sx={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
          <ProjectOverviewTab project={project} isActive={activeTab === 'overview'} />
        </Box>

        <Box sx={{ display: activeTab === 'summary' ? 'block' : 'none' }}>
          <ProjectSummaryTab
            project={project}
            projectId={projectId}
            isActive={activeTab === 'summary'}
          />
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
          <ProjectFinanceTab projectId={projectId} isActive={activeTab === 'finance'} />
        </Box>

        <Box sx={{ display: activeTab === 'bom' ? 'block' : 'none' }}>
          <ProjectBomTab projectId={projectId} defaultWarehouseId={project.defaultWarehouseId} />
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
      </Box>

      <EditProjectModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        project={project}
        currentTeam={projectTeam}
        onSuccess={() => {
          void refetch();
          void refetchTeam();
        }}
      />

      <ProjectChatWidget projectId={projectId} />
    </div>
  );
}
