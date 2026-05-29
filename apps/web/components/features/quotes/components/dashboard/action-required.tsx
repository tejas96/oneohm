'use client';

import ArrowForward from '@mui/icons-material/ArrowForward';
import Card from '@mui/material/Card';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { MUITypography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

export interface ActionItem {
  id: string;
  text: string;
}

export interface ActionRequiredProps {
  items: ActionItem[];
}

// ============================================================================
// Component
// ============================================================================

export function ActionRequired({ items }: ActionRequiredProps): React.JSX.Element {
  const router = useRouter();

  return (
    <Card
      elevation={0}
      className="flex-1 lg:w-1/2 p-4 rounded-lg border border-border-light bg-background shadow-card flex flex-col justify-between min-h-[350px]"
    >
      <div>
        <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
          Action Required
        </MUITypography>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Critical blockers requiring follow-up
        </MUITypography>
      </div>

      <div className="flex-1 flex flex-col gap-3 justify-center mt-4">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-background-secondary hover:bg-border-light transition-colors cursor-pointer group"
            onClick={() => {
              const statusMap: Record<string, string> = {
                'act-2': 'draft',
                'act-3': 'sent',
                'act-4': 'rejected',
              };
              const status = statusMap[item.id];
              if (status) {
                if (item.id === 'act-2') {
                  const fifteenDaysAgo = new Date();
                  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                  fifteenDaysAgo.setHours(23, 59, 59, 999);
                  router.push(
                    `${ROUTES.QUOTES.LIST}?status=draft&toDate=${fifteenDaysAgo.toISOString()}`,
                  );
                } else {
                  router.push(`${ROUTES.QUOTES.LIST}?status=${status}`);
                }
              } else {
                router.push(ROUTES.QUOTES.LIST);
              }
            }}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                idx === 1
                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                  : 'bg-rose-50 text-rose-500 border border-rose-100'
              }`}
            >
              ⚠
            </span>
            <MUITypography variant="body" className="font-semibold text-text-primary flex-1">
              {item.text}
            </MUITypography>
            <ArrowForward className="size-3.5 text-text-secondary group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
          </div>
        ))}
      </div>
    </Card>
  );
}
