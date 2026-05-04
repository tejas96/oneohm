'use client';

import { FolderOpen } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

import { ProjectDetailHeader } from './project-detail-header';
import { ProjectDetailTabs } from './project-detail-tabs';
import { EditProjectModal } from '../edit-project-modal';
import { ProjectBomTab } from './tabs/project-bom-tab';
import { ProjectDocumentsTab } from './tabs/project-documents-tab';
import { ProjectOverviewTab } from './tabs/project-overview-tab';
import { ProjectPaymentsTab } from './tabs/project-payments-tab';
import { ProjectReportsTab } from './tabs/project-reports-tab';
import { ProjectSummaryTab } from './tabs/project-summary-tab';
import { ProjectSurveysTab } from './tabs/project-surveys-tab';
import { ProjectTasksTab } from './tabs/project-tasks-tab';
import { PROJECT_DETAIL_TABS, type ProjectDetailTab } from '../../constants';
import { useProject, useProjectTeam } from '../../hooks/use-project-detail';

import { ProjectAllocationsTab } from '@/components/features/inventory';
import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils/error';
import { recordRecentView } from '@/lib/utils/recent-views';
import { useAuth } from '@/providers/auth-provider';

interface ProjectDetailContentProps {
  projectId: string;
}

const VALID_TABS = new Set<string>(PROJECT_DETAIL_TABS.map((t) => t.value));

function LoadingSkeleton() {
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

  const tabParam = searchParams.get('tab') ?? 'overview';
  const initialTab = VALID_TABS.has(tabParam) ? (tabParam as ProjectDetailTab) : 'overview';
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>(initialTab);

  useEffect(() => {
    const param = searchParams.get('tab') ?? 'overview';
    const tab = VALID_TABS.has(param) ? (param as ProjectDetailTab) : 'overview';
    setActiveTab(tab);
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

  return (
    <div className="p-4 space-y-4">
      <ProjectDetailHeader project={project} onEdit={() => setEditModalOpen(true)} />

      <ProjectDetailTabs activeTab={activeTab} onTabChange={handleTabChange}>
        <TabsContent value="overview">
          <ProjectOverviewTab project={project} isActive={activeTab === 'overview'} />
        </TabsContent>

        <TabsContent value="summary">
          <ProjectSummaryTab
            project={project}
            projectId={projectId}
            isActive={activeTab === 'summary'}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasksTab
            projectId={projectId}
            project={project}
            isActive={activeTab === 'tasks'}
          />
        </TabsContent>

        <TabsContent value="documents">
          <ProjectDocumentsTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="payments">
          <ProjectPaymentsTab projectId={projectId} isActive={activeTab === 'payments'} />
        </TabsContent>

        <TabsContent value="bom">
          <ProjectBomTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="allocations">
          <ProjectAllocationsTab projectId={projectId} isActive={activeTab === 'allocations'} />
        </TabsContent>

        <TabsContent value="reports">
          <ProjectReportsTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="surveys">
          <ProjectSurveysTab propertyId={project.propertyId} />
        </TabsContent>
      </ProjectDetailTabs>

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
    </div>
  );
}
