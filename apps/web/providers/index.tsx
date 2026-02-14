'use client';

import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root Providers
 * Wraps the application with all necessary providers
 */
export function Providers({ children }: ProvidersProps) {
  return (
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
  );
}
