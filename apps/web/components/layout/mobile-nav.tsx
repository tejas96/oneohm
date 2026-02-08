'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { navigationConfig, getPanelConfigByPath, isNavItemActive } from '@/lib/config';
import { cn } from '@/lib/utils';

/**
 * MobileNav - Mobile navigation drawer
 * Shows hamburger menu on mobile, opens sheet with full navigation
 * Uses mounted check to avoid hydration mismatch with Radix UI
 */
export function MobileNav() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { config: panelConfig } = getPanelConfigByPath(pathname);

  // Ensure consistent hydration - only render Sheet after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const closeNav = () => setIsOpen(false);

  // Render placeholder button during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-foreground-secondary" />
      </button>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground-secondary" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[280px] p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border-light">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-baseline">
              <span className="text-lg font-semibold text-foreground">One</span>
              <span className="text-lg font-semibold text-primary">Ohm</span>
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Rail Items as Primary Nav */}
          <div className="p-2 border-b border-border-light">
            <div className="text-2xs font-semibold text-foreground-tertiary uppercase tracking-wide px-3 py-2">
              Navigation
            </div>
            {navigationConfig.railTop.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={closeNav}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                    'transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground-secondary hover:bg-muted'
                  )}
                >
                  {Icon && <Icon className="w-5 h-5" strokeWidth={2} />}
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-2xs font-medium bg-error text-error-foreground rounded-full">
                      {typeof item.badge === 'number' && item.badge > 99
                        ? '99+'
                        : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Current Section Sub-Navigation */}
          <div className="p-2">
            <div className="text-2xs font-semibold text-foreground-tertiary uppercase tracking-wide px-3 py-2">
              {panelConfig.title}
            </div>
            {panelConfig.sections.map((section) => (
              <div key={section.title} className="mb-3">
                <div className="text-2xs font-medium text-foreground-tertiary px-3 py-1">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={closeNav}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                        'transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground-secondary hover:bg-muted'
                      )}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.5 text-2xs font-medium bg-muted text-muted-foreground rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Nav */}
          <div className="p-2 border-t border-border-light mt-auto">
            {navigationConfig.railBottom.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={closeNav}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                    'transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground-secondary hover:bg-muted'
                  )}
                >
                  {Icon && <Icon className="w-5 h-5" strokeWidth={2} />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNav;
