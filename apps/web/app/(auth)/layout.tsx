'use client';

import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, type ReactNode } from 'react';

import { AnimatedWaveBackground } from '@/components/features/auth/components/animated-wave-background';
import { HeroTextSlider } from '@/components/features/auth/components/hero-text-slider';
import { Spinner } from '@/components/ui/spinner';
import { ZigzagLoader } from '@/components/ui/zigzag-loader';
import { useAuth } from '@/providers/auth-provider';

interface AuthLayoutProps {
  children: ReactNode;
}

// eslint-disable-next-line import/no-default-export -- Next.js requires default export for layouts
export default function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldAllowOtpVerification =
    pathname === '/otp-verify' && Boolean(searchParams.get('phone'));
  const shouldRedirectAuthenticatedUser = isAuthenticated && !shouldAllowOtpVerification;

  useEffect(() => {
    if (isInitialized && shouldRedirectAuthenticatedUser) {
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '/';
      router.replace(redirectTo);
    }
  }, [isInitialized, router, shouldRedirectAuthenticatedUser]);

  if (!isInitialized || shouldRedirectAuthenticatedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <ZigzagLoader
          staticMessage={shouldRedirectAuthenticatedUser ? 'Redirecting…' : undefined}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-gradient-to-br from-white via-primary/[0.05] to-primary/[0.1]">
      <AnimatedWaveBackground />

      {/* Subtle top-left radial glow for depth */}
      <div
        className="absolute top-0 left-0 w-[60%] h-[50%] z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(118,192,68,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Left: Branding + Hero text */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative z-10 p-10 pl-16">
        <Image
          src="/oneohmlogo-sm.png"
          alt="OneOhm"
          width={160}
          height={48}
          className="h-10 w-auto object-contain self-start"
          priority
        />
        <HeroTextSlider />
        <div className="text-[11px] text-foreground-muted">
          © {new Date().getFullYear()} OneOhm Solar. All rights reserved.
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/oneohmlogo-sm.png"
              alt="OneOhm"
              width={140}
              height={42}
              className="h-9 w-auto object-contain mx-auto"
              priority
            />
          </div>

          <Suspense fallback={<Spinner size="md" variant="primary" />}>{children}</Suspense>

          <div className="mt-6 text-center text-[11px] text-foreground-muted lg:hidden">
            <p>© {new Date().getFullYear()} OneOhm Solar. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
