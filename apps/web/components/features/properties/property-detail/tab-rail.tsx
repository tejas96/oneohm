'use client';

import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TopicOutlinedIcon from '@mui/icons-material/TopicOutlined';
import { Box, Tab, Tabs } from '@mui/material';
import type { JSX, ReactElement, SyntheticEvent } from 'react';

import { PROPERTY_DETAIL_TABS, type PropertyDetailTab } from '../constants';

import { stickyTabRailSx } from '@/components/features/customers/customer-detail/styles';
import { useAccessDialog, useCan } from '@/lib/rbac';

const TAB_ICONS: Record<PropertyDetailTab, ReactElement> = {
  overview: <DashboardOutlinedIcon />,
  quotes: <DescriptionOutlinedIcon />,
  documents: <TopicOutlinedIcon />,
  finance: <PaymentsOutlinedIcon />,
  project: <FolderOpenOutlinedIcon />,
  followups: <EventNoteOutlinedIcon />,
  service: <BuildOutlinedIcon />,
  activity: <HistoryOutlinedIcon />,
};

interface PropertyTabRailProps {
  activeTab: PropertyDetailTab;
  onTabChange: (event: SyntheticEvent, tab: string) => void;
  onPrefetch: (tab: PropertyDetailTab) => void;
  /**
   * Counts shown as a trailing numeral. Only pass values the page already
   * holds — a badge is not worth an extra request, and one that flickers in
   * after load is worse than one that never appeared.
   */
  counts?: Partial<Record<PropertyDetailTab, number>>;
}

/**
 * The section switcher — the same pill segmented control the customer and
 * project detail pages use, so the three most-visited detail pages in the app
 * navigate identically.
 *
 * It also holds the sticky slot the page header used to occupy: the header was
 * ~150px of every screen pinned to information you read once, whereas the tabs
 * are what you reach for repeatedly.
 */
export function PropertyTabRail({
  activeTab,
  onTabChange,
  onPrefetch,
  counts,
}: PropertyTabRailProps): JSX.Element {
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();

  // Intercepted here rather than with `<Tab disabled>`: MUI swallows clicks on
  // a disabled tab, so the access dialog would never open. Guarding the
  // container also covers keyboard navigation between tabs.
  const handleChange = (event: SyntheticEvent, value: string): void => {
    const tab = PROPERTY_DETAIL_TABS.find((t) => t.value === value);
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
        aria-label="Site sections"
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
        {PROPERTY_DETAIL_TABS.map((tab) => {
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
