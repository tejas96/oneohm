'use client';

import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TopicOutlinedIcon from '@mui/icons-material/TopicOutlined';
import { Box, Tab, Tabs } from '@mui/material';
import type { JSX, ReactElement, SyntheticEvent } from 'react';

import { CUSTOMER_DETAIL_TABS, type CustomerDetailTab } from '../constants';
import { stickyTabRailSx } from './styles';

import { useAccessDialog, useCan } from '@/lib/rbac';

const TAB_ICONS: Record<CustomerDetailTab, ReactElement> = {
  overview: <DashboardOutlinedIcon />,
  properties: <HomeWorkOutlinedIcon />,
  quotes: <DescriptionOutlinedIcon />,
  projects: <FolderOpenOutlinedIcon />,
  documents: <TopicOutlinedIcon />,
  followups: <EventNoteOutlinedIcon />,
  finance: <PaymentsOutlinedIcon />,
  service: <BuildOutlinedIcon />,
  activity: <HistoryOutlinedIcon />,
};

interface CustomerTabRailProps {
  activeTab: CustomerDetailTab;
  onTabChange: (event: SyntheticEvent, tab: string) => void;
  onPrefetch: (tab: CustomerDetailTab) => void;
  /**
   * Counts shown as a trailing numeral on the tab. Only pass values the page
   * already holds — a badge is not worth an extra request, and a tab that
   * flickers a count in after load is worse than one that never showed it.
   */
  counts?: Partial<Record<CustomerDetailTab, number>>;
}

/**
 * The section switcher.
 *
 * Was a full-width bordered strip with MUI's default underline indicator,
 * wrapping a `Paper` that boxed the entire tab body. It is now the same pill
 * segmented control the project detail page uses, floating on the canvas — so
 * the two most-visited detail pages in the app navigate identically — and it
 * holds the sticky slot the page header used to occupy.
 */
export function CustomerTabRail({
  activeTab,
  onTabChange,
  onPrefetch,
  counts,
}: CustomerTabRailProps): JSX.Element {
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();

  // Intercepted here rather than with `<Tab disabled>`: MUI swallows clicks on
  // a disabled tab, so the access dialog would never open. Guarding the
  // container also covers keyboard navigation between tabs.
  const handleChange = (event: SyntheticEvent, value: string): void => {
    const tab = CUSTOMER_DETAIL_TABS.find((t) => t.value === value);
    if (tab && !can(tab.permission)) {
      requestAccess(tab.permission, tab.label);
      return;
    }
    onTabChange(event, value);
  };

  return (
    <Box sx={stickyTabRailSx}>
      <Tabs
        value={activeTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Customer sections"
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
        {CUSTOMER_DETAIL_TABS.map((tab) => {
          const count = counts?.[tab.value];
          return (
            <Tab
              key={tab.value}
              value={tab.value}
              id={`tab-${tab.value}`}
              icon={TAB_ICONS[tab.value]}
              iconPosition="start"
              onMouseEnter={() => onPrefetch(tab.value)}
              label={
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
                >
                  {tab.label}
                  {count !== undefined && count > 0 && (
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
                        bgcolor: 'var(--ds-canvas-sunken)',
                        color: 'var(--ds-text-secondary)',
                      }}
                    >
                      {count}
                    </Box>
                  )}
                </Box>
              }
              sx={{
                opacity: can(tab.permission) ? 1 : 0.4,
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
                '&:hover': { bgcolor: 'var(--ds-canvas-sunken)', color: 'var(--ds-text-primary)' },
                '&.Mui-selected': {
                  bgcolor: 'var(--ds-primary)',
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
}
