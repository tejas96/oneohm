'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Tooltip, Typography } from '@mui/material';
import * as React from 'react';

import { MUI_LABEL_FONT_SIZE, MUI_LABEL_GAP, MUI_LABEL_MB } from '@/lib/theme/mui-theme';

/* -------------------------------------------------------------------------- */
/*  Shared label for all MUI form components                                   */
/* -------------------------------------------------------------------------- */

export interface MUIFieldLabelProps {
  fieldLabel?: React.ReactNode;
  required?: boolean;
  tooltip?: React.ReactNode;
  htmlFor?: string;
}

export function MUIFieldLabel({
  fieldLabel,
  required,
  tooltip,
  htmlFor,
}: MUIFieldLabelProps): React.JSX.Element | null {
  if (!fieldLabel) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: MUI_LABEL_GAP,
        mb: MUI_LABEL_MB,
        minHeight: 20,
      }}
    >
      <Typography
        component="label"
        htmlFor={htmlFor}
        sx={{
          fontSize: MUI_LABEL_FONT_SIZE,
          fontWeight: 500,
          lineHeight: 1,
          color: 'text.primary',
          cursor: htmlFor ? 'pointer' : 'default',
        }}
      >
        {fieldLabel}
        {required && (
          <Typography
            component="span"
            color="error"
            sx={{ ml: '2px', fontSize: 'inherit', lineHeight: 'inherit' }}
          >
            *
          </Typography>
        )}
      </Typography>
      {tooltip && (
        <Tooltip title={tooltip} arrow placement="top">
          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
        </Tooltip>
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  Ref utilities                                                              */
/* -------------------------------------------------------------------------- */

export function setRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  (ref as React.MutableRefObject<T | null>).current = value;
}

export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (value) => refs.forEach((r) => setRef(r, value));
}
