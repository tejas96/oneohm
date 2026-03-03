'use client';

import React, { useCallback } from 'react';

import { QUOTE_DETAIL_TABS, type QuoteDetailTab } from '../../constants';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QuoteDetailTabsProps {
  activeTab: QuoteDetailTab;
  onTabChange: (tab: QuoteDetailTab) => void;
  children: React.ReactNode;
}

export const QuoteDetailTabs = React.memo(
  ({ activeTab, onTabChange, children }: QuoteDetailTabsProps): React.JSX.Element => {
    const handleValueChange = useCallback(
      (value: string) => {
        onTabChange(value as QuoteDetailTab);
      },
      [onTabChange],
    );

    return (
      <Tabs value={activeTab} onValueChange={handleValueChange}>
        <TabsList
          variant="underline"
          className="overflow-x-auto overflow-y-hidden"
          aria-label="Quote detail tabs"
        >
          {QUOTE_DETAIL_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} variant="underline">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {children}
      </Tabs>
    );
  },
);

QuoteDetailTabs.displayName = 'QuoteDetailTabs';
