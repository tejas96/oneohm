'use client';

import React, { useCallback } from 'react';

import { PROJECT_DETAIL_TABS, type ProjectDetailTab } from '../../constants';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface ProjectDetailTabsProps {
  activeTab: ProjectDetailTab;
  onTabChange: (tab: ProjectDetailTab) => void;
  children: React.ReactNode;
}

export const ProjectDetailTabs = React.memo(({
  activeTab,
  onTabChange,
  children,
}: ProjectDetailTabsProps): React.JSX.Element => {
  const handleValueChange = useCallback(
    (value: string) => {
      onTabChange(value as ProjectDetailTab);
    },
    [onTabChange],
  );

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange}>
      <TabsList
        variant="underline"
        className="overflow-x-auto overflow-y-hidden"
        aria-label="Project detail tabs"
      >
        {PROJECT_DETAIL_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} variant="underline">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
});
