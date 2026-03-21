'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Box,
  FormControlLabel,
  Switch as MuiSwitch,
  Tooltip,
  Typography,
  type SwitchProps as MuiSwitchProps,
  type SxProps,
  type Theme,
} from '@mui/material';
import * as React from 'react';

export interface MUISwitchProps
  extends Omit<MuiSwitchProps, 'onChange' | 'checked'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  tooltip?: React.ReactNode;
  labelPosition?: 'left' | 'right';
  containerSx?: SxProps<Theme>;
}

function MUISwitchInner(
  {
    checked,
    onCheckedChange,
    label,
    description,
    tooltip,
    labelPosition = 'right',
    disabled,
    containerSx,
    ...switchProps
  }: MUISwitchProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
): React.JSX.Element {
  const handleChange = React.useCallback(
    (_: React.ChangeEvent<HTMLInputElement>, value: boolean) => {
      onCheckedChange?.(value);
    },
    [onCheckedChange],
  );

  const switchElement = (
    <MuiSwitch
      ref={ref}
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      {...switchProps}
    />
  );

  if (!label && !description) {
    return switchElement;
  }

  const hasDescription = Boolean(description);

  const labelContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {label && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            fontWeight={500}
            color={disabled ? 'text.disabled' : 'text.primary'}
            sx={{ lineHeight: 1.4 }}
          >
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} arrow placement="top">
              <InfoOutlinedIcon
                sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }}
              />
            </Tooltip>
          )}
        </Box>
      )}
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {description}
        </Typography>
      )}
    </Box>
  );

  return (
    <FormControlLabel
      control={switchElement}
      label={labelContent}
      labelPlacement={labelPosition === 'left' ? 'start' : 'end'}
      disabled={disabled}
      sx={{
        mx: 0,
        gap: 1,
        alignItems: hasDescription ? 'flex-start' : 'center',
        ...(hasDescription
          ? { '& .MuiFormControlLabel-label': { pt: 0.25 } }
          : {}),
        ...(labelPosition === 'left'
          ? { justifyContent: 'space-between', width: '100%' }
          : {}),
        ...(containerSx ? (containerSx as Record<string, unknown>) : {}),
      }}
    />
  );
}

export const MUISwitch = React.forwardRef<HTMLButtonElement, MUISwitchProps>(MUISwitchInner);
MUISwitch.displayName = 'MUISwitch';
