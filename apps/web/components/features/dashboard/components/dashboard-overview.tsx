'use client';

import { FileText, Sunrise, Sun, Moon, Users, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Typography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { useAuth } from '@/providers/auth-provider';

function getGreeting(): { text: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', Icon: Sunrise };
  if (hour < 17) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

const quickLinks = [
  {
    label: 'Customers',
    description: 'View and manage your customers',
    href: ROUTES.CUSTOMERS.LIST,
    icon: Users,
  },
  {
    label: 'Quotes',
    description: 'Create and track quotes',
    href: ROUTES.QUOTES.LIST,
    icon: FileText,
  },
  {
    label: 'Projects',
    description: 'Monitor active projects',
    href: ROUTES.PROJECTS.DASHBOARD,
    icon: Building2,
  },
];

export function DashboardOverview(): React.JSX.Element {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const firstName = user?.firstName || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const { text: greeting, Icon: GreetingIcon } = mounted
    ? getGreeting()
    : { text: 'Welcome', Icon: Sun };

  return (
    <div className="flex flex-col items-center justify-center py-16 lg:py-24">
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6 inline-flex size-14 items-center justify-center rounded-full bg-primary/10">
          <GreetingIcon className="size-7 text-primary" />
        </div>

        <Typography variant="h2" className="mb-2">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </Typography>

        <Typography variant="body" color="muted" className="mb-10">
          Your dashboard with analytics and insights is coming soon. In the meantime, jump into
          what&apos;s ready.
        </Typography>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col items-center rounded-lg border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <link.icon className="mb-3 size-6 text-foreground-secondary transition-colors group-hover:text-primary" />
              <span className="text-sm font-medium text-foreground">{link.label}</span>
              <span className="mt-1 text-xs text-foreground-tertiary">{link.description}</span>
              <ArrowRight className="mt-3 size-4 text-foreground-muted transition-colors group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
