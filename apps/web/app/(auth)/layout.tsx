'use client';

import {
  CheckSquare,
  CreditCard,
  FileText,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { Suspense, useEffect, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { getAccessToken } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth Layout
 * Stunning diagonal split design with animated background
 * Left panel: Dark gradient with workflow cards
 * Right panel: Auth forms
 * 
 * Shows loading while checking auth to prevent flash of auth forms for logged-in users.
 * Also checks for existing tokens to handle SSR/hydration race conditions.
 * 
 * Note: Layout files should NOT use useSearchParams directly - use page-level Suspense instead.
 * We use window.location for redirect param since this is client-side only.
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for layouts
export default function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  
  // Check for existing token as a hint that user might be authenticated
  // This handles SSR/hydration race where isInitialized becomes true before auth completes
  const hasExistingToken = typeof window !== 'undefined' && Boolean(getAccessToken());

  // Redirect authenticated users away from auth pages
  // Note: Using window.location.search instead of useSearchParams to avoid Suspense requirement in layouts
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '/';
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isInitialized, router]);

  // Show loading while:
  // 1. Auth not initialized yet
  // 2. User is authenticated (redirect pending)
  // 3. Token exists but auth hasn't confirmed yet (SSR/hydration race fix)
  if (!isInitialized || isAuthenticated || (hasExistingToken && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="md" variant="primary" />
          <p className="text-sm text-foreground-secondary">
            {isAuthenticated ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // User is not authenticated - show auth forms
  return (
    <div className="min-h-screen flex bg-background-secondary">
      {/* Left Panel - Hero (Hidden on mobile) */}
      <div className="hidden lg:flex hero-diagonal items-center justify-start p-10 pl-16 relative">
        {/* Animated Background Elements */}
        <div className="mesh-gradient" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-pattern" />

        {/* Floating Particles */}
        <div className="particles">
          <div className="particle" style={{ left: '10%', animationDelay: '0s' }} />
          <div className="particle" style={{ left: '20%', animationDelay: '2s' }} />
          <div className="particle" style={{ left: '35%', animationDelay: '4s' }} />
          <div className="particle" style={{ left: '50%', animationDelay: '1s' }} />
          <div className="particle" style={{ left: '65%', animationDelay: '3s' }} />
          <div className="particle" style={{ left: '75%', animationDelay: '5s' }} />
        </div>

        {/* Diagonal edge glow */}
        <div className="diagonal-glow" />
        <div className="diagonal-glow-2" />

        {/* Content */}
        <div className="relative z-10 max-w-md w-full">
          {/* Logo & Tagline */}
          <div className="mb-10">
            <div className="mb-6">
              <Image
                src="/oneohmlogo.png"
                alt="OneOhm - Solar EPC Platform"
                width={180}
                height={56}
                className="h-14 w-auto object-contain brightness-0 invert opacity-95"
                priority
              />
            </div>
            <h2 className="text-3xl font-semibold text-white leading-tight mb-3">
              Manage your solar
              <span className="gradient-text"> projects end-to-end</span>
            </h2>
            <p className="text-foreground-tertiary text-sm leading-relaxed">
              From lead capture to project handover — streamline your entire EPC workflow in one
              platform.
            </p>
          </div>

          {/* Workflow Steps Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {/* Step 1 */}
            <div className="glass-card-bright stat-card p-4 col-span-1">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="size-icon-md rounded-full bg-primary/30 flex items-center justify-center text-[10px] text-primary font-semibold">
                  1
                </div>
                <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider">Capture</span>
              </div>
              <p className="text-sm font-medium text-white">Leads & Sites</p>
              <p className="text-[10px] text-foreground-muted mt-1">Customer onboarding</p>
            </div>

            {/* Step 2 */}
            <div className="glass-card-bright stat-card p-4 col-span-1">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="size-icon-md rounded-full bg-secondary/30 flex items-center justify-center text-[10px] text-secondary font-semibold">
                  2
                </div>
                <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider">Quote</span>
              </div>
              <p className="text-sm font-medium text-white">Design & BOM</p>
              <p className="text-[10px] text-foreground-muted mt-1">System sizing</p>
            </div>

            {/* Step 3 */}
            <div className="glass-card-bright stat-card p-4 col-span-1">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="size-icon-md rounded-full bg-warning/30 flex items-center justify-center text-[10px] text-warning font-semibold">
                  3
                </div>
                <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider">Execute</span>
              </div>
              <p className="text-sm font-medium text-white">Installation</p>
              <p className="text-[10px] text-foreground-muted mt-1">Track progress</p>
            </div>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            <span className="px-3 py-1.5 glass-card text-[11px] text-foreground-tertiary flex items-center gap-1.5">
              <Users className="size-icon-xs text-primary" />
              CRM
            </span>
            <span className="px-3 py-1.5 glass-card text-[11px] text-foreground-tertiary flex items-center gap-1.5">
              <FileText className="size-icon-xs text-secondary" />
              Quotations
            </span>
            <span className="px-3 py-1.5 glass-card text-[11px] text-foreground-tertiary flex items-center gap-1.5">
              <CheckSquare className="size-icon-xs text-warning" />
              Projects
            </span>
            <span className="px-3 py-1.5 glass-card text-[11px] text-foreground-tertiary flex items-center gap-1.5">
              <CreditCard className="size-icon-xs text-info" />
              Loans
            </span>
          </div>

          {/* Trust Section */}
          <div className="glass-card p-4 animated-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-container-md rounded-lg bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <ShieldCheck className="size-icon-md text-primary" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Built for Solar EPC</p>
                  <p className="text-foreground-tertiary text-[11px]">Rooftop & ground-mount projects</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-primary text-lg font-semibold">150+</p>
                <p className="text-foreground-muted text-[10px]">MW managed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 lg:login-panel flex items-center justify-center p-4 lg:p-8 lg:pr-12">
        <div className="w-full max-w-md">
          {/* Logo for Mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="size-container-md rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center">
                <Zap className="size-icon-lg text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-semibold text-foreground">OneOhm</h1>
                <p className="text-foreground-tertiary text-[10px]">Solar EPC Platform</p>
              </div>
            </div>
          </div>

          {/* Auth Content - Wrapped in Suspense for useSearchParams in auth forms */}
          <Suspense fallback={<Spinner size="md" variant="primary" />}>
            {children}
          </Suspense>

          {/* Footer */}
          <div className="mt-6 text-center text-[11px] text-foreground-tertiary">
            <p>© {new Date().getFullYear()} OneOhm Solar. All rights reserved.</p>
            <div className="mt-2 space-x-3">
              <a href="#" className="hover:text-primary transition-colors">
                Privacy
              </a>
              <span className="text-border-medium">•</span>
              <a href="#" className="hover:text-primary transition-colors">
                Terms
              </a>
              <span className="text-border-medium">•</span>
              <a href="#" className="hover:text-primary transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations and effects */}
      <style jsx>{`
        /* Dark gradient background */
        .hero-diagonal {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          position: relative;
          overflow: hidden;
          clip-path: polygon(0 0, 100% 0, 75% 100%, 0 100%);
          width: 62%;
          padding-right: 120px;
        }

        /* Right panel adjustment for diagonal */
        .login-panel {
          margin-left: -12%;
          position: relative;
          z-index: 10;
        }

        /* Animated mesh gradient overlay */
        .mesh-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 50% at 20% 40%, rgba(118, 192, 68, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 80% 20%, rgba(13, 116, 184, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 60% 80%, rgba(118, 192, 68, 0.08) 0%, transparent 50%);
          animation: meshMove 15s ease-in-out infinite alternate;
        }

        @keyframes meshMove {
          0% {
            transform: scale(1) translateY(0);
          }
          100% {
            transform: scale(1.1) translateY(-20px);
          }
        }

        /* Floating orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: float 8s ease-in-out infinite;
        }

        .orb-1 {
          width: 300px;
          height: 300px;
          background: rgba(118, 192, 68, 0.2);
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 200px;
          height: 200px;
          background: rgba(13, 116, 184, 0.15);
          top: 60%;
          right: 10%;
          animation-delay: -3s;
        }

        .orb-3 {
          width: 150px;
          height: 150px;
          background: rgba(118, 192, 68, 0.12);
          bottom: 20%;
          left: 30%;
          animation-delay: -5s;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-30px) scale(1.05);
          }
        }

        /* Grid pattern overlay */
        .grid-pattern {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at center, black 40%, transparent 100%);
        }

        /* Animated particles */
        .particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(118, 192, 68, 0.6);
          border-radius: 50%;
          animation: rise 10s linear infinite;
        }

        @keyframes rise {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) scale(1);
            opacity: 0;
          }
        }

        /* Glassmorphic cards */
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
        }

        .glass-card-bright {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
        }

        /* Stat card hover effect */
        .stat-card {
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.1);
        }

        /* Gradient text */
        .gradient-text {
          background: linear-gradient(135deg, #76c044 0%, #8fd35f 50%, #76c044 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Animated border */
        .animated-border {
          position: relative;
        }

        .animated-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 16px;
          background: linear-gradient(90deg, #76c044, #0d74b8, #76c044);
          background-size: 200% 100%;
          animation: borderGlow 3s linear infinite;
          z-index: -1;
          opacity: 0.5;
        }

        @keyframes borderGlow {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        /* Diagonal edge glow effect */
        .diagonal-glow {
          position: absolute;
          right: 18%;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(118, 192, 68, 0.5) 20%,
            rgba(118, 192, 68, 0.7) 50%,
            rgba(13, 116, 184, 0.5) 80%,
            transparent 100%
          );
          transform: skewX(-12deg);
          filter: blur(3px);
        }

        .diagonal-glow-2 {
          position: absolute;
          right: 19%;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255, 255, 255, 0.15) 30%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0.15) 70%,
            transparent 100%
          );
          transform: skewX(-12deg);
        }
      `}</style>
    </div>
  );
}
