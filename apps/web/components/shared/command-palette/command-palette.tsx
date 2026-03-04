'use client';

import { Clock, FileText, Folder, Loader2, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { useCommandPaletteCommands } from './use-command-palette-commands';
import { useEntitySearch } from './use-entity-search';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getRecentViews, recordRecentView, type RecentViewType } from '@/lib/utils/recent-views';
import { useAuth } from '@/providers/auth-provider';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ENTITY_TYPE_ICON: Record<RecentViewType, typeof Users> = {
  customer: Users,
  quote: FileText,
  project: Folder,
};

const ENTITY_ICON_STYLES: Record<RecentViewType, string> = {
  customer: 'bg-blue-50 text-blue-600',
  quote: 'bg-violet-50 text-violet-600',
  project: 'bg-emerald-50 text-emerald-600',
};

function ActionIcon({ icon: Icon }: { icon: typeof Users }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="size-4 text-primary" />
    </span>
  );
}

function EntityIcon({ icon: Icon, type }: { icon: typeof Users; type: RecentViewType }) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${ENTITY_ICON_STYLES[type]}`}
    >
      <Icon className="size-4" />
    </span>
  );
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { user } = useAuth();
  const { navItems, actionItems } = useCommandPaletteCommands();
  const { customers, quotes, projects, isLoading, isError, errorMessage } = useEntitySearch(
    query,
    open,
  );

  const recentViews = useMemo(
    () => (open && user?.id ? getRecentViews(user.id) : []),
    [open, user?.id],
  );
  const hasSearch = query.length >= 2;
  const hasResults = customers.length > 0 || quotes.length > 0 || projects.length > 0;

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery('');
      router.push(href);
    },
    [onOpenChange, router],
  );

  const handleEntitySelect = useCallback(
    (type: RecentViewType, id: string, label: string) => {
      const routeMap = {
        customer: ROUTES.CUSTOMERS.DETAIL,
        quote: ROUTES.QUOTES.DETAIL,
        project: ROUTES.PROJECTS.DETAIL,
      } as const;

      const href = buildRoute(routeMap[type], { id });

      if (user?.id) {
        recordRecentView(user.id, { type, id, label, href });
      }

      handleSelect(href);
    },
    [user?.id, handleSelect],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) setQuery('');
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Search commands, customers, quotes..."
        value={query}
        onValueChange={setQuery}
        trailing={
          <kbd className="shrink-0 rounded border border-border-light bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            ESC
          </kbd>
        }
      />
      <CommandList>
        {/* Loading / error / empty states for entity search */}
        {hasSearch && isLoading && (
          <CommandEmpty>
            <span className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </span>
          </CommandEmpty>
        )}
        {hasSearch && isError && !isLoading && (
          <CommandEmpty className="text-muted-foreground">
            {errorMessage ?? 'Search failed. Please try again.'}
          </CommandEmpty>
        )}
        {hasSearch && !isLoading && !isError && !hasResults && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Search className="size-5" />
              <span>No results found</span>
            </div>
          </CommandEmpty>
        )}

        {/* Recent views */}
        {recentViews.length > 0 && (
          <CommandGroup heading="Recent">
            {recentViews.map((item) => {
              const Icon = ENTITY_TYPE_ICON[item.type] ?? Clock;
              return (
                <CommandItem
                  key={`recent-${item.type}-${item.id}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Icon className="text-muted-foreground" />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Navigation group */}
        {navItems.length > 0 && (
          <CommandGroup heading="Navigation" className="border-t border-border-light">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={`nav-${item.id}`} onSelect={() => handleSelect(item.href)}>
                  {Icon && <Icon className="text-muted-foreground" />}
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Quick actions group */}
        {actionItems.length > 0 && (
          <CommandGroup heading="Actions" className="border-t border-border-light">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={`action-${item.id}`} onSelect={() => handleSelect(item.href)}>
                  {Icon && <ActionIcon icon={Icon} />}
                  <span className="truncate font-medium">{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Entity search results */}
        {hasSearch && !isLoading && customers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customers.map((c) => {
                const label = [c.firstName, c.lastName].filter(Boolean).join(' ');
                return (
                  <CommandItem
                    key={`customer-${c.id}`}
                    onSelect={() => handleEntitySelect('customer', c.id, label)}
                  >
                    <EntityIcon icon={Users} type="customer" />
                    <div className="flex-1 truncate">
                      <span className="font-medium">{label}</span>
                    </div>
                    {c.phone && (
                      <span className="shrink-0 text-xs text-muted-foreground">{c.phone}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {hasSearch && !isLoading && quotes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quotes">
              {quotes.map((q) => (
                <CommandItem
                  key={`quote-${q.id}`}
                  onSelect={() => handleEntitySelect('quote', q.id, q.quoteNumber)}
                >
                  <EntityIcon icon={FileText} type="quote" />
                  <div className="flex-1 truncate">
                    <span className="font-medium">{q.quoteNumber}</span>
                  </div>
                  {q.customerName && (
                    <span className="shrink-0 text-xs text-muted-foreground">{q.customerName}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {hasSearch && !isLoading && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={`project-${p.id}`}
                  onSelect={() => handleEntitySelect('project', p.id, p.name || p.projectNumber)}
                >
                  <EntityIcon icon={Folder} type="project" />
                  <div className="flex-1 truncate">
                    <span className="font-medium">{p.name || p.projectNumber}</span>
                  </div>
                  {p.property?.customerName && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.property.customerName}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center justify-between border-t border-border-light bg-background-secondary px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border-light bg-background px-1.5 py-0.5 text-[10px]">
              ↑↓
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border-light bg-background px-1.5 py-0.5 text-[10px]">
              ↵
            </kbd>
            Select
          </span>
        </div>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border-light bg-background px-1.5 py-0.5 text-[10px]">
            ESC
          </kbd>
          Close
        </span>
      </div>
    </CommandDialog>
  );
}
