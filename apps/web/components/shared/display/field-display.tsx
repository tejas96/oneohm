'use client';

import {
  Tag,
  MapPin,
  Sun,
  Check,
  Clock,
  Plus,
  AlertTriangle,
  X,
  ExternalLink,
  Zap,
  CreditCard,
} from 'lucide-react';
import * as React from 'react';

import type {
  FieldDisplayProps,
  ReferralData,
  GPSData,
  ShadingData,
  ShadingLevel,
  DocumentStatusData,
  ConnectionData,
  LoanData,
} from './types';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ============================================================================
// Shared Utilities
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// Shading Level Config
// ============================================================================

const SHADING_CONFIG: Record<
  ShadingLevel,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  none: {
    label: 'No Shading',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    dotClass: 'bg-green-500',
  },
  minimal: {
    label: 'Minimal Shading',
    bgClass: 'bg-lime-100',
    textClass: 'text-lime-700',
    dotClass: 'bg-lime-500',
  },
  moderate: {
    label: 'Moderate Shading',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
    dotClass: 'bg-yellow-500',
  },
  significant: {
    label: 'Significant Shading',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
};

// ============================================================================
// Referral Display
// ============================================================================

interface ReferralDisplayProps {
  data: ReferralData;
  size: 'compact' | 'full';
  className?: string;
}

function ReferralDisplay({ data, size, className }: ReferralDisplayProps) {
  if (size === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Tag className="size-icon-sm text-amber-500" />
        <span className="text-sm text-foreground-secondary">Referral:</span>
        <span className="text-sm font-medium text-foreground font-mono">
          {data.referralCode}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-container-md rounded-lg bg-amber-100 flex items-center justify-center">
            <Tag className="size-icon-md text-amber-600" />
          </div>
          <div>
            <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">
              Referred By
            </div>
            <div className="text-sm font-semibold text-foreground">
              {data.referrerName}
              {data.referrerType && (
                <span className="text-foreground-secondary font-normal">
                  {' '}
                  ({data.referrerType})
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground-tertiary">Referral Code</div>
          <div className="font-mono text-sm font-medium text-amber-700">
            {data.referralCode}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GPS Display
// ============================================================================

interface GPSDisplayProps {
  data: GPSData | null;
  size: 'compact' | 'full';
  className?: string;
  onViewMap?: () => void;
}

function GPSDisplay({ data, size, className, onViewMap }: GPSDisplayProps) {
  const formatCoordinate = (value: number, type: 'lat' | 'lng') => {
    const direction = type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(4)}° ${direction}`;
  };

  const mapsUrl = data
    ? `https://maps.google.com/?q=${data.latitude},${data.longitude}`
    : null;

  // Not captured state
  if (!data) {
    return (
      <div
        className={cn(
          'p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3',
          className
        )}
      >
        <AlertTriangle className="size-icon-md text-warning" />
        <div className="flex-1">
          <div className="text-sm font-medium text-warning">GPS not captured</div>
          <div className="text-xs text-warning/80">
            Location will be recorded during site visit
          </div>
        </div>
      </div>
    );
  }

  if (size === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <MapPin className="size-icon-sm text-foreground-tertiary" />
        <span className="font-mono text-foreground-secondary">
          {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
        </span>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            onClick={(e) => {
              if (onViewMap) {
                e.preventDefault();
                onViewMap();
              }
            }}
          >
            →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-muted rounded-lg', className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-foreground-tertiary font-medium uppercase tracking-wide mb-1">
            GPS Location
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-foreground-tertiary">Latitude</span>
              <div className="font-mono text-sm font-medium text-foreground">
                {formatCoordinate(data.latitude, 'lat')}
              </div>
            </div>
            <div>
              <span className="text-xs text-foreground-tertiary">Longitude</span>
              <div className="font-mono text-sm font-medium text-foreground">
                {formatCoordinate(data.longitude, 'lng')}
              </div>
            </div>
          </div>
        </div>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            onClick={(e) => {
              if (onViewMap) {
                e.preventDefault();
                onViewMap();
              }
            }}
          >
            <ExternalLink className="size-icon-sm" />
            View on Map
          </a>
        )}
      </div>
      {data.capturedAt && (
        <div className="mt-3 text-xs text-foreground-tertiary flex items-center gap-1">
          <Clock className="size-icon-2xs" />
          Captured{data.capturedBy && ` by ${data.capturedBy}`} on{' '}
          {data.capturedAt.toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Shading Display
// ============================================================================

interface ShadingDisplayProps {
  data: ShadingData | null;
  size: 'compact' | 'full';
  className?: string;
}

function ShadingDisplay({ data, size, className }: ShadingDisplayProps) {
  // Not assessed state
  if (!data) {
    return (
      <div
        className={cn(
          'p-3 bg-muted border border-border-light rounded-lg flex items-center gap-3',
          className
        )}
      >
        <div className="size-container-sm rounded-full bg-gray-200 flex items-center justify-center">
          <Sun className="size-icon-sm text-foreground-tertiary" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-foreground-secondary">
            Shading not assessed
          </div>
          <div className="text-xs text-foreground-tertiary">
            Will be evaluated during site visit
          </div>
        </div>
      </div>
    );
  }

  const config = SHADING_CONFIG[data.level];

  if (size === 'compact') {
    return (
      <Badge
        className={cn(
          'inline-flex items-center gap-1.5',
          config.bgClass,
          config.textClass,
          className
        )}
      >
        <span className={cn('w-2 h-2 rounded-full', config.dotClass)} />
        {config.label}
      </Badge>
    );
  }

  return (
    <div
      className={cn('p-4 bg-background rounded-lg border border-border-light', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground">Shading Analysis</h4>
        <Badge className={cn(config.bgClass, config.textClass)}>{config.label}</Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-foreground-tertiary mb-1">
          <span>Shading Level</span>
          <span className="font-medium">{data.percentage}%</span>
        </div>
        <Progress value={data.percentage} className="h-2" />
        <div className="flex justify-between text-xs text-foreground-tertiary mt-1">
          <span>None</span>
          <span>Significant</span>
        </div>
      </div>

      {/* Details */}
      {data.details && data.details.length > 0 && (
        <div className="space-y-2 text-sm">
          {data.details.map((detail, index) => (
            <div key={index} className="flex items-center gap-2">
              {detail.status === 'clear' ? (
                <Check className="size-icon-sm text-success" />
              ) : (
                <AlertTriangle className="size-icon-sm text-warning" />
              )}
              <span className="text-foreground-secondary">
                {detail.timeRange}: {detail.note || (detail.status === 'clear' ? 'No obstruction' : 'Shading present')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Assessment info */}
      {data.assessedAt && (
        <div className="mt-4 pt-3 border-t border-border-light">
          <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
            <Clock className="size-icon-sm" />
            Assessed{data.assessedBy && ` by ${data.assessedBy}`} on{' '}
            {data.assessedAt.toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Document Status Display
// ============================================================================

interface DocumentStatusDisplayProps {
  data: DocumentStatusData;
  size: 'compact' | 'full';
  className?: string;
}

function DocumentStatusDisplay({ data, size, className }: DocumentStatusDisplayProps) {
  const percentage = Math.round((data.uploaded / data.total) * 100);

  const getStatusIcon = (status: 'uploaded' | 'pending' | 'missing') => {
    switch (status) {
      case 'uploaded':
        return <Check className="size-icon-2xs" />;
      case 'pending':
        return <Clock className="size-icon-2xs" />;
      case 'missing':
        return <Plus className="size-icon-2xs" />;
    }
  };

  const getStatusClasses = (status: 'uploaded' | 'pending' | 'missing') => {
    switch (status) {
      case 'uploaded':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'missing':
        return 'bg-gray-100 text-foreground-tertiary';
    }
  };

  if (size === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Progress value={percentage} className="h-2 w-24" />
        <span className="text-xs text-foreground-secondary">
          {data.uploaded}/{data.total}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn('p-4 bg-background rounded-lg border border-border-light', className)}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Document Status</h4>
        <span className="text-sm font-medium text-foreground-secondary">
          {data.uploaded} of {data.total} uploaded
        </span>
      </div>

      <Progress value={percentage} className="h-2 mb-3" />

      <div className="flex flex-wrap gap-2">
        {data.documents.map((doc, index) => (
          <Badge
            key={index}
            className={cn(
              'inline-flex items-center gap-1',
              getStatusClasses(doc.status)
            )}
          >
            {getStatusIcon(doc.status)}
            {doc.name}
            {doc.status === 'pending' && ' (pending)'}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Connection Display
// ============================================================================

interface ConnectionDisplayProps {
  data: ConnectionData;
  size: 'compact' | 'full';
  className?: string;
}

function ConnectionDisplay({ data, size, className }: ConnectionDisplayProps) {
  if (size === 'compact') {
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        {data.connectionType && (
          <div className="flex items-center gap-1.5">
            <Zap className="size-icon-sm text-foreground-tertiary" />
            <span className="text-foreground-secondary">
              {data.connectionType === 'three' ? 'Three Phase' : 'Single Phase'}
            </span>
          </div>
        )}
        {data.sanctionedLoad && (
          <span className="text-foreground">{data.sanctionedLoad}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('p-4 bg-background rounded-lg border border-border-light', className)}
    >
      <h4 className="text-sm font-semibold text-foreground mb-4">Connection Details</h4>
      <div className="grid grid-cols-2 gap-4">
        {data.consumerNumber && (
          <div>
            <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
              Consumer Number
            </div>
            <div className="text-sm font-medium text-foreground font-mono">
              {data.consumerNumber}
            </div>
          </div>
        )}
        {data.meterNumber && (
          <div>
            <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
              Meter Number
            </div>
            <div className="text-sm font-medium text-foreground font-mono">
              {data.meterNumber}
            </div>
          </div>
        )}
        {data.connectionType && (
          <div>
            <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
              Connection Type
            </div>
            <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  data.connectionType === 'three' ? 'bg-blue-500' : 'bg-gray-400'
                )}
              />
              {data.connectionType === 'three' ? 'Three Phase' : 'Single Phase'}
            </div>
          </div>
        )}
        {data.sanctionedLoad && (
          <div>
            <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
              Sanctioned Load
            </div>
            <div className="text-sm font-medium text-foreground">
              {data.sanctionedLoad}
            </div>
          </div>
        )}
        {data.discom && (
          <div>
            <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
              DISCOM
            </div>
            <div className="text-sm font-medium text-foreground">{data.discom}</div>
          </div>
        )}
        {data.avgMonthlyBill !== undefined && (
          <div>
            <div className="text-xs text-foreground-tertiary uppercase tracking-wide">
              Avg. Monthly Bill
            </div>
            <div className="text-sm font-medium text-primary">
              {formatCurrency(data.avgMonthlyBill)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Loan Display
// ============================================================================

interface LoanDisplayProps {
  data: LoanData;
  size: 'compact' | 'full';
  className?: string;
}

function LoanDisplay({ data, size, className }: LoanDisplayProps) {
  if (!data.interested) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-foreground-secondary', className)}>
        <X className="size-icon-sm" />
        <span>Not interested in financing</span>
      </div>
    );
  }

  if (size === 'compact') {
    return (
      <Badge className={cn('bg-blue-100 text-blue-700', className)}>
        <CreditCard className="size-icon-2xs mr-1" />
        Loan Enquiry
      </Badge>
    );
  }

  return (
    <div
      className={cn(
        'p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="size-container-lg rounded-lg bg-blue-100 flex items-center justify-center">
          <CreditCard className="size-icon-lg text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-foreground">Interested in Solar Loan</div>
          <div className="text-sm text-foreground-secondary">
            Customer wants financing assistance
          </div>
        </div>
        <Badge className="bg-blue-600 text-white">Loan Enquiry</Badge>
      </div>

      {(data.systemValue || data.estimatedEMI || data.tenure) && (
        <div className="mt-4 pt-3 border-t border-blue-100 grid grid-cols-3 gap-4 text-center">
          {data.systemValue !== undefined && (
            <div>
              <div className="text-xs text-foreground-tertiary">System Value</div>
              <div className="text-sm font-semibold text-foreground">
                {formatCurrency(data.systemValue)}
              </div>
            </div>
          )}
          {data.estimatedEMI !== undefined && (
            <div>
              <div className="text-xs text-foreground-tertiary">Est. EMI</div>
              <div className="text-sm font-semibold text-foreground">
                {formatCurrency(data.estimatedEMI)}/mo
              </div>
            </div>
          )}
          {data.tenure !== undefined && (
            <div>
              <div className="text-xs text-foreground-tertiary">Tenure</div>
              <div className="text-sm font-semibold text-foreground">
                {data.tenure} months
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main FieldDisplay Component
// ============================================================================

export function FieldDisplay(props: FieldDisplayProps) {
  const size = props.size || 'full';

  switch (props.variant) {
    case 'referral':
      return <ReferralDisplay data={props.data} size={size} className={props.className} />;
    case 'gps':
      return (
        <GPSDisplay
          data={props.data}
          size={size}
          className={props.className}
          onViewMap={props.onViewMap}
        />
      );
    case 'shading':
      return <ShadingDisplay data={props.data} size={size} className={props.className} />;
    case 'document-status':
      return (
        <DocumentStatusDisplay data={props.data} size={size} className={props.className} />
      );
    case 'connection':
      return (
        <ConnectionDisplay data={props.data} size={size} className={props.className} />
      );
    case 'loan':
      return <LoanDisplay data={props.data} size={size} className={props.className} />;
    default:
      return null;
  }
}

FieldDisplay.displayName = 'FieldDisplay';
