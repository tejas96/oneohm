'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ConnectionType,
  LeadTemperature,
  PropertyType,
} from '@oneohm-epc/shared-types';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { useProperty, useUpdateProperty } from '../hooks';
import { editPropertySchema, type EditPropertyFormData } from '../schemas';

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
  Switch,
  Textarea,
  showToast,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PropertyEditPageProps {
  propertyId: string;
}

// ============================================================================
// Constants
// ============================================================================

const PROPERTY_TYPE_OPTIONS = [
  { value: PropertyType.RESIDENTIAL, label: 'Residential' },
  { value: PropertyType.RESIDENTIAL_APARTMENT, label: 'Residential Apartment' },
  { value: PropertyType.COMMERCIAL, label: 'Commercial' },
  { value: PropertyType.INDUSTRIAL, label: 'Industrial' },
  { value: PropertyType.AGRICULTURAL, label: 'Agricultural' },
  { value: PropertyType.INSTITUTIONAL, label: 'Institutional' },
];

const CONNECTION_TYPE_OPTIONS = [
  { value: ConnectionType.SINGLE_PHASE, label: 'Single Phase' },
  { value: ConnectionType.THREE_PHASE, label: 'Three Phase' },
];

const TEMPERATURE_OPTIONS = [
  { value: LeadTemperature.HOT, label: 'Hot' },
  { value: LeadTemperature.WARM, label: 'Warm' },
  { value: LeadTemperature.COLD, label: 'Cold' },
];

// ============================================================================
// Component
// ============================================================================

export function PropertyEditPage({ propertyId }: PropertyEditPageProps): JSX.Element {
  const router = useRouter();
  const { data: property, isLoading, isError, error } = useProperty(propertyId);
  const updateProperty = useUpdateProperty();

  const form = useForm<EditPropertyFormData>({
    resolver: zodResolver(editPropertySchema),
    defaultValues: {},
  });

  // Reset form when property data loads
  useEffect(() => {
    if (property) {
      form.reset({
        propertyName: property.propertyName || '',
        propertyType: property.propertyType as PropertyType,
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        pincode: property.pincode || '',
        consumerNumber: property.consumerNumber || '',
        discomName: property.discomName || '',
        connectionType: property.connectionType as ConnectionType | undefined,
        sanctionedLoad: property.sanctionedLoad ?? undefined,
        meterNumber: property.meterNumber || '',
        monthlyBill: property.monthlyBill ?? undefined,
        leadTemperature: property.leadTemperature as LeadTemperature,
        wantsLoan: property.wantsLoan || false,
        notes: property.notes || '',
      });
    }
  }, [property, form]);

  const onSubmit = (data: EditPropertyFormData): void => {
    updateProperty.mutate(
      { id: propertyId, data },
      {
        onSuccess: () => {
          showToast.success('Property updated successfully');
          router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }));
        },
        onError: (err) => {
          showToast.error(getErrorMessage(err));
        },
      },
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-foreground-secondary">Loading property...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !property) {
    return (
      <div className="bg-white rounded-lg border border-error/30 p-6">
        <div className="flex items-center gap-3 text-error">
          <AlertCircle className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load property</p>
            <p className="text-sm text-foreground-secondary mt-1">
              {error ? getErrorMessage(error) : 'Property not found'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId })}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-icon-sm" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Edit Property</h1>
          <p className="text-sm text-foreground-secondary">
            {property.propertyName || 'Unnamed Property'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        {/* Property Details */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
              Property Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyName">Property Name *</Label>
                <Input
                  id="propertyName"
                  {...form.register('propertyName')}
                  error={form.formState.errors.propertyName?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select
                  value={form.watch('propertyType')}
                  onValueChange={(value) =>
                    form.setValue('propertyType', value as PropertyType, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
              Address
            </h2>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...form.register('address')}
                error={form.formState.errors.address?.message}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  error={form.formState.errors.city?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  {...form.register('state')}
                  error={form.formState.errors.state?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  {...form.register('pincode')}
                  error={form.formState.errors.pincode?.message}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Electricity Details */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
              Electricity Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consumerNumber">Consumer Number</Label>
                <Input
                  id="consumerNumber"
                  {...form.register('consumerNumber')}
                  error={form.formState.errors.consumerNumber?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discomName">DISCOM Name</Label>
                <Input
                  id="discomName"
                  {...form.register('discomName')}
                  error={form.formState.errors.discomName?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="connectionType">Connection Type</Label>
                <Select
                  value={form.watch('connectionType')}
                  onValueChange={(value) =>
                    form.setValue('connectionType', value as ConnectionType, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONNECTION_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sanctionedLoad">Sanctioned Load (kW)</Label>
                <Input
                  id="sanctionedLoad"
                  type="number"
                  step="0.1"
                  {...form.register('sanctionedLoad', { valueAsNumber: true })}
                  error={form.formState.errors.sanctionedLoad?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meterNumber">Meter Number</Label>
                <Input
                  id="meterNumber"
                  {...form.register('meterNumber')}
                  error={form.formState.errors.meterNumber?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyBill">Monthly Bill (₹)</Label>
                <Input
                  id="monthlyBill"
                  type="number"
                  {...form.register('monthlyBill', { valueAsNumber: true })}
                  error={form.formState.errors.monthlyBill?.message}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead & Notes */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">
              Lead Status
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadTemperature">Lead Temperature</Label>
                <Select
                  value={form.watch('leadTemperature')}
                  onValueChange={(value) =>
                    form.setValue('leadTemperature', value as LeadTemperature, {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select temperature" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPERATURE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-7">
                <Switch
                  id="wantsLoan"
                  checked={form.watch('wantsLoan') ?? false}
                  onCheckedChange={(checked) =>
                    form.setValue('wantsLoan', checked, { shouldDirty: true })
                  }
                />
                <Label htmlFor="wantsLoan">Wants Loan</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                {...form.register('notes')}
                placeholder="Add notes about this property..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId })}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateProperty.isPending || !form.formState.isDirty}>
            {updateProperty.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
