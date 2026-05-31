'use client';

import { Paper } from '@mui/material';
import { Sparkles, User, MapPin, Calendar } from 'lucide-react';
import React from 'react';

import { formatDate } from '@/lib/utils/format';

interface QuoteHeroCardProps {
  actualKw: number;
  customerName: string;
  propertyName?: string;
  validUntil: string;
}

export function QuoteHeroCard({
  actualKw,
  customerName,
  propertyName,
  validUntil,
}: QuoteHeroCardProps): React.JSX.Element {
  return (
    <Paper
      variant="outlined"
      className="hero-gradient border border-border rounded-xl p-6 relative overflow-hidden shadow-sm"
    >
      <div className="absolute right-0 top-0 w-1/4 h-full bg-radial-gradient from-primary/5 to-transparent pointer-events-none" />

      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary-dark rounded-full text-[10px] font-semibold border border-primary/20 mb-3">
        <Sparkles className="h-3 w-3 text-primary-dark" /> Customized Solution Recommended
      </div>

      <h2 className="text-lg font-bold text-foreground tracking-tight mb-2">
        Clean Energy Engineered for Efficiency
      </h2>
      <p className="text-foreground-secondary text-sm leading-relaxed max-w-xl">
        Based on your site survey, we have configured a high-performance{' '}
        <span className="text-primary-dark font-bold">{actualKw}kW</span> solar generation array.
        This setup is specifically engineered to power your active infrastructure, offset utility
        tariffs, and maximize long-term energy savings.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-background-tertiary rounded-lg text-foreground-secondary border border-border">
            <User className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-semibold block leading-none">
              Client Name
            </span>
            <p className="text-xs font-semibold text-foreground-secondary mt-1 leading-none">
              {customerName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-background-tertiary rounded-lg text-foreground-secondary border border-border">
            <MapPin className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-semibold block leading-none">
              Project Location
            </span>
            <p className="text-xs font-semibold text-foreground-secondary truncate max-w-[160px] mt-1 leading-none">
              {propertyName ?? 'Unnamed Property'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-background-tertiary rounded-lg text-foreground-secondary border border-border">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-semibold block leading-none">
              Proposal Expiry
            </span>
            <p className="text-xs font-semibold text-foreground-secondary mt-1 leading-none">
              {formatDate(validUntil, 'medium')}
            </p>
          </div>
        </div>
      </div>
    </Paper>
  );
}
