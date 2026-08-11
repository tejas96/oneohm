'use client';

import { Box, Typography } from '@mui/material';

import { MUIBreadcrumb } from '@/components/ui/mui-breadcrumb';
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
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        px: 3,
        pt: 2.5,
        pb: 2,
        bgcolor: 'var(--ds-surface)',
        // Separation by luminance and a near-invisible hairline, not a border.
        boxShadow: 'inset 0 -1px 0 var(--ds-canvas-sunken)',
      }}
    >
      {/* Ambient brand bloom — atmosphere only */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: -180,
          right: -80,
          width: 340,
          height: 340,
          pointerEvents: 'none',
          background: 'var(--gradient-glow)',
          opacity: 0.55,
        }}
      />

      <Box sx={{ position: 'relative' }}>
        <MUIBreadcrumb
          items={[{ label: projectNumber, href: projectHref }, { label: code }]}
          maxItems={2}
          fontSize={MUI_FINE_PRINT_FONT_SIZE}
          sx={{ mb: 0.75 }}
        />
        <Typography
          component="h2"
          sx={{
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            color: 'var(--ds-text-primary)',
          }}
        >
          {name || code || 'Untitled'}
        </Typography>
      </Box>
    </Box>
  );
}
