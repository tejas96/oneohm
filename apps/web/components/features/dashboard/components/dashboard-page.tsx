'use client';

import * as React from 'react';

import { EmployeeSelector } from './employee-selector';
import { ModeSwitch, type DashboardMode } from './mode-switch';
import { MyWorkPage } from './my-work-page';
import { BusinessMode } from '../business/components/business-mode';
import { currentMonthRange } from '../business/lib/format';

import { useCan } from '@/lib/rbac';
import { useAuth } from '@/providers/auth-provider';

const MODE_STORAGE_KEY = 'oneohm-dashboard-mode';

/**
 * The dashboard, in two modes on one page.
 *
 * There is no route for Business mode and there is deliberately no URL
 * parameter either: it is a view of this page, not a place. The choice is
 * remembered per browser so someone who lives in Business mode lands there.
 *
 * This component owns the header row because the two controls in it are
 * mutually exclusive — the employee selector belongs to My Work, the date range
 * belongs to Business — and neither mode can own a row the other also writes to.
 */
export function DashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  const { can } = useCan();
  const mayViewBusiness = can('dashboard.business.view');

  const [mode, setMode] = React.useState<DashboardMode>('work');
  const [subjectUserId, setSubjectUserId] = React.useState<string | undefined>(undefined);

  // Read after mount, never during render: the server has no localStorage, and
  // seeding state from it directly gives a hydration mismatch on every load.
  React.useEffect(() => {
    if (window.localStorage.getItem(MODE_STORAGE_KEY) === 'business') {
      setMode('business');
    }
  }, []);

  const changeMode = React.useCallback((next: DashboardMode) => {
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  }, []);

  // A permission can be revoked between page loads. Falling back to My Work
  // rather than rendering Business mode to someone who may no longer read it.
  const activeMode: DashboardMode = mayViewBusiness ? mode : 'work';

  // The current calendar month, which is also what the API returns when given
  // no dates — so the label and the data cannot disagree on first paint.
  const range = React.useMemo(() => currentMonthRange(new Date()), []);

  return (
    <div className="flex flex-col">
      {mayViewBusiness ? (
        <div className="mb-5 flex min-h-10 items-center gap-4">
          <ModeSwitch value={activeMode} onChange={changeMode} />
          <div className="ml-auto flex items-center gap-2.5">
            {activeMode === 'business' ? (
              <span className="inline-flex h-9 items-center gap-2 rounded-pill bg-background-tertiary px-3.5 text-[13px] font-medium tracking-[-0.01em] tabular-nums">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-foreground-secondary"
                  />
                </svg>
                This month
                <span className="font-normal text-foreground-secondary">{range.label}</span>
              </span>
            ) : (
              <EmployeeSelector
                value={subjectUserId}
                onChange={setSubjectUserId}
                selfUserId={user?.id ?? ''}
              />
            )}
          </div>
        </div>
      ) : null}

      {activeMode === 'business' ? (
        <BusinessMode range={range} format="short" />
      ) : (
        <MyWorkPage
          subjectUserId={subjectUserId}
          onClearSubject={() => setSubjectUserId(undefined)}
        />
      )}
    </div>
  );
}
