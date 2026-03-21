'use client';

import { Phone, Mail, MapPin, Copy, Download } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { SYSTEM_TYPE_LABELS, PROJECT_TYPE_LABELS } from '../../../constants';
import type { QuoteDetail, QuoteVersionDetail } from '../../../hooks/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatCurrency } from '@/lib/utils/format';

interface QuoteOverviewTabProps {
  quote: QuoteDetail;
  viewingVersion?: QuoteVersionDetail;
  isActive: boolean;
}

export function QuoteOverviewTab({
  quote,
  viewingVersion,
  isActive: _isActive,
}: QuoteOverviewTabProps): React.JSX.Element {
  const version = viewingVersion;
  const systemType = version?.systemType ?? quote.systemType;
  const systemSizeKw = version?.systemSizeKw ?? quote.systemSizeKw;
  const totalWattageWp = version?.totalWattageWp ?? quote.totalWattageWp;
  const projectType = version?.projectType ?? quote.projectType;
  const projectCompletionWeeks = version?.projectCompletionWeeks ?? quote.projectCompletionWeeks;
  const breakdown = version?.pricingBreakdown ?? quote.pricingBreakdown;
  const effectivePrice = version?.effectivePrice ?? quote.effectivePrice;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Customer & Property */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-2xs text-foreground-secondary uppercase font-medium mb-2">
                  Customer
                </p>
                {quote.customerId ? (
                  <Link
                    href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: quote.customerId })}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {quote.customerName ?? 'Unknown Customer'}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{quote.customerName ?? 'Unknown Customer'}</p>
                )}
                {quote.customerPhone && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone className="size-icon-xs text-foreground-tertiary" />
                    <p className="text-sm text-foreground-secondary">{quote.customerPhone}</p>
                  </div>
                )}
                {quote.customerEmail && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="size-icon-xs text-foreground-tertiary" />
                    <p className="text-sm text-foreground-secondary">{quote.customerEmail}</p>
                  </div>
                )}
              </div>
              {(quote.propertyId || quote.propertyName) && (
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase font-medium mb-2">
                    Property
                  </p>
                  {quote.propertyId ? (
                    <Link
                      href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: quote.propertyId })}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {quote.propertyName ?? 'Unnamed Property'}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">
                      {quote.propertyName ?? 'Unnamed Property'}
                    </p>
                  )}
                  {quote.propertyAddress && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="size-icon-xs text-foreground-tertiary shrink-0" />
                      <p className="text-sm text-foreground-secondary">{quote.propertyAddress}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">System Size</p>
                <p className="text-sm font-medium">{systemSizeKw} kW</p>
              </div>
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">Total Wattage</p>
                <p className="text-sm font-medium">{totalWattageWp} Wp</p>
              </div>
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">System Type</p>
                <p className="text-sm">{SYSTEM_TYPE_LABELS[systemType] ?? systemType}</p>
              </div>
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">Project Type</p>
                <p className="text-sm">{PROJECT_TYPE_LABELS[projectType] ?? projectType}</p>
              </div>
              {projectCompletionWeeks != null && (
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase">Completion</p>
                  <p className="text-sm">{projectCompletionWeeks} weeks</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pricing Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown?.basePrice != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">Base Price</span>
                  <span className="text-sm">{formatCurrency(breakdown.basePrice)}</span>
                </div>
              )}
              {breakdown?.discountAmount != null && breakdown.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span className="text-sm">Discount</span>
                  <span className="text-sm">-{formatCurrency(breakdown.discountAmount)}</span>
                </div>
              )}
              {breakdown?.gst5OnEquipment != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">GST on Equipment</span>
                  <span className="text-sm">{formatCurrency(breakdown.gst5OnEquipment)}</span>
                </div>
              )}
              {breakdown?.gst18OnServices != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">GST on Services</span>
                  <span className="text-sm">{formatCurrency(breakdown.gst18OnServices)}</span>
                </div>
              )}
              {breakdown?.totalGst != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">Total GST</span>
                  <span className="text-sm">{formatCurrency(breakdown.totalGst)}</span>
                </div>
              )}
              {breakdown?.totalPrice != null && (
                <div className="flex justify-between border-t border-border-light pt-2">
                  <span className="text-sm font-medium">Gross Total</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(breakdown.totalPrice)}
                  </span>
                </div>
              )}
              {breakdown?.subsidyAmount != null && breakdown.subsidyAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span className="text-sm">Subsidy</span>
                  <span className="text-sm">-{formatCurrency(breakdown.subsidyAmount)}</span>
                </div>
              )}
              {effectivePrice != null && (
                <div className="flex justify-between border-t border-border-light pt-2">
                  <span className="text-sm font-semibold">You Pay</span>
                  <span className="text-lg font-semibold text-primary">
                    {formatCurrency(effectivePrice)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" disabled>
              <Download className="mr-2 size-icon-sm" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" disabled>
              <Copy className="mr-2 size-icon-sm" />
              Duplicate Quote
            </Button>
          </CardContent>
        </Card>

        {/* Status Info */}
        {quote.rejectionReason && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rejection Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground-secondary">{quote.rejectionReason}</p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {quote.customerNotes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customer Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground-secondary">{quote.customerNotes}</p>
            </CardContent>
          </Card>
        )}

        {quote.internalNotes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground-secondary">{quote.internalNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Sales Person */}
        {quote.salesPersonName && (
          <Card variant="minimal">
            <CardContent className="p-4">
              <p className="text-2xs text-foreground-secondary uppercase mb-1">Sales Person</p>
              <p className="text-sm font-medium">{quote.salesPersonName}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
