'use client';

import { CustomerStatus, LeadTemperature } from '@oneohm-epc/shared-types';
import { Building2, Calendar, Mail, MapPin, Phone, Plus, FileText, Folder, Activity, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX } from 'react';

import { EditableField, Timeline } from '@/components/shared';
import {
  Avatar,
  AvatarFallback,
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

interface CustomerDetailPageProps {
  customerId: string;
}

interface Property {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  leadTemperature: LeadTemperature;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockCustomer = {
  id: '1',
  firstName: 'Rajesh',
  lastName: 'Sharma',
  phone: '+91 98765 43210',
  alternatePhone: '+91 98765 43211',
  email: 'rajesh.sharma@email.com',
  status: CustomerStatus.ACTIVE,
  billingAddress: '123 MG Road',
  billingCity: 'Pune',
  billingState: 'Maharashtra',
  billingPincode: '411001',
  createdAt: '2024-01-15',
  properties: [
    {
      id: 'p1',
      propertyName: 'Main Residence',
      address: '456 Green Valley',
      city: 'Pune',
      leadTemperature: LeadTemperature.HOT,
    },
    {
      id: 'p2',
      propertyName: 'Office Building',
      address: '789 Business Park',
      city: 'Pune',
      leadTemperature: LeadTemperature.WARM,
    },
  ] as Property[],
};

// Activity items will be transformed to TimelineItem format when rendered
const mockActivityData = [
  { id: '1', type: 'quote' as const, title: 'Quote sent', description: 'Quote #QT-2024-001 sent to customer', timestamp: new Date('2024-02-14T10:30:00Z') },
  { id: '2', type: 'visit' as const, title: 'Site visit completed', description: 'Technical assessment at Main Residence', timestamp: new Date('2024-02-12T14:00:00Z') },
  { id: '3', type: 'followup' as const, title: 'Follow-up scheduled', description: 'Scheduled call for tomorrow', timestamp: new Date('2024-02-10T09:00:00Z') },
];

const getActivityIcon = (type: 'quote' | 'visit' | 'followup') => {
  switch (type) {
    case 'quote': return <FileText className="size-icon-sm" />;
    case 'visit': return <MapPin className="size-icon-sm" />;
    case 'followup': return <Clock className="size-icon-sm" />;
  }
};

const getActivityIconClass = (type: 'quote' | 'visit' | 'followup') => {
  switch (type) {
    case 'quote': return { bg: 'bg-blue-100', text: 'text-blue-600' };
    case 'visit': return { bg: 'bg-success/20', text: 'text-success' };
    case 'followup': return { bg: 'bg-warning/20', text: 'text-warning' };
  }
};

const mockQuotes = [
  { id: 'q1', quoteNumber: 'QT-2024-001', property: 'Main Residence', systemSize: '5 kW', value: '₹3,50,000', status: 'sent' },
  { id: 'q2', quoteNumber: 'QT-2024-002', property: 'Office Building', systemSize: '10 kW', value: '₹6,50,000', status: 'draft' },
];

// ============================================================================
// Status Badge Mapping
// ============================================================================

const TEMPERATURE_VARIANTS: Record<LeadTemperature, 'hot' | 'warm' | 'cold'> = {
  [LeadTemperature.HOT]: 'hot',
  [LeadTemperature.WARM]: 'warm',
  [LeadTemperature.COLD]: 'cold',
};

// ============================================================================
// Component
// ============================================================================

export function CustomerDetailPage({ customerId }: CustomerDetailPageProps): JSX.Element {
  const router = useRouter();
  const customer = mockCustomer; // TODO: Phase 2 - Fetch by ID

  const handleFieldSave = (field: string, value: string) => {
    // TODO: Phase 2 - API call
    console.log('Save field:', field, value);
    showToast.success(`${field} updated`);
  };

  const getInitials = () => {
    return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.CUSTOMERS.LIST}>Customers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{customer.firstName} {customer.lastName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-lg font-semibold bg-primary text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">
                {customer.firstName} {customer.lastName}
              </h1>
              <Badge variant="success">{customer.status}</Badge>
            </div>
            <p className="text-sm text-foreground-secondary mt-1">
              Customer since {new Date(customer.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Phone className="mr-2 size-icon-sm" />
            Call
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 size-icon-sm" />
            Email
          </Button>
          <Button size="sm" onClick={() => router.push(ROUTES.CUSTOMERS.ADD_PROPERTY.replace('[id]', customerId))}>
            <Plus className="mr-2 size-icon-sm" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border-light rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="size-icon text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{customer.properties.length}</p>
              <p className="text-xs text-foreground-secondary">Properties</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border-light rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-info/10 flex items-center justify-center">
              <FileText className="size-icon text-info" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{mockQuotes.length}</p>
              <p className="text-xs text-foreground-secondary">Quotes</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border-light rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-success/10 flex items-center justify-center">
              <MapPin className="size-icon text-success" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">3</p>
              <p className="text-xs text-foreground-secondary">Site Visits</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border-light rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Calendar className="size-icon text-warning" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">₹10L</p>
              <p className="text-xs text-foreground-secondary">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EditableField
              label="Phone"
              showLabel
              value={customer.phone}
              type="phone"
              onSave={(v) => handleFieldSave('Phone', v)}
            />
            <EditableField
              label="Alternate Phone"
              showLabel
              value={customer.alternatePhone || ''}
              type="phone"
              placeholder="Add alternate phone"
              onSave={(v) => handleFieldSave('Alternate Phone', v)}
            />
            <EditableField
              label="Email"
              showLabel
              value={customer.email || ''}
              type="email"
              placeholder="Add email"
              onSave={(v) => handleFieldSave('Email', v)}
            />
            <div className="pt-2 border-t border-border-light">
              <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider mb-2">
                Billing Address
              </p>
              <p className="text-sm text-foreground">
                {customer.billingAddress}, {customer.billingCity}
              </p>
              <p className="text-xs text-foreground-secondary">
                {customer.billingState} - {customer.billingPincode}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Properties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Properties</CardTitle>
              <Badge variant="count" size="xs">{customer.properties.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customer.properties.map((property) => (
                <Link
                  key={property.id}
                  href={ROUTES.PROPERTIES.DETAIL.replace('[id]', property.id)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border-light hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Building2 className="size-icon text-foreground-secondary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {property.propertyName}
                      </p>
                      <Badge variant={TEMPERATURE_VARIANTS[property.leadTemperature]} size="xs">
                        {property.leadTemperature}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground-secondary truncate">
                      {property.address}, {property.city}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline
              items={mockActivityData.map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                timestamp: a.timestamp,
                icon: getActivityIcon(a.type),
                iconBgClass: getActivityIconClass(a.type).bg,
                iconTextClass: getActivityIconClass(a.type).text,
              }))}
              variant="compact"
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="quotes" className="w-full">
        <TabsList>
          <TabsTrigger value="quotes" className="gap-2">
            <FileText className="size-icon-sm" />
            Quotes
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <Folder className="size-icon-sm" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <MapPin className="size-icon-sm" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="size-icon-sm" />
            All Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-background-secondary border-b border-border-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Quote #</th>
                    <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Property</th>
                    <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">System</th>
                    <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Value</th>
                    <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {mockQuotes.map(quote => (
                    <tr key={quote.id} className="hover:bg-muted transition-colors">
                      <td className="px-4 py-3">
                        <Link href={ROUTES.QUOTES.DETAIL.replace('[id]', quote.id)} className="text-sm font-medium text-primary hover:underline">
                          {quote.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-secondary">{quote.property}</td>
                      <td className="px-4 py-3 text-sm text-foreground-secondary">{quote.systemSize}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{quote.value}</td>
                      <td className="px-4 py-3">
                        <Badge variant={quote.status === 'sent' ? 'info' : 'muted'}>
                          {quote.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="size-icon-xl text-foreground-tertiary mx-auto mb-3" />
              <p className="text-sm text-foreground-secondary">No documents uploaded yet</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="size-icon-xl text-foreground-tertiary mx-auto mb-3" />
              <p className="text-sm text-foreground-secondary">No active projects</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Timeline
                items={mockActivityData.map(a => ({
                  id: a.id,
                  title: a.title,
                  description: a.description,
                  timestamp: a.timestamp,
                  icon: getActivityIcon(a.type),
                  iconBgClass: getActivityIconClass(a.type).bg,
                  iconTextClass: getActivityIconClass(a.type).text,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
