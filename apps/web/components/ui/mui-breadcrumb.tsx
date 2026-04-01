'use client';

import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Breadcrumbs, Link, type BreadcrumbsProps } from '@mui/material';
import * as React from 'react';

import { MUITypography } from '@/components/ui/mui-typography';
import { MUI_FONT_SIZE } from '@/lib/theme/mui-theme';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type MUIBreadcrumbItem = {
  /** Label text to display */
  label: string;
  /** Optional href - if provided, renders as a link; otherwise renders as text */
  href?: string;
  /** Optional onClick handler */
  onClick?: () => void;
};

export interface MUIBreadcrumbProps extends Omit<BreadcrumbsProps, 'children'> {
  /** Array of breadcrumb items */
  items: MUIBreadcrumbItem[];
  /** Custom separator (defaults to NavigateNextIcon) */
  separator?: React.ReactNode;
  /** Maximum items to display before collapsing (defaults to 8) */
  maxItems?: number;
  /** Font size (defaults to theme's MUI_FONT_SIZE) */
  fontSize?: string | number;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const MUIBreadcrumbInner = (
  {
    items,
    separator = <NavigateNextIcon fontSize="small" />,
    maxItems = 8,
    fontSize = MUI_FONT_SIZE,
    sx,
    ...breadcrumbsProps
  }: MUIBreadcrumbProps,
  ref: React.ForwardedRef<HTMLElement>,
): React.JSX.Element => {
  return (
    <Breadcrumbs
      ref={ref}
      separator={separator}
      maxItems={maxItems}
      sx={{
        fontSize,
        '& .MuiBreadcrumbs-separator': {
          color: 'text.secondary',
          marginX: 0.5,
        },
        ...sx,
      }}
      {...breadcrumbsProps}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast) {
          return (
            <MUITypography
              key={index}
              variant="inherit"
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                fontFamily: item.href ? 'monospace' : 'inherit',
              }}
            >
              {item.label}
            </MUITypography>
          );
        }

        if (item.href || item.onClick) {
          return (
            <Link
              key={index}
              href={item.href}
              onClick={item.onClick}
              underline="hover"
              color="text.secondary"
              sx={{
                cursor: 'pointer',
                fontFamily: item.href ? 'monospace' : 'inherit',
                '&:hover': { color: 'text.primary' },
              }}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <MUITypography
            key={index}
            variant="inherit"
            sx={{
              color: 'text.secondary',
              fontFamily: 'monospace',
            }}
          >
            {item.label}
          </MUITypography>
        );
      })}
    </Breadcrumbs>
  );
};

export const MUIBreadcrumb = React.forwardRef<HTMLElement, MUIBreadcrumbProps>(MUIBreadcrumbInner);
MUIBreadcrumb.displayName = 'MUIBreadcrumb';
