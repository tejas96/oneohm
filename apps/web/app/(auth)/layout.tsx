import React, { type ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth Layout
 * Simple centered layout for authentication pages (no sidebar)
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for layouts
export default function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">OneOhm</h1>
          <p className="text-sm text-muted-foreground mt-1">Solar EPC Platform</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">{children}</div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} OneOhm. All rights reserved.
        </p>
      </div>
    </div>
  );
}
