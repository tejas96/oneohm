'use client';

import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';

import { ErrorBoundary } from '@/components/shared/feedback/error-boundary';
import { TooltipProvider } from '@/components/ui';
import { muiTheme } from '@/lib/theme/mui-theme';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root Providers
 * Wraps the application with all necessary providers
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TooltipProvider delayDuration={200}>
              <QueryProvider>
                <AuthProvider>
                  {children}
                  <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    toastOptions={{
                      duration: 4000,
                      style: {
                        fontFamily: 'Inter, system-ui, sans-serif',
                      },
                    }}
                  />
                </AuthProvider>
              </QueryProvider>
            </TooltipProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </ErrorBoundary>
  );
}
