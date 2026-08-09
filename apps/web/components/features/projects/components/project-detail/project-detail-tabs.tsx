'use client';

import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import { Badge, Tab, Tabs } from '@mui/material';
import React, { useCallback } from 'react';

import { PROJECT_DETAIL_TABS, type ProjectDetailTab } from '../../constants';

interface ProjectDetailTabsProps {
  activeTab: ProjectDetailTab;
  onTabChange: (tab: ProjectDetailTab) => void;
  reportsPendingCount?: number;
}

const TAB_ICONS: Record<ProjectDetailTab, React.ReactElement> = {
  overview: <DashboardOutlinedIcon />,
  summary: <DescriptionOutlinedIcon />,
  tasks: <PlaylistAddCheckOutlinedIcon />,
  documents: <FolderOpenOutlinedIcon />,
  finance: <PaymentsOutlinedIcon />,
  bom: <LayersOutlinedIcon />,
  allocations: <AssignmentTurnedInOutlinedIcon />,
  reports: <AssessmentOutlinedIcon />,
  surveys: <MapOutlinedIcon />,
  service: <BuildOutlinedIcon />,
};

export const ProjectDetailTabs = React.memo(
  ({ activeTab, onTabChange, reportsPendingCount }: ProjectDetailTabsProps): React.JSX.Element => {
    const handleChange = useCallback(
      (_event: React.SyntheticEvent, newValue: string) => {
        onTabChange(newValue as ProjectDetailTab);
      },
      [onTabChange],
    );

    return (
      <Tabs
        value={activeTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 'auto',
          bgcolor: 'background.paper',
          boxShadow: '0 2px 4px 0 rgba(16, 24, 40, 0.02), 0 4px 12px 0 rgba(16, 24, 40, 0.04)',
          borderRadius: '9999px',
          padding: '4px',
          mt: 1.5,
          mb: 2.5,
          '& .MuiTabs-flexContainer': {
            gap: '6px',
          },
          '& .MuiTabs-indicator': {
            display: 'none',
          },
          '& .MuiTabs-scrollButtons': {
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: '#ffffff',
            margin: '0 4px',
            alignSelf: 'center',
            '&.Mui-disabled': {
              opacity: 0.3,
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
            '&:hover:not(.Mui-disabled)': {
              bgcolor: 'primary.dark',
            },
            transition: 'all 0.15s ease-in-out',
          },
        }}
      >
        {PROJECT_DETAIL_TABS.map((tab) => {
          let icon = TAB_ICONS[tab.value];
          if (tab.value === 'reports' && reportsPendingCount && reportsPendingCount > 0) {
            icon = (
              <Badge
                badgeContent={reportsPendingCount}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.625rem',
                    height: 16,
                    minWidth: 16,
                    padding: '0 4px',
                  },
                }}
              >
                {icon}
              </Badge>
            );
          }
          return (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={icon}
              iconPosition="start"
              sx={{
                minHeight: 34,
                height: 34,
                borderRadius: '9999px',
                textTransform: 'none',
                fontSize: '0.8125rem',
                fontWeight: 500,
                padding: '6px 16px',
                color: 'primary.light',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '6px',
                minWidth: 'auto',
                transition: 'all 0.15s ease-in-out',
                '& .MuiTab-iconWrapper': {
                  color: 'primary.light',
                  margin: 0,
                  fontSize: '1.1rem',
                  transition: 'color 0.15s ease-in-out',
                },
                '&:hover': {
                  bgcolor: 'rgba(118, 192, 68, 0.04)', // subtle primary hover background
                  color: 'primary.main',
                  '& .MuiTab-iconWrapper': {
                    color: 'primary.main',
                  },
                },
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: '#ffffff',
                  fontWeight: 600,
                  '& .MuiTab-iconWrapper': {
                    color: '#ffffff',
                  },
                },
              }}
            />
          );
        })}
      </Tabs>
    );
  },
);

ProjectDetailTabs.displayName = 'ProjectDetailTabs';
