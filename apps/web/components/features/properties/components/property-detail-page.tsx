'use client';

import { LeadTemperature, FollowupType, FollowupStatus, FollowupPriority } from '@oneohm-epc/shared-types';
import { Calendar, FileText, MapPin, Plus, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { EditableField, FilterTabs } from '@/components/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  showToast,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

interface PropertyDetailPageProps {
  propertyId: string;
}

interface Followup {
  id: string;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  status: FollowupStatus;
  priority: FollowupPriority;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockProperty = {
  id: 'p1',
  propertyName: 'Main Residence',
  propertyType: 'Residential',
  address: '456 Green Valley, Kothrud',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411038',
  leadTemperature: LeadTemperature.HOT,
  wantsLoan: true,
  consumerNumber: 'MSEDCL-123456',
  discomName: 'MSEDCL',
  connectionType: 'Domestic',
  sanctionedLoad: 5,
  meterNumber: 'MTR-789012',
  monthlyBill: 3500,
  customer: {
    id: '1',
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
  },
  notes: 'Interested in 5kW system. Roof is flat with good sun exposure.',
};

const mockFollowups: Followup[] = [
  {
    id: 'f1',
    type: FollowupType.VISIT,
    subject: 'Site visit for assessment',
    scheduledAt: '2024-02-20T10:00:00Z',
    status: FollowupStatus.PENDING,
    priority: FollowupPriority.HIGH,
  },
  {
    id: 'f2',
    type: FollowupType.REMINDER,
    subject: 'Follow up on quote',
    scheduledAt: '2024-02-18T14:00:00Z',
    status: FollowupStatus.COMPLETED,
    priority: FollowupPriority.NORMAL,
  },
];

const mockQuotes = [
  { id: 'q1', quoteNumber: 'QT-2024-001', systemSize: '5 kW', value: '₹3,50,000', status: 'sent' },
];

// ============================================================================
// Badge Mappings
// ============================================================================

const TEMPERATURE_VARIANTS: Record<LeadTemperature, 'hot' | 'warm' | 'cold'> = {
  [LeadTemperature.HOT]: 'hot',
  [LeadTemperature.WARM]: 'warm',
  [LeadTemperature.COLD]: 'cold',
};

const PRIORITY_VARIANTS: Record<FollowupPriority, 'error' | 'warning' | 'muted'> = {
  [FollowupPriority.HIGH]: 'error',
  [FollowupPriority.NORMAL]: 'warning',
  [FollowupPriority.LOW]: 'muted',
};

// ============================================================================
// Component
// ============================================================================

export function PropertyDetailPage({ propertyId }: PropertyDetailPageProps): React.JSX.Element {
  const router = useRouter();
  const property = mockProperty; // TODO: Phase 2 - Fetch by ID
  const [followupFilter, setFollowupFilter] = React.useState<'all' | 'pending' | 'completed'>('all');

  const filteredFollowups = followupFilter === 'all'
    ? mockFollowups
    : mockFollowups.filter(f => {
        if (followupFilter === 'pending') return f.status === FollowupStatus.PENDING;
        return f.status === FollowupStatus.COMPLETED;
      });

  const handleFieldSave = (field: string, value: string) => {
    console.log('Save field:', field, value);
    showToast.success(`${field} updated`);
  };

  const handleTemperatureChange = (temp: LeadTemperature) => {
    console.log('Change temperature:', temp);
    showToast.success(`Temperature changed to ${temp}`);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.PROPERTIES.LIST}>Properties</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{property.propertyName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Large Temperature Badge per UX */}
          <div
            className={`size-14 rounded-lg flex items-center justify-center shrink-0 ${
              property.leadTemperature === LeadTemperature.HOT
                ? 'bg-error/10 text-error'
                : property.leadTemperature === LeadTemperature.WARM
                ? 'bg-warning/10 text-warning'
                : 'bg-info/10 text-info'
            }`}
          >
            <span className="text-lg font-semibold">{property.leadTemperature.charAt(0)}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{property.propertyName}</h1>
              <Badge variant={TEMPERATURE_VARIANTS[property.leadTemperature]}>
                {property.leadTemperature}
              </Badge>
              {property.wantsLoan && (
                <Badge variant="info" size="xs" className="flex items-center gap-1">
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                  Loan Interest
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground-secondary mt-1">
              {property.address}, {property.city}
            </p>
            <Link
              href={ROUTES.CUSTOMERS.DETAIL.replace('[id]', property.customer.id)}
              className="text-sm text-primary hover:underline"
            >
              {property.customer.name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`${ROUTES.SITE_VISITS.NEW  }?propertyId=${propertyId}`)}>
            <Calendar className="mr-2 size-icon-sm" />
            Schedule Visit
          </Button>
          <Button size="sm" onClick={() => router.push(`${ROUTES.QUOTES.NEW  }?propertyId=${propertyId}`)}>
            <FileText className="mr-2 size-icon-sm" />
            Create Quote
          </Button>
        </div>
      </div>

      {/* 3-Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Site Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Site Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="size-icon text-foreground-secondary mt-0.5" />
              <div>
                <p className="text-sm text-foreground">{property.address}</p>
                <p className="text-xs text-foreground-secondary">
                  {property.city}, {property.state} - {property.pincode}
                </p>
              </div>
            </div>
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-xs text-foreground-tertiary">Map placeholder</p>
            </div>
          </CardContent>
        </Card>

        {/* Electricity Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Electricity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Zap className="size-icon text-warning" />
              <div>
                <p className="text-sm font-medium">{property.discomName}</p>
                <p className="text-xs text-foreground-secondary">{property.connectionType}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">Consumer No.</p>
                <p className="text-sm">{property.consumerNumber || '-'}</p>
              </div>
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">Meter No.</p>
                <p className="text-sm">{property.meterNumber || '-'}</p>
              </div>
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">Sanctioned Load</p>
                <p className="text-sm">{property.sanctionedLoad} kW</p>
              </div>
              <div>
                <p className="text-2xs text-foreground-secondary uppercase">Avg. Bill</p>
                <p className="text-sm">₹{property.monthlyBill?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Lead Status</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push(`${ROUTES.FOLLOWUPS.NEW  }?propertyId=${propertyId}`)}>
                <Plus className="size-icon-sm" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Temperature Selector per UX with colored buttons */}
            <div className="space-y-2">
              <p className="text-2xs text-foreground-secondary uppercase">Temperature</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(LeadTemperature.HOT)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                    property.leadTemperature === LeadTemperature.HOT
                      ? 'bg-error text-white shadow-sm'
                      : 'bg-error/10 text-error hover:bg-error/20'
                  }`}
                >
                  Hot
                </button>
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(LeadTemperature.WARM)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                    property.leadTemperature === LeadTemperature.WARM
                      ? 'bg-warning text-white shadow-sm'
                      : 'bg-warning/10 text-warning hover:bg-warning/20'
                  }`}
                >
                  Warm
                </button>
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(LeadTemperature.COLD)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                    property.leadTemperature === LeadTemperature.COLD
                      ? 'bg-info text-white shadow-sm'
                      : 'bg-info/10 text-info hover:bg-info/20'
                  }`}
                >
                  Cold
                </button>
              </div>
            </div>

            {/* Recent Followups */}
            <div className="pt-2 border-t border-border-light">
              <p className="text-2xs text-foreground-secondary uppercase mb-2">Upcoming Followups</p>
              {mockFollowups.filter(f => f.status === FollowupStatus.PENDING).slice(0, 2).map(followup => (
                <div key={followup.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm">{followup.subject}</p>
                    <p className="text-xs text-foreground-secondary">
                      {new Date(followup.scheduledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={PRIORITY_VARIANTS[followup.priority]} size="xs">
                    {followup.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="followups" className="w-full">
        <TabsList>
          <TabsTrigger value="sitevisit">Site Visit</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="followups">Followups</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="sitevisit" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="size-icon-xl text-foreground-tertiary mx-auto mb-3" />
              <p className="text-sm text-foreground-secondary">No site visit completed yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push(`${ROUTES.SITE_VISITS.NEW  }?propertyId=${propertyId}`)}
              >
                Schedule Site Visit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {mockQuotes.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-background-secondary border-b border-border-light">
                    <tr>
                      <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Quote #</th>
                      <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">System</th>
                      <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockQuotes.map(quote => (
                      <tr key={quote.id} className="hover:bg-muted">
                        <td className="px-4 py-3">
                          <Link href={ROUTES.QUOTES.DETAIL.replace('[id]', quote.id)} className="text-sm font-medium text-primary hover:underline">
                            {quote.quoteNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground-secondary">{quote.systemSize}</td>
                        <td className="px-4 py-3 text-sm font-medium">{quote.value}</td>
                        <td className="px-4 py-3">
                          <Badge variant="info">{quote.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <FileText className="size-icon-xl text-foreground-tertiary mx-auto mb-3" />
                  <p className="text-sm text-foreground-secondary">No quotes created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <Card>
            <CardHeader className="border-b border-border-light">
              <div className="flex items-center justify-between">
                <FilterTabs
                  tabs={[
                    { id: 'all' as const, label: 'All', count: mockFollowups.length },
                    { id: 'pending' as const, label: 'Pending', count: mockFollowups.filter(f => f.status === FollowupStatus.PENDING).length },
                    { id: 'completed' as const, label: 'Completed', count: mockFollowups.filter(f => f.status === FollowupStatus.COMPLETED).length },
                  ]}
                  value={followupFilter}
                  onChange={setFollowupFilter}
                  variant="pills"
                  size="sm"
                />
                <Button size="sm" onClick={() => router.push(`${ROUTES.FOLLOWUPS.NEW  }?propertyId=${propertyId}`)}>
                  <Plus className="mr-2 size-icon-sm" />
                  Add Followup
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredFollowups.length > 0 ? (
                <div className="divide-y divide-border-light">
                  {filteredFollowups.map(followup => (
                    <div key={followup.id} className="p-4 hover:bg-muted transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{followup.subject}</p>
                          <p className="text-xs text-foreground-secondary">
                            {new Date(followup.scheduledAt).toLocaleDateString()} at{' '}
                            {new Date(followup.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={PRIORITY_VARIANTS[followup.priority]} size="xs">
                            {followup.priority}
                          </Badge>
                          <Badge variant={followup.status === FollowupStatus.COMPLETED ? 'success' : 'warning'} size="xs">
                            {followup.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-foreground-secondary">No followups found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <EditableField
                value={property.notes || ''}
                type="textarea"
                placeholder="Add notes about this property..."
                onSave={(v) => handleFieldSave('Notes', v)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
