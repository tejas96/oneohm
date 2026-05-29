'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { buildRoute, ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

export interface OpportunityItem {
  id: string;
  customer: string;
  value: number;
  status: string;
  color: string;
}

interface HighValueQuotesProps {
  opps: OpportunityItem[];
  valueFormatter: (value: number) => string;
}

// ============================================================================
// Component
// ============================================================================

export function HighValueQuotes({ opps, valueFormatter }: HighValueQuotesProps): React.JSX.Element {
  const router = useRouter();

  return (
    <Card
      elevation={0}
      className="p-6 rounded-[20px] border border-slate-200/80 bg-white shadow-sm flex flex-col gap-6"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900">High Value Quotes</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Top quotation opportunities currently active
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold">
              <th className="pb-3 text-left pl-1">Customer</th>
              <th className="pb-3 text-right">Quote Value</th>
              <th className="pb-3 text-center">Status</th>
              <th className="pb-3 text-right pr-1">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {opps.map((opp) => (
              <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-4 font-bold text-slate-800 pl-1">{opp.customer}</td>
                <td className="py-4 text-right font-semibold text-slate-900">
                  {valueFormatter(opp.value)}
                </td>
                <td className="py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      opp.status === 'Viewed'
                        ? 'text-cyan-700 bg-cyan-50 border border-cyan-100'
                        : opp.status === 'Negotiation'
                          ? 'text-amber-700 bg-amber-50 border border-amber-100'
                          : 'text-blue-700 bg-blue-50 border border-blue-100'
                    }`}
                  >
                    {opp.status}
                  </span>
                </td>
                <td className="py-4 text-right pr-1">
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      if (opp.id.startsWith('opp-')) {
                        router.push(ROUTES.QUOTES.LIST);
                      } else {
                        router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: opp.id }));
                      }
                    }}
                    className="rounded-lg text-primary hover:bg-primary/5 hover:text-primary-hover font-semibold normal-case min-w-0"
                  >
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
