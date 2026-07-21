'use client';

import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { type ReactNode } from 'react';

import { AuthProvider } from './auth-provider';
import { ConfigProvider } from './config-provider';
import { QueryProvider } from './query-provider';

import { ErrorBoundary } from '@/components/shared/feedback/error-boundary';
import { Toaster, TooltipProvider } from '@/components/ui';
import { muiTheme } from '@/lib/theme/mui-theme';

interface ProvidersProps {
  children: ReactNode;
  mapsApiKey?: string;
}

/**
 * Root Providers
 * Wraps the application with all necessary providers
 */
export function Providers({ children, mapsApiKey }: ProvidersProps): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TooltipProvider delayDuration={200}>
              <QueryProvider>
                <ConfigProvider value={{ mapsApiKey }}>
                  <AuthProvider>
                    {children}
                    {/* Position, styling and duration live in the component. */}
                    <Toaster />
                  </AuthProvider>
                </ConfigProvider>
              </QueryProvider>
            </TooltipProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </ErrorBoundary>
  );
}
