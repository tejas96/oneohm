'use client';

import { SiteVisitStatus, VisitType } from '@oneohm-epc/shared-types';
import {
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  User,
  Zap,
  Phone,
  Mail,
  Bell,
  PlayCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Timeline } from '@/components/shared';
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
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

interface SiteVisitReportProps {
  visitId: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockVisit = {
  id: 'sv1',
  propertyId: 'p1',
  propertyName: 'Main Residence',
  customerName: 'Rajesh Sharma',
  customerPhone: '+91 98765 43210',
  customerEmail: 'rajesh@email.com',
  technicianName: 'Amit Kumar',
  visitType: VisitType.INSPECTION,
  status: SiteVisitStatus.COMPLETED,
  scheduledAt: '2024-02-12T10:00:00Z',
  completedAt: '2024-02-12T12:30:00Z',
  address: '456 Green Valley, Kothrud, Pune - 411038',
  duration: '2h 30m',
  // Site Assessment
  roofType: 'RCC Flat',
  roofArea: '500 sq.ft',
  roofCondition: 'Good',
  shadingIssues: 'Minimal - nearby tree on east side',
  orientation: 'South-facing',
  tiltAngle: 'Optimal (15°)',
  // Electrical
  existingLoad: '5 kW',
  meterLocation: 'Ground floor',
  wiringCondition: 'Good',
  earthingStatus: 'Present and adequate',
  // Recommendations
  recommendedSystem: '5 kW On-grid',
  estimatedGeneration: '20-22 units/day',
  specialConsiderations: 'Tree trimming recommended for optimal performance',
  // Photos
  photos: [
    { id: '1', category: 'Roof', url: '/placeholder-roof.jpg' },
    { id: '2', category: 'Meter', url: '/placeholder-meter.jpg' },
    { id: '3', category: 'Earthing', url: '/placeholder-earthing.jpg' },
  ],
  // Notes
  fieldNotes:
    'Customer is very interested in going solar. Discussed financing options. Roof is in excellent condition with good sun exposure. Minor tree trimming needed on the east side.',
};

const mockTimeline = [
  {
    id: '1',
    title: 'Visit Scheduled',
    description: 'Visit scheduled for Feb 12, 2024',
    timestamp: new Date('2024-02-10T09:00:00Z'),
    icon: <Calendar className="size-icon-sm" />,
    iconBgClass: 'bg-info/10',
    iconTextClass: 'text-info',
  },
  {
    id: '2',
    title: 'Reminder Sent',
    description: 'SMS reminder sent to customer',
    timestamp: new Date('2024-02-11T10:00:00Z'),
    icon: <Bell className="size-icon-sm" />,
    iconBgClass: 'bg-warning/10',
    iconTextClass: 'text-warning',
  },
  {
    id: '3',
    title: 'Visit Started',
    description: 'Technician arrived at site',
    timestamp: new Date('2024-02-12T10:00:00Z'),
    icon: <PlayCircle className="size-icon-sm" />,
    iconBgClass: 'bg-primary/10',
    iconTextClass: 'text-primary',
  },
  {
    id: '4',
    title: 'Visit Completed',
    description: 'Site assessment completed',
    timestamp: new Date('2024-02-12T12:30:00Z'),
    icon: <CheckCircle className="size-icon-sm" />,
    iconBgClass: 'bg-success/10',
    iconTextClass: 'text-success',
  },
];

// ============================================================================
// Component
// ============================================================================

export function SiteVisitReport({ visitId: _visitId }: SiteVisitReportProps): React.JSX.Element {
  const router = useRouter();
  const visit = mockVisit; // TODO: Phase 2 - Fetch by ID using _visitId

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.SITE_VISITS.LIST}>Site Visits</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{visit.propertyName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{visit.propertyName}</h1>
            <Badge variant="success">{visit.status}</Badge>
          </div>
          <p className="text-sm text-foreground-secondary mt-1">{visit.address}</p>
          <p className="text-sm text-foreground-secondary">
            {visit.customerName} • {visit.technicianName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`${ROUTES.QUOTES.NEW}?propertyId=${visit.propertyId}`)}
          >
            <FileText className="mr-2 size-icon-sm" />
            Create Quote
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card variant="minimal">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="size-icon text-primary" />
              <div>
                <p className="text-2xs text-foreground-secondary">Date</p>
                <p className="text-sm font-medium">
                  {new Date(visit.scheduledAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="minimal">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="size-icon text-warning" />
              <div>
                <p className="text-2xs text-foreground-secondary">Duration</p>
                <p className="text-sm font-medium">{visit.duration}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="minimal">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="size-icon text-info" />
              <div>
                <p className="text-2xs text-foreground-secondary">Technician</p>
                <p className="text-sm font-medium">{visit.technicianName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="minimal">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="size-icon text-success" />
              <div>
                <p className="text-2xs text-foreground-secondary">Recommended</p>
                <p className="text-sm font-medium">{visit.recommendedSystem}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Tabs */}
        <div className="col-span-2">
          <Tabs defaultValue="assessment">
            <TabsList>
              <TabsTrigger value="assessment">Site Assessment</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="assessment" className="mt-4 space-y-4">
              {/* Roof Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Roof Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Type</p>
                      <p className="text-sm">{visit.roofType}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Area</p>
                      <p className="text-sm">{visit.roofArea}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Condition</p>
                      <p className="text-sm">{visit.roofCondition}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Orientation</p>
                      <p className="text-sm">{visit.orientation}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Tilt Angle</p>
                      <p className="text-sm">{visit.tiltAngle}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Shading</p>
                      <p className="text-sm">{visit.shadingIssues}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Electrical Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Electrical Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Existing Load</p>
                      <p className="text-sm">{visit.existingLoad}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Meter Location</p>
                      <p className="text-sm">{visit.meterLocation}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Wiring</p>
                      <p className="text-sm">{visit.wiringCondition}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-secondary uppercase">Earthing</p>
                      <p className="text-sm">{visit.earthingStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-icon-sm text-success" />
                      <span className="text-sm">System: {visit.recommendedSystem}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-icon-sm text-success" />
                      <span className="text-sm">Est. Generation: {visit.estimatedGeneration}</span>
                    </div>
                    {visit.specialConsiderations && (
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm text-warning-foreground">
                          {visit.specialConsiderations}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {visit.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square bg-muted rounded-lg flex items-center justify-center"
                      >
                        <div className="text-center">
                          <Camera className="size-icon-lg text-foreground-tertiary mx-auto mb-2" />
                          <p className="text-xs text-foreground-secondary">{photo.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm leading-relaxed">{visit.fieldNotes}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Quick Actions & Timeline */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Phone className="mr-2 size-icon-sm" />
                Call Customer
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Mail className="mr-2 size-icon-sm" />
                Send Report
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="mr-2 size-icon-sm" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Property Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                <MapPin className="size-icon text-foreground-tertiary" />
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Visit Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={mockTimeline} variant="compact" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
