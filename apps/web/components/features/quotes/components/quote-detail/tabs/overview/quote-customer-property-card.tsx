'use client';

import { Paper, Typography } from '@mui/material';
import { Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { buildRoute, ROUTES } from '@/lib/config/routes';

interface QuoteCustomerPropertyCardProps {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  propertyId?: string;
  propertyName?: string;
  propertyAddress?: string;
}

export function QuoteCustomerPropertyCard({
  customerId,
  customerName,
  customerPhone,
  customerEmail,
  propertyId,
  propertyName,
  propertyAddress,
}: QuoteCustomerPropertyCardProps): React.JSX.Element {
  const sectionLabel = (text: string): React.ReactNode => (
    <Typography
      variant="caption"
      className="uppercase font-semibold text-[0.65rem] text-foreground-tertiary mb-2 block"
    >
      {text}
    </Typography>
  );

  return (
    <Paper variant="outlined" className="p-5 rounded-xl border border-border bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {sectionLabel('Customer')}
          {customerId ? (
            <Link
              href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customerId })}
              className="text-sm font-medium hover:text-primary transition-colors text-foreground"
            >
              {customerName ?? 'Unknown Customer'}
            </Link>
          ) : (
            <Typography variant="body2" className="font-medium text-foreground">
              {customerName ?? 'Unknown Customer'}
            </Typography>
          )}
          {customerPhone && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Phone className="size-icon-xs text-foreground-tertiary" />
              <Typography variant="body2" className="text-foreground-secondary">
                {customerPhone}
              </Typography>
            </div>
          )}
          {customerEmail && (
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="size-icon-xs text-foreground-tertiary" />
              <Typography variant="body2" className="text-foreground-secondary">
                {customerEmail}
              </Typography>
            </div>
          )}
        </div>
        {(propertyId || propertyName) && (
          <div>
            {sectionLabel('Property')}
            {propertyId ? (
              <Link
                href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId })}
                className="text-sm font-medium hover:text-primary transition-colors text-foreground"
              >
                {propertyName ?? 'Unnamed Property'}
              </Link>
            ) : (
              <Typography variant="body2" className="font-medium text-foreground">
                {propertyName ?? 'Unnamed Property'}
              </Typography>
            )}
            {propertyAddress && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin className="size-icon-xs text-foreground-tertiary shrink-0" />
                <Typography variant="body2" className="text-foreground-secondary">
                  {propertyAddress}
                </Typography>
              </div>
            )}
          </div>
        )}
      </div>
    </Paper>
  );
}
