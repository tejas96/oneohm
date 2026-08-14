'use client';

import { FileText, Sunrise, Sun, Moon, Users, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Typography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { useAccessDialog, useCan, type Gate } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

function getGreeting(): { text: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', Icon: Sunrise };
  if (hour < 17) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

/**
 * Each card carries the same gate as the route it points at.
 *
 * They have to: this is the first screen after login, so a card that looks
 * available and then dead-ends on the deny page is the worst possible first
 * impression of the permission system.
 */
const quickLinks: ReadonlyArray<{
  label: string;
  description: string;
  href: string;
  icon: typeof Users;
  permission: Gate;
}> = [
  {
    label: 'Customers',
    description: 'View and manage your customers',
    href: ROUTES.CUSTOMERS.LIST,
    icon: Users,
    permission: 'customers.view',
  },
  {
    label: 'Quotes',
    description: 'Create and track quotes',
    href: ROUTES.QUOTES.DASHBOARD,
    icon: FileText,
    permission: 'quotes.view',
  },
  {
    label: 'Projects',
    description: 'Monitor active projects',
    href: ROUTES.PROJECTS.DASHBOARD,
    icon: Building2,
    permission: 'projects.view',
  },
];

const CARD_CLASS =
  'group flex flex-col items-center rounded-lg border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-sm';

/**
 * One quick-link card, rendered as a link when allowed and as a button when not.
 *
 * A blocked card stays visible on purpose — the same rule the rail follows.
 * Someone who cannot see a feature cannot know to ask for it, so it is shown,
 * marked, and wired to the dialog that names the permission.
 */
function QuickLinkCard({ link }: { link: (typeof quickLinks)[number] }): React.JSX.Element {
  // `useCan` + `requestAccess` rather than `useGatedAction`: when allowed this
  // card is a plain `<Link>` and there is no click handler to run, so the hook's
  // action argument would have to be a no-op — the shape that hides real bugs.
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();
  const allowed = can(link.permission);

  const body = (
    <>
      <link.icon className="mb-3 size-6 text-foreground-secondary transition-colors group-hover:text-primary" />
      <span className="text-sm font-medium text-foreground">{link.label}</span>
      <span className="mt-1 text-xs text-foreground-tertiary">{link.description}</span>
      <ArrowRight className="mt-3 size-4 text-foreground-muted transition-colors group-hover:text-primary" />
    </>
  );

  if (!allowed) {
    return (
      <button
        type="button"
        // `aria-disabled`, never `disabled`: a disabled button swallows the
        // click, and the click is what opens the dialog explaining the block.
        aria-disabled="true"
        aria-label={`${link.label} — access needed`}
        onClick={() => requestAccess(link.permission, link.label)}
        className={`${CARD_CLASS} cursor-not-allowed opacity-60`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href={link.href} className={CARD_CLASS}>
      {body}
    </Link>
  );
}

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
            <QuickLinkCard key={link.href} link={link} />
          ))}
        </div>
      </div>
    </div>
  );
}
