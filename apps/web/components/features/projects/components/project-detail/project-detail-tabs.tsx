'use client';

import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import { Box, Tab, Tabs } from '@mui/material';
import React, { useCallback } from 'react';

import { PROJECT_DETAIL_TABS, type ProjectDetailTab } from '../../constants';

import { useAccessDialog, useCan } from '@/lib/rbac';

export interface TabCount {
  count: number;
  /** `warning` paints the numeral amber — for work that is waiting on someone. */
  tone?: 'neutral' | 'warning';
}

interface ProjectDetailTabsProps {
  activeTab: ProjectDetailTab;
  onTabChange: (tab: ProjectDetailTab) => void;
  /**
   * Counts shown as a trailing numeral on the tab. Only pass values the page
   * already holds — a badge is not worth an extra request.
   */
  counts?: Partial<Record<ProjectDetailTab, TabCount>>;
}

const TAB_ICONS: Record<ProjectDetailTab, React.ReactElement> = {
  overview: <DashboardOutlinedIcon />,
  tasks: <PlaylistAddCheckOutlinedIcon />,
  documents: <FolderOpenOutlinedIcon />,
  finance: <PaymentsOutlinedIcon />,
  bom: <LayersOutlinedIcon />,
  allocations: <AssignmentTurnedInOutlinedIcon />,
  reports: <AssessmentOutlinedIcon />,
  surveys: <MapOutlinedIcon />,
  service: <BuildOutlinedIcon />,
};

/**
 * The section switcher.
 *
 * The same pill segmented control the customer detail page uses, so the two
 * most-visited detail pages navigate identically. It holds the sticky slot:
 * the header is read once and scrolls away; the tabs are what you reach for
 * repeatedly.
 */
export const ProjectDetailTabs = React.memo(
  ({ activeTab, onTabChange, counts }: ProjectDetailTabsProps): React.JSX.Element => {
    const { can } = useCan();
    const { requestAccess } = useAccessDialog();

    // Guarded on the container, not with `<Tab disabled>`: MUI swallows clicks
    // on a disabled tab, so the access dialog would never open. This also
    // covers arrow-key navigation between tabs.
    const handleChange = useCallback(
      (_event: React.SyntheticEvent, newValue: string) => {
        const tab = PROJECT_DETAIL_TABS.find((t) => t.value === newValue);
        if (tab && !can(tab.permission)) {
          requestAccess(tab.permission, tab.label);
          return;
        }
        onTabChange(newValue as ProjectDetailTab);
      },
      [onTabChange, can, requestAccess],
    );

    return (
      <Box
        sx={{
          position: 'sticky',
          top: 'var(--header-height, 48px)',
          zIndex: 10,
          py: 1,
          // Bleed to the content edge so the sticky strip covers the full width
          // as the page scrolls under it. Mirrors `MainContent`'s padding.
          mx: { xs: -2, lg: -2.5 },
          px: { xs: 2, lg: 2.5 },
          bgcolor: 'var(--ds-canvas)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Project sections"
          sx={{
            minHeight: 'auto',
            bgcolor: 'var(--ds-surface)',
            boxShadow: 'var(--shadow-e2)',
            borderRadius: 'var(--radius-pill)',
            p: '4px',
            '& .MuiTabs-flexContainer': { gap: '4px' },
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTabs-scrollButtons': {
              width: 30,
              height: 30,
              borderRadius: '50%',
              alignSelf: 'center',
              color: 'var(--ds-text-secondary)',
              '&.Mui-disabled': { opacity: 0.25 },
            },
          }}
        >
          {PROJECT_DETAIL_TABS.map((tab) => {
            const badge = counts?.[tab.value];
            const allowed = can(tab.permission);
            return (
              <Tab
                key={tab.value}
                value={tab.value}
                id={`tab-${tab.value}`}
                icon={TAB_ICONS[tab.value]}
                iconPosition="start"
                label={
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                  >
                    {tab.label}
                    {badge && badge.count > 0 ? (
                      <Box
                        component="span"
                        data-tab-count
                        sx={{
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          lineHeight: 1,
                          px: 0.625,
                          py: '3px',
                          borderRadius: 'var(--radius-pill)',
                          bgcolor:
                            badge.tone === 'warning'
                              ? 'var(--ds-warning-bg)'
                              : 'var(--ds-canvas-sunken)',
                          color:
                            badge.tone === 'warning'
                              ? 'var(--ds-warning)'
                              : 'var(--ds-text-secondary)',
                        }}
                      >
                        {badge.count}
                      </Box>
                    ) : null}
                  </Box>
                }
                // `aria-disabled`, not `disabled`: a disabled MUI Tab swallows the
                // click, and the click is what opens the access dialog. This only
                // announces the state; the guard is the onChange handler above.
                aria-disabled={!allowed}
                sx={{
                  opacity: allowed ? 1 : 0.4,
                  minHeight: 34,
                  height: 34,
                  minWidth: 'auto',
                  px: 1.25,
                  gap: '6px',
                  borderRadius: 'var(--radius-pill)',
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--ds-text-secondary)',
                  transition: 'all 150ms var(--ease-standard)',
                  '& .MuiTab-iconWrapper': { margin: 0, fontSize: '1.0625rem' },
                  '&:hover': {
                    bgcolor: 'var(--ds-canvas-sunken)',
                    color: 'var(--ds-text-primary)',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'var(--ds-primary-dark)',
                    color: 'var(--ds-primary-contrast)',
                    fontWeight: 600,
                    /* The count badge has to invert too, or it disappears into the fill. */
                    '& [data-tab-count]': {
                      bgcolor: 'rgba(255,255,255,0.22)',
                      color: 'var(--ds-primary-contrast)',
                    },
                  },
                }}
              />
            );
          })}
        </Tabs>
      </Box>
    );
  },
);

ProjectDetailTabs.displayName = 'ProjectDetailTabs';
