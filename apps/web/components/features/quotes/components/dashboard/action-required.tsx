'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import Card from '@mui/material/Card';
import { ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

export interface ActionItem {
  id: string;
  text: string;
}

interface ActionRequiredProps {
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
      className="flex-1 lg:w-1/2 p-6 rounded-[20px] border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between min-h-[360px]"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">Action Required</h2>
        <p className="text-xs text-slate-500 mt-0.5">Critical blockers requiring follow-up</p>
      </div>

      <div className="flex-1 flex flex-col gap-3 justify-center mt-6">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group"
            onClick={() => {
              const statusMap: Record<string, string> = {
                'act-2': 'draft',
                'act-3': 'sent',
                'act-4': 'rejected',
              };
              const status = statusMap[item.id];
              if (status) {
                router.push(`${ROUTES.QUOTES.LIST}?status=${status}`);
              } else {
                router.push(ROUTES.QUOTES.LIST);
              }
            }}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                idx === 1 ? 'bg-amber-100 text-amber-600' : 'bg-red-50 text-red-500'
              }`}
            >
              ⚠
            </span>
            <span className="text-xs font-semibold text-slate-700 flex-1">{item.text}</span>
            <ArrowRight className="size-3.5 text-slate-400 group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
          </div>
        ))}
      </div>
    </Card>
  );
}
