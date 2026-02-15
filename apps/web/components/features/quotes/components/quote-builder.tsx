'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ConnectionType,
  PhaseType,
  DcrPreference,
  SystemType,
} from '@oneohm-epc/shared-types';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { createQuoteSchema, type CreateQuoteFormData } from '../schemas/quote.schema';

import { CustomerSearchCombobox, PropertySelector, CollapsibleStepCard, RadioCard, RadioCardGroup } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  showToast,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Badge,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';


// ============================================================================
// Types
// ============================================================================

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Property {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  propertyType: string;
  sanctionedLoad?: number;
  connectionType?: ConnectionType;
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_OPTIONS = [
  { value: PhaseType.SINGLE_PHASE, title: 'Single Phase', description: 'Up to 5 kW' },
  { value: PhaseType.THREE_PHASE, title: 'Three Phase', description: 'Above 5 kW' },
];

const DCR_OPTIONS = [
  { value: DcrPreference.DCR_ONLY, title: 'DCR Only', description: 'Max subsidy' },
  { value: DcrPreference.NON_DCR_ONLY, title: 'Non-DCR', description: 'Lower cost' },
  { value: DcrPreference.AUTO_SPLIT, title: 'Auto Split', description: 'Balanced' },
];

const SYSTEM_TYPE_OPTIONS = [
  { value: SystemType.ON_GRID, title: 'On-Grid' },
  { value: SystemType.OFF_GRID, title: 'Off-Grid' },
  { value: SystemType.HYBRID, title: 'Hybrid' },
];

// ============================================================================
// Mock Data
// ============================================================================

const mockProperties: Property[] = [
  { id: 'p1', propertyName: 'Main Residence', address: '456 Green Valley', city: 'Pune', propertyType: 'Residential', sanctionedLoad: 5, connectionType: ConnectionType.SINGLE_PHASE },
  { id: 'p2', propertyName: 'Office Building', address: '789 Business Park', city: 'Pune', propertyType: 'Commercial', sanctionedLoad: 10, connectionType: ConnectionType.THREE_PHASE },
];

const mockCustomers: Customer[] = [
  { id: '1', firstName: 'Rajesh', lastName: 'Sharma', phone: '+91 98765 43210', email: 'rajesh@example.com' },
  { id: '2', firstName: 'Priya', lastName: 'Patel', phone: '+91 87654 32109', email: 'priya@example.com' },
];

const mockProducts = [
  { id: 'panel1', name: 'Waaree 545W', price: 25000, type: 'panel' },
  { id: 'panel2', name: 'Adani 540W', price: 24000, type: 'panel' },
  { id: 'inv1', name: 'Growatt 5kW', price: 45000, type: 'inverter' },
  { id: 'inv2', name: 'Sungrow 5kW', price: 48000, type: 'inverter' },
];

// ============================================================================
// Component
// ============================================================================

export function QuoteBuilder(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get('propertyId');

  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [expandedStep, setExpandedStep] = React.useState<number>(1);
  const [quoteSummary, setQuoteSummary] = React.useState({
    systemSize: 0,
    panelCount: 0,
    basePrice: 0,
    gst: 0,
    subsidy: 0,
    effectivePrice: 0,
  });

  const form = useForm<CreateQuoteFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createQuoteSchema) as any,
    defaultValues: {
      propertyId: preselectedPropertyId || '',
      systemSizeKw: undefined,
      systemType: SystemType.ON_GRID,
      phaseType: undefined,
      dcrPreference: DcrPreference.DCR_ONLY,
      panelId: '',
      inverterId: '',
      floorNumber: 0,
      distanceKm: undefined,
      discountAmount: 0,
      internalNotes: '',
      customerNotes: '',
    },
  });

  // Watch system size to calculate summary
  const systemSize = form.watch('systemSizeKw');
  const dcrPreference = form.watch('dcrPreference');

  React.useEffect(() => {
    if (systemSize) {
      // Mock calculation - Phase 2 will use real API
      const panelWattage = 545;
      const panelCount = Math.ceil((systemSize * 1000) / panelWattage);
      const pricePerWatt = 45; // Rs per watt
      const basePrice = systemSize * 1000 * pricePerWatt;
      const gst = basePrice * 0.138; // 13.8% GST
      
      // Subsidy calculation (simplified)
      let subsidy = 0;
      if (dcrPreference === DcrPreference.DCR_ONLY) {
        if (systemSize <= 3) {
          subsidy = 18000 * systemSize;
        } else if (systemSize <= 10) {
          subsidy = (18000 * 3) + (9000 * (systemSize - 3));
        }
      }

      setQuoteSummary({
        systemSize,
        panelCount,
        basePrice,
        gst,
        subsidy,
        effectivePrice: basePrice + gst - subsidy,
      });
    }
  }, [systemSize, dcrPreference]);

  // When customer is selected, load their properties
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setProperties(mockProperties);
    } else {
      setProperties([]);
    }
    form.setValue('propertyId', '');
  };

  const handleStepComplete = (step: number) => {
    setExpandedStep(step + 1);
  };

  const onSubmit = (data: CreateQuoteFormData) => {
    // TODO: Phase 2 - API call
    console.log('Create quote:', data);
    showToast.success('Quote created successfully');
    router.push(ROUTES.QUOTES.LIST);
  };

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
            <BreadcrumbPage>New Quote</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Split Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="col-span-2 space-y-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1: Customer & Property */}
            <CollapsibleStepCard
              stepNumber={1}
              title="Customer & Property"
              status={expandedStep === 1 ? 'active' : form.watch('propertyId') ? 'completed' : 'pending'}
              isExpanded={expandedStep === 1}
              onToggle={() => setExpandedStep(expandedStep === 1 ? 0 : 1)}
            >
              {!preselectedPropertyId && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <CustomerSearchCombobox
                      customers={mockCustomers}
                      value={selectedCustomer}
                      onSelect={handleCustomerSelect}
                      placeholder="Search customer..."
                    />
                  </div>

                  {properties.length > 0 && (
                    <div className="space-y-2">
                      <Label>Property *</Label>
                      <PropertySelector
                        properties={properties as any}
                        value={form.watch('propertyId')}
                        onSelect={(v: string) => {
                          form.setValue('propertyId', v);
                          // Auto-fill from property
                          const prop = properties.find(p => p.id === v);
                          if (prop?.sanctionedLoad) {
                            form.setValue('systemSizeKw', prop.sanctionedLoad);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {form.watch('propertyId') && (
                <div className="flex justify-end mt-4">
                  <Button type="button" size="sm" onClick={() => handleStepComplete(1)}>
                    Continue
                  </Button>
                </div>
              )}
            </CollapsibleStepCard>

            {/* Step 2: System Configuration */}
            <CollapsibleStepCard
              stepNumber={2}
              title="System Configuration"
              status={expandedStep === 2 ? 'active' : (form.watch('systemSizeKw') && form.watch('phaseType')) ? 'completed' : 'pending'}
              isExpanded={expandedStep === 2}
              onToggle={() => setExpandedStep(expandedStep === 2 ? 0 : 2)}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="systemSizeKw">System Size (kW) *</Label>
                    <Input
                      id="systemSizeKw"
                      type="number"
                      step="0.5"
                      min="1"
                      max="100"
                      {...form.register('systemSizeKw', { valueAsNumber: true })}
                      error={form.formState.errors.systemSizeKw?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>System Type *</Label>
                    <Select
                      value={form.watch('systemType')}
                      onValueChange={(v) => form.setValue('systemType', v as SystemType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYSTEM_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phase Type *</Label>
                  <RadioCardGroup
                    value={form.watch('phaseType')}
                    onValueChange={(v) => form.setValue('phaseType', v as PhaseType)}
                    orientation="horizontal"
                  >
                    {PHASE_OPTIONS.map(opt => (
                      <RadioCard
                        key={opt.value}
                        value={opt.value}
                        title={opt.title}
                        description={opt.description}
                      />
                    ))}
                  </RadioCardGroup>
                </div>

                <div className="space-y-2">
                  <Label>DCR Preference *</Label>
                  <RadioCardGroup
                    value={form.watch('dcrPreference')}
                    onValueChange={(v) => form.setValue('dcrPreference', v as DcrPreference)}
                    orientation="horizontal"
                  >
                    {DCR_OPTIONS.map(opt => (
                      <RadioCard
                        key={opt.value}
                        value={opt.value}
                        title={opt.title}
                        description={opt.description}
                      />
                    ))}
                  </RadioCardGroup>
                </div>

                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={() => handleStepComplete(2)}>
                    Continue
                  </Button>
                </div>
              </div>
            </CollapsibleStepCard>

            {/* Step 3: Products */}
            <CollapsibleStepCard
              stepNumber={3}
              title="Select Products"
              status={expandedStep === 3 ? 'active' : (form.watch('panelId') && form.watch('inverterId')) ? 'completed' : 'pending'}
              isExpanded={expandedStep === 3}
              onToggle={() => setExpandedStep(expandedStep === 3 ? 0 : 3)}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Solar Panel *</Label>
                  <Select
                    value={form.watch('panelId')}
                    onValueChange={(v) => form.setValue('panelId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select panel" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProducts.filter(p => p.type === 'panel').map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ₹{product.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Inverter *</Label>
                  <Select
                    value={form.watch('inverterId')}
                    onValueChange={(v) => form.setValue('inverterId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inverter" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProducts.filter(p => p.type === 'inverter').map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ₹{product.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={() => handleStepComplete(3)}>
                    Continue
                  </Button>
                </div>
              </div>
            </CollapsibleStepCard>

            {/* Step 4: Installation Details */}
            <CollapsibleStepCard
              stepNumber={4}
              title="Installation Details"
              status={expandedStep === 4 ? 'active' : 'completed'}
              isExpanded={expandedStep === 4}
              onToggle={() => setExpandedStep(expandedStep === 4 ? 0 : 4)}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="floorNumber">Floor Number</Label>
                    <Input
                      id="floorNumber"
                      type="number"
                      min="0"
                      {...form.register('floorNumber', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="distanceKm">Distance from Office (km)</Label>
                    <Input
                      id="distanceKm"
                      type="number"
                      step="0.5"
                      {...form.register('distanceKm', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={() => handleStepComplete(4)}>
                    Continue
                  </Button>
                </div>
              </div>
            </CollapsibleStepCard>

            {/* Step 5: Notes & Discount */}
            <CollapsibleStepCard
              stepNumber={5}
              title="Notes & Discount"
              status={expandedStep === 5 ? 'active' : 'completed'}
              isExpanded={expandedStep === 5}
              onToggle={() => setExpandedStep(expandedStep === 5 ? 0 : 5)}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discountAmount">Discount Amount (₹)</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    {...form.register('discountAmount', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerNotes">Notes for Customer</Label>
                  <Textarea
                    id="customerNotes"
                    placeholder="These notes will be visible on the quote..."
                    {...form.register('customerNotes')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Internal Notes</Label>
                  <Textarea
                    id="internalNotes"
                    placeholder="Internal notes (not visible to customer)..."
                    {...form.register('internalNotes')}
                  />
                </div>
              </div>
            </CollapsibleStepCard>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(ROUTES.QUOTES.LIST)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Generate Quote'}
              </Button>
            </div>
          </form>
        </div>

        {/* Right: Live Summary */}
        <div className="col-span-1">
          <Card className="sticky top-6 overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Quote Summary</h3>
            </div>
            
            <CardContent className="p-4 space-y-5">
              {/* Visual Solar Panel Grid */}
              {quoteSummary.panelCount > 0 && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                      Panel Layout
                    </span>
                    <Badge variant="default" size="xs">{quoteSummary.panelCount} panels</Badge>
                  </div>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(Math.ceil(Math.sqrt(quoteSummary.panelCount)), 5)}, 1fr)` }}>
                    {Array.from({ length: Math.min(quoteSummary.panelCount, 20) }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[2/3] bg-gradient-to-br from-primary/80 to-primary rounded-sm flex items-center justify-center"
                      >
                        <div className="w-full h-[1px] bg-white/30" />
                      </div>
                    ))}
                    {quoteSummary.panelCount > 20 && (
                      <div className="aspect-[2/3] bg-muted rounded-sm flex items-center justify-center text-foreground-tertiary text-[10px]">
                        +{quoteSummary.panelCount - 20}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* System Info Card */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground-secondary">System Size</span>
                  <span className="text-xl font-semibold text-foreground">{quoteSummary.systemSize || '-'} kW</span>
                </div>
                <p className="text-[10px] text-foreground-tertiary">
                  {quoteSummary.panelCount} × 545W panels • Annual Generation ~{(quoteSummary.systemSize * 1400).toLocaleString()} units
                </p>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                  Price Breakdown
                </p>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-foreground-secondary">Equipment Cost</span>
                  <span className="text-sm font-medium">₹{quoteSummary.basePrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-foreground-secondary">GST (13.8%)</span>
                  <span className="text-sm">₹{quoteSummary.gst.toLocaleString()}</span>
                </div>
                
                {/* Total before subsidy */}
                <div className="flex items-center justify-between pt-1.5 border-t border-border-light">
                  <span className="text-sm text-foreground-secondary">Total Price</span>
                  <span className="text-sm font-medium">₹{(quoteSummary.basePrice + quoteSummary.gst).toLocaleString()}</span>
                </div>
                
                {/* Subsidy Section */}
                {quoteSummary.subsidy > 0 && (
                  <div className="flex items-center justify-between py-1.5 text-success">
                    <div className="flex items-center gap-1.5">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">PM Surya Ghar Subsidy</span>
                    </div>
                    <span className="text-sm font-medium">−₹{quoteSummary.subsidy.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Effective Price - highlighted */}
                <div className="p-3 bg-primary/10 rounded-lg mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">You Pay</span>
                    <span className="text-2xl font-semibold text-primary">
                      ₹{quoteSummary.effectivePrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-foreground-tertiary">Price per watt</span>
                    <span className="text-xs font-medium text-foreground-secondary">
                      ₹{quoteSummary.systemSize > 0 ? ((quoteSummary.effectivePrice / (quoteSummary.systemSize * 1000))).toFixed(2) : '0.00'}/Wp
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings Highlight */}
              {quoteSummary.subsidy > 0 && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-success/20 flex items-center justify-center">
                      <svg className="size-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-success">You're saving ₹{quoteSummary.subsidy.toLocaleString()}</p>
                      <p className="text-[10px] text-foreground-secondary">via PM Surya Ghar Yojana subsidy</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ROI Estimate */}
              {quoteSummary.systemSize > 0 && (
                <div className="pt-3 border-t border-border-light">
                  <p className="text-xs font-medium text-foreground-secondary uppercase tracking-wide mb-2">
                    Estimated Returns
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <p className="text-lg font-semibold text-foreground">{Math.ceil(quoteSummary.effectivePrice / (quoteSummary.systemSize * 1400 * 8) * 12)} yrs</p>
                      <p className="text-[10px] text-foreground-tertiary">Payback Period</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <p className="text-lg font-semibold text-success">₹{(quoteSummary.systemSize * 1400 * 8).toLocaleString()}</p>
                      <p className="text-[10px] text-foreground-tertiary">Annual Savings</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
