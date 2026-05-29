'use client';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { MUITypography } from '@/components/ui';
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

export interface HighValueQuotesProps {
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
      className="p-4 rounded-lg border border-border-light bg-background shadow-card flex flex-col gap-4"
    >
      <div>
        <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
          High Value Quotes
        </MUITypography>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Top quotation opportunities currently active
        </MUITypography>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border-light text-text-secondary font-semibold">
              <th className="pb-3 text-left pl-1">
                <MUITypography variant="finePrint" className="font-semibold text-text-secondary">
                  Customer
                </MUITypography>
              </th>
              <th className="pb-3 text-right">
                <MUITypography variant="finePrint" className="font-semibold text-text-secondary">
                  Quote Value
                </MUITypography>
              </th>
              <th className="pb-3 text-center">
                <MUITypography variant="finePrint" className="font-semibold text-text-secondary">
                  Status
                </MUITypography>
              </th>
              <th className="pb-3 text-right pr-1">
                <MUITypography variant="finePrint" className="font-semibold text-text-secondary">
                  Action
                </MUITypography>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {opps.map((opp) => (
              <tr key={opp.id} className="hover:bg-background-secondary transition-colors group">
                <td className="py-3 pl-1">
                  <MUITypography variant="bodyPrimary" className="font-semibold text-text-primary">
                    {opp.customer}
                  </MUITypography>
                </td>
                <td className="py-3 text-right">
                  <MUITypography variant="bodyPrimary" className="font-semibold text-text-primary">
                    {valueFormatter(opp.value)}
                  </MUITypography>
                </td>
                <td className="py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border ${
                      opp.status === 'Viewed'
                        ? 'text-cyan-700 bg-cyan-50 border-cyan-100'
                        : opp.status === 'Negotiation'
                          ? 'text-amber-700 bg-amber-50 border-amber-100'
                          : 'text-blue-700 bg-blue-50 border-blue-100'
                    }`}
                  >
                    {opp.status}
                  </span>
                </td>
                <td className="py-3 text-right pr-1">
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
                    className="rounded-lg text-primary hover:bg-primary/5 hover:text-primary-hover font-semibold normal-case min-w-0 px-2"
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
