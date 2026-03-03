'use client';

import { PropertyStatus } from '@oneohm-epc/shared-types';
import { Calendar, Edit, FileText, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { LEAD_TEMPERATURE_CONFIG, PROPERTY_TYPE_LABELS } from '../constants';

import type { CustomerPropertyResponse } from '@/components/features/customers/hooks';
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
} from '@/components/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, formatDate, getInitials } from '@/lib/utils';

interface PropertyDetailHeaderProps {
  property: CustomerPropertyResponse;
}

export const PropertyDetailHeader = React.memo(
  ({ property }: PropertyDetailHeaderProps): React.JSX.Element => {
    const router = useRouter();
    const customerName = property.customerName || 'Unknown Customer';
    const propertyName = property.propertyName || 'Unnamed Property';
    const propertyTypeName = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
    const tempConfig = LEAD_TEMPERATURE_CONFIG[property.leadTemperature];

    return (
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ROUTES.CUSTOMERS.LIST}>Customers</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: property.customerId })}>
                  {customerName}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">{propertyName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar size="xl">
              <AvatarFallback size="xl" name={propertyName}>
                {getInitials(propertyName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground" title={propertyName}>
                  {propertyName}
                </h1>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium',
                    tempConfig.bg,
                  )}
                >
                  {tempConfig.label}
                </span>
                {property.wantsLoan && (
                  <Badge variant="info" size="xs" className="shrink-0">
                    Loan
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {property.address || '-'}, {property.city || '-'}
                {property.state ? `, ${property.state}` : ''}
                {property.pincode ? ` - ${property.pincode}` : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {propertyTypeName}
                {' · '}
                <Link
                  href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: property.customerId })}
                  className="text-primary hover:underline"
                >
                  {customerName}
                </Link>
                {' · Created '}
                {formatDate(property.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {property.status !== PropertyStatus.CONVERTED && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `${ROUTES.PROJECTS.NEW}?propertyId=${property.id}&customerId=${property.customerId}`,
                  )
                }
              >
                <FolderOpen className="mr-2 size-icon-sm" />
                Convert to Project
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: property.id }))}
            >
              <Edit className="mr-2 size-icon-sm" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`${ROUTES.SITE_VISITS.NEW}?propertyId=${property.id}`)}
            >
              <Calendar className="mr-2 size-icon-sm" />
              Schedule Visit
            </Button>
            <Button
              size="sm"
              onClick={() =>
                router.push(
                  `${ROUTES.QUOTES.NEW}?propertyId=${property.id}&customerId=${property.customerId}`,
                )
              }
            >
              <FileText className="mr-2 size-icon-sm" />
              Create Quote
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

PropertyDetailHeader.displayName = 'PropertyDetailHeader';
