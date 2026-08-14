'use client';

import { Lock } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { PERMISSION_BY_CODE, SUPERADMIN_ONLY, type Gate } from './catalog';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface AccessDeniedContentProps {
  /** The gate that was refused. */
  gate: Gate;
  /** What the user was trying to reach, e.g. "Inventory". Falls back to the permission's own name. */
  subject?: string;
  /**
   * Render the heading as Radix's `DialogTitle` instead of a plain `h2`.
   *
   * Set only by the dialog below. Radix needs the title to come from its own
   * component to wire up `aria-labelledby`; without it the dialog is announced
   * with no name and Radix logs an error on every open. The deny *page* is not
   * a dialog, so it keeps the plain heading.
   */
  asDialogTitle?: boolean;
}

/**
 * The body of every "you cannot do this" message in the app.
 *
 * One component so the dialog, the full deny page and the page-level guard can
 * never drift apart in wording. The description comes from the catalog, which
 * is why that column exists: a bare code tells the user nothing about what
 * they are asking for.
 */
export function AccessDeniedContent({
  gate,
  subject,
  asDialogTitle = false,
}: AccessDeniedContentProps): React.JSX.Element {
  const meta = gate === SUPERADMIN_ONLY ? undefined : PERMISSION_BY_CODE.get(gate);
  const heading = subject ?? meta?.name ?? 'Access needed';
  const Heading = asDialogTitle ? DialogTitle : 'h2';

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-4 flex size-container-xl items-center justify-center rounded-full bg-warning/10">
        <Lock className="size-icon-xl text-warning" />
      </div>

      <Heading className="mb-1 text-xl font-semibold text-foreground">{heading}</Heading>
      <p className="mb-4 text-sm text-foreground-secondary">You do not have access to this.</p>

      {gate === SUPERADMIN_ONLY ? (
        <div className="mb-4 rounded-md border border-border bg-background-secondary p-3 text-left">
          <p className="mb-1 text-xs uppercase tracking-wide text-foreground-secondary">
            Restricted
          </p>
          <p className="text-sm text-foreground">The admin panel is for superadmins only.</p>
        </div>
      ) : (
        <div className="mb-4 rounded-md border border-border bg-background-secondary p-3 text-left">
          <p className="mb-1 text-xs uppercase tracking-wide text-foreground-secondary">
            Permission needed
          </p>
          <code className="text-sm font-medium text-foreground">{gate}</code>
          {meta?.description ? (
            <p className="mt-1 text-sm text-foreground-secondary">{meta.description}</p>
          ) : null}
        </div>
      )}

      {/* The admin panel is gated by ROLE, so there is nothing to grant — telling
          someone to ask for a permission that does not exist sends them round a
          loop. Permission blocks keep the actionable wording. */}
      <p className="text-sm text-foreground-secondary">
        {gate === SUPERADMIN_ONLY
          ? 'Only a superadmin can open this. Ask one to make the change for you.'
          : 'Only a superadmin can grant this. Ask them to add it to one of your roles.'}
      </p>
    </div>
  );
}

interface AccessDialogContextValue {
  /** Open the central dialog explaining what the user needs. */
  requestAccess: (gate: Gate, subject?: string) => void;
}

const AccessDialogContext = createContext<AccessDialogContextValue | null>(null);

/**
 * Holds the one access dialog for the whole app.
 *
 * Blocked rail items, tabs and buttons stay visible but disabled; clicking one
 * calls `requestAccess`, which opens this. That is the point of showing them
 * rather than hiding them — a user who cannot see a feature cannot know to ask
 * for it.
 */
export function AccessDialogProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [request, setRequest] = useState<{ gate: Gate; subject?: string } | null>(null);

  const requestAccess = useCallback((gate: Gate, subject?: string) => {
    setRequest({ gate, subject });
  }, []);

  const value = useMemo(() => ({ requestAccess }), [requestAccess]);

  return (
    <AccessDialogContext.Provider value={value}>
      {children}

      <Dialog open={request !== null} onOpenChange={(open) => !open && setRequest(null)}>
        <DialogContent size="sm">
          <div className="p-6">
            {request ? (
              <AccessDeniedContent gate={request.gate} subject={request.subject} asDialogTitle />
            ) : null}
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setRequest(null)}>Got it</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AccessDialogContext.Provider>
  );
}

/**
 * Returns a no-op outside the provider rather than throwing.
 *
 * Gated components render in places the provider does not wrap — the login
 * screen, storybook-style previews, tests. A missing dialog is a far smaller
 * problem than a crash, and the gate itself still holds either way.
 */
export function useAccessDialog(): AccessDialogContextValue {
  const ctx = useContext(AccessDialogContext);
  return ctx ?? { requestAccess: () => undefined };
}
