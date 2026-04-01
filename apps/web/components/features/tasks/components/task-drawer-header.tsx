'use client';

import { Box } from '@mui/material';

import { MUIBreadcrumb } from '@/components/ui/mui-breadcrumb';
import { MUITypography } from '@/components/ui/mui-typography';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { MUI_FINE_PRINT_FONT_SIZE } from '@/lib/theme/mui-theme';

interface TaskDrawerHeaderProps {
  projectId: string;
  projectNumber: string;
  code: string;
  name: string;
}

export function TaskDrawerHeader({
  projectId,
  projectNumber,
  code,
  name,
}: TaskDrawerHeaderProps): React.JSX.Element {
  const projectHref = buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId });

  return (
    <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
      <MUIBreadcrumb
        items={[
          { label: projectNumber, href: projectHref },
          { label: code },
        ]}
        maxItems={2}
        fontSize={MUI_FINE_PRINT_FONT_SIZE}
        sx={{ mb: 1 }}
      />
      <MUITypography variant="drawerTitle">
        {name || code || 'Untitled'}
      </MUITypography>
    </Box>
  );
}
