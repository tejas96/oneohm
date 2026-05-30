'use client';

import ArrowForward from '@mui/icons-material/ArrowForward';
import Warning from '@mui/icons-material/Warning';
import Card from '@mui/material/Card';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

export interface AlertItem {
  id: string;
  text: string;
  type: 'blocked' | 'overdue' | 'bottleneck';
  targetPath: string;
}

interface CriticalAlertsProps {
  items: AlertItem[];
}

// ============================================================================
// Component
// ============================================================================

export function CriticalAlerts({ items }: CriticalAlertsProps): React.JSX.Element {
  const router = useRouter();

  return (
    <Card
      elevation={0}
      className="flex-1 lg:w-1/2 p-4 rounded-lg border border-border-light bg-background shadow-card flex flex-col justify-between min-h-[350px]"
    >
      <div>
        <div className="flex items-center justify-between">
          <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
            Action Required
          </MUITypography>
          {items.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              {items.length} alert{items.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Critical blockers requiring immediate follow-up
        </MUITypography>
      </div>

      {/* BUG-14 FIX: Added overflow-y-auto and max-height so many alerts don't blow out the card */}
      <div className="flex-1 flex flex-col gap-3 justify-center mt-4 overflow-y-auto max-h-[240px] pr-1">
        {items.length === 0 ? (
          <div className="text-center py-6">
            <MUITypography variant="body" className="text-text-secondary italic">
              No critical alerts — all projects are running smoothly
            </MUITypography>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-background-secondary hover:bg-border-light transition-colors cursor-pointer group"
              onClick={() => router.push(item.targetPath)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(item.targetPath);
                }
              }}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  item.type === 'blocked'
                    ? 'bg-rose-50 text-rose-500 border border-rose-100'
                    : item.type === 'bottleneck'
                      ? 'bg-amber-50 text-amber-500 border border-amber-100'
                      : 'bg-orange-50 text-orange-500 border border-orange-100'
                }`}
              >
                <Warning className="size-3.5" />
              </span>
              <MUITypography
                variant="body"
                className="font-semibold text-text-primary flex-1 truncate"
              >
                {item.text}
              </MUITypography>
              <ArrowForward className="size-4 text-text-secondary group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
