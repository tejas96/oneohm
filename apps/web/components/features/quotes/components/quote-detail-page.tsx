'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { CheckCircle, Copy, Download, FileText, History, Mail, Phone, Send, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
  DialogDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  showToast,
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

interface QuoteDetailPageProps {
  quoteId: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockQuote = {
  id: 'q1',
  quoteNumber: 'QT-2024-001',
  currentVersion: 2,
  status: QuoteStatus.SENT,
  createdAt: '2024-02-10T10:00:00Z',
  validUntil: '2024-02-25T23:59:59Z',
  customer: {
    id: '1',
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'rajesh@email.com',
  },
  property: {
    id: 'p1',
    name: 'Main Residence',
    address: '456 Green Valley, Kothrud, Pune - 411038',
  },
  system: {
    size: '5 kW',
    type: 'On-Grid',
    phase: 'Single Phase',
    dcr: 'Full DCR',
    panels: 'Waaree 545W x 10',
    inverter: 'Growatt 5kW',
  },
  pricing: {
    basePrice: 225000,
    gst: 31050,
    totalPrice: 256050,
    subsidyAmount: 54000,
    discountAmount: 0,
    effectivePrice: 202050,
  },
  salesPerson: 'Amit Kumar',
  customerNotes: 'Installation will be completed within 15 days of advance payment.',
};

const mockVersions = [
  { version: 2, date: '2024-02-12', changes: 'Updated panel configuration', status: QuoteStatus.SENT },
  { version: 1, date: '2024-02-10', changes: 'Initial quote', status: QuoteStatus.SENT },
];

const mockActivity = [
  { id: '1', title: 'Quote sent', description: 'Sent to customer via email', timestamp: new Date('2024-02-12T10:30:00Z'), icon: <Send className="size-icon-sm" />, iconBgClass: 'bg-info/10', iconTextClass: 'text-info' },
  { id: '2', title: 'Quote revised', description: 'Updated panel configuration', timestamp: new Date('2024-02-12T10:00:00Z'), icon: <History className="size-icon-sm" />, iconBgClass: 'bg-warning/10', iconTextClass: 'text-warning' },
  { id: '3', title: 'Quote created', description: 'Initial quote generated', timestamp: new Date('2024-02-10T10:00:00Z'), icon: <FileText className="size-icon-sm" />, iconBgClass: 'bg-muted', iconTextClass: 'text-foreground-secondary' },
];

// ============================================================================
// Status Badge Mapping
// ============================================================================

const STATUS_VARIANTS: Record<QuoteStatus, 'muted' | 'info' | 'success' | 'warning' | 'error' | 'pending'> = {
  [QuoteStatus.DRAFT]: 'muted',
  [QuoteStatus.SENT]: 'info',
  [QuoteStatus.VIEWED]: 'pending',
  [QuoteStatus.ACCEPTED]: 'success',
  [QuoteStatus.REJECTED]: 'error',
  [QuoteStatus.EXPIRED]: 'warning',
};

// ============================================================================
// Component
// ============================================================================

export function QuoteDetailPage({ quoteId }: QuoteDetailPageProps): React.JSX.Element {
  const _router = useRouter(); // Reserved for navigation
  void _router; // Suppress unused variable warning
  const quote = mockQuote; // TODO: Phase 2 - Fetch by ID

  const [acceptModalOpen, setAcceptModalOpen] = React.useState(false);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [convertModalOpen, setConvertModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const handleAccept = () => {
    console.log('Accept quote:', quoteId);
    showToast.success('Quote accepted');
    setAcceptModalOpen(false);
  };

  const handleReject = () => {
    console.log('Reject quote:', quoteId, rejectionReason);
    showToast.success('Quote marked as rejected');
    setRejectModalOpen(false);
    setRejectionReason('');
  };

  const handleConvertToProject = () => {
    console.log('Convert to project:', quoteId);
    showToast.success('Converting to project...');
    setConvertModalOpen(false);
    // router.push('/projects/new?quoteId=' + quoteId);
  };

  const isExpired = new Date(quote.validUntil) < new Date();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.QUOTES.LIST}>Quotes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{quote.quoteNumber}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{quote.quoteNumber}</h1>
            <Badge variant={STATUS_VARIANTS[quote.status]}>{quote.status}</Badge>
            <Badge variant="muted" size="xs">v{quote.currentVersion}</Badge>
            {isExpired && <Badge variant="warning" size="xs">Expired</Badge>}
          </div>
          <p className="text-sm text-foreground-secondary mt-1">
            Created {new Date(quote.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' • '}Valid until {new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === QuoteStatus.DRAFT && (
            <Button size="sm">
              <Send className="mr-2 size-icon-sm" />
              Send Quote
            </Button>
          )}
          {quote.status === QuoteStatus.SENT && (
            <>
              <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(true)}>
                <XCircle className="mr-2 size-icon-sm" />
                Reject
              </Button>
              <Button size="sm" onClick={() => setAcceptModalOpen(true)}>
                <CheckCircle className="mr-2 size-icon-sm" />
                Accept
              </Button>
            </>
          )}
          {quote.status === QuoteStatus.ACCEPTED && (
            <Button size="sm" onClick={() => setConvertModalOpen(true)}>
              Convert to Project
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="col-span-2 space-y-6">
          {/* Customer & Property */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase mb-2">Customer</p>
                  <Link
                    href={ROUTES.CUSTOMERS.DETAIL.replace('[id]', quote.customer.id)}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {quote.customer.name}
                  </Link>
                  <p className="text-sm text-foreground-secondary">{quote.customer.phone}</p>
                  <p className="text-sm text-foreground-secondary">{quote.customer.email}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase mb-2">Property</p>
                  <Link
                    href={ROUTES.PROPERTIES.DETAIL.replace('[id]', quote.property.id)}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {quote.property.name}
                  </Link>
                  <p className="text-sm text-foreground-secondary">{quote.property.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase">System Size</p>
                  <p className="text-sm font-medium">{quote.system.size}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase">Type</p>
                  <p className="text-sm">{quote.system.type}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase">Phase</p>
                  <p className="text-sm">{quote.system.phase}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase">DCR</p>
                  <p className="text-sm">{quote.system.dcr}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase">Panels</p>
                  <p className="text-sm">{quote.system.panels}</p>
                </div>
                <div>
                  <p className="text-2xs text-foreground-secondary uppercase">Inverter</p>
                  <p className="text-sm">{quote.system.inverter}</p>
                </div>
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
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">Base Price</span>
                  <span className="text-sm">₹{quote.pricing.basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">GST (13.8%)</span>
                  <span className="text-sm">₹{quote.pricing.gst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-border-light pt-2">
                  <span className="text-sm font-medium">Total Price</span>
                  <span className="text-sm font-medium">₹{quote.pricing.totalPrice.toLocaleString()}</span>
                </div>
                {quote.pricing.subsidyAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span className="text-sm">Subsidy (PM Surya Ghar)</span>
                    <span className="text-sm">-₹{quote.pricing.subsidyAmount.toLocaleString()}</span>
                  </div>
                )}
                {quote.pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span className="text-sm">Discount</span>
                    <span className="text-sm">-₹{quote.pricing.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border-light pt-2">
                  <span className="text-sm font-semibold">Effective Price</span>
                  <span className="text-lg font-semibold text-primary">
                    ₹{quote.pricing.effectivePrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="versions">
            <TabsList>
              <TabsTrigger value="versions" className="gap-2">
                <History className="size-icon-sm" />
                Versions
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <FileText className="size-icon-sm" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="versions" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-background-secondary border-b border-border-light">
                      <tr>
                        <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Version</th>
                        <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Changes</th>
                        <th className="px-4 py-3 text-left text-2xs font-semibold text-foreground-secondary uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-2xs font-semibold text-foreground-secondary uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {mockVersions.map(version => (
                        <tr key={version.version} className="hover:bg-muted">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium">v{version.version}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground-secondary">{version.date}</td>
                          <td className="px-4 py-3 text-sm text-foreground-secondary">{version.changes}</td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_VARIANTS[version.status]} size="xs">
                              {version.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm">
                              <Download className="size-icon-sm" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <Timeline items={mockActivity} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Sidebar */}
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
                Send Email
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="mr-2 size-icon-sm" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Copy className="mr-2 size-icon-sm" />
                Duplicate Quote
              </Button>
            </CardContent>
          </Card>

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

          {/* Sales Person */}
          <Card variant="minimal">
            <CardContent className="p-4">
              <p className="text-2xs text-foreground-secondary uppercase mb-1">Sales Person</p>
              <p className="text-sm font-medium">{quote.salesPerson}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accept Modal */}
      <Dialog open={acceptModalOpen} onOpenChange={setAcceptModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Quote</DialogTitle>
            <DialogDescription>
              Confirm that the customer has accepted this quote.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-foreground-secondary">
              This will mark quote <span className="font-medium text-foreground">{quote.quoteNumber}</span> as accepted.
              You can then convert it to a project.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAccept}>Confirm Acceptance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Project Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Project</DialogTitle>
            <DialogDescription>
              Create a new project from this accepted quote.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="size-icon-sm text-warning" />
                <span className="text-sm font-medium">This action will:</span>
              </div>
              <ul className="text-sm text-foreground-secondary space-y-1 ml-6 list-disc">
                <li>Create a new project with quote details</li>
                <li>Link the quote to the project</li>
                <li>Mark the property as "In Progress"</li>
              </ul>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConvertToProject}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
