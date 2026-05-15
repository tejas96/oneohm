'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { VendorStatus, VendorType } from '@oneohm-epc/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { VENDOR_TYPE_LABEL } from '../constants';

import { Alert } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
  MUITypography,
} from '@/components/ui';
import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { createResourceKeys } from '@/lib/hooks/core';
import { useOrgContext } from '@/lib/hooks/core/use-org-context';
import { type Vendor, useVendorMutations } from '@/lib/hooks/resources/vendors';
import { getErrorMessage } from '@/lib/utils';

function trimToOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

const vendorFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    code: z.string().min(1, 'Code is required').max(50),
    vendorType: z.nativeEnum(VendorType),
    status: z.nativeEnum(VendorStatus),
    contactPerson: z.string().max(255),
    email: z.string().max(255),
    phone: z.string().max(20),
    alternatePhone: z.string().max(20),
    address: z.string().max(500),
    city: z.string().max(100),
    state: z.string().max(100),
    country: z.string().max(100),
    pincode: z.string().max(10),
    gstin: z.string().max(15),
    pan: z.string().max(10),
    paymentTerms: z.string().max(500),
    creditDays: z.union([z.string(), z.number()]).optional(),
    bankName: z.string().max(255),
    accountNumber: z.string().max(50),
    ifscCode: z.string().max(20),
    rating: z.union([z.string(), z.number()]).optional(),
    notes: z.string().max(2000),
  })
  .superRefine((data, ctx) => {
    const pin = data.pincode.trim();
    if (pin.length > 0) {
      if (!/^\d+$/.test(pin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PIN code must contain only digits',
          path: ['pincode'],
        });
      } else if (pin.length < 6 || pin.length > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PIN must be 6–10 digits',
          path: ['pincode'],
        });
      }
    }
    const ph = data.phone.trim();
    if (ph.length > 0) {
      if (ph.length < 10 || ph.length > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone must be 10–20 characters',
          path: ['phone'],
        });
      } else if (!/^\+?[\d\s\-()]+$/.test(ph)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone must contain only numbers, spaces, and +()-',
          path: ['phone'],
        });
      }
    }
    const altPh = data.alternatePhone.trim();
    if (altPh.length > 0) {
      if (altPh.length < 10 || altPh.length > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Alternate phone must be 10–20 characters',
          path: ['alternatePhone'],
        });
      } else if (!/^\+?[\d\s\-()]+$/.test(altPh)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Alternate phone must contain only numbers, spaces, and +()-',
          path: ['alternatePhone'],
        });
      }
    }
    const em = data.email.trim();
    if (em.length > 0 && !z.string().email().safeParse(em).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid email address',
        path: ['email'],
      });
    }
    const gst = data.gstin.trim();
    if (gst.length > 0) {
      const gstUpper = gst.toUpperCase();
      if (gst.length !== 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GSTIN must be 15 characters',
          path: ['gstin'],
        });
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(gstUpper)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid GSTIN format (e.g., 22AAAAA0000A1Z5)',
          path: ['gstin'],
        });
      }
    }
    const panVal = data.pan.trim();
    if (panVal.length > 0) {
      const panUpper = panVal.toUpperCase();
      if (panVal.length !== 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PAN must be 10 characters',
          path: ['pan'],
        });
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpper)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid PAN format (e.g., ABCDE1234F)',
          path: ['pan'],
        });
      }
    }
    const creditRaw = data.creditDays;
    if (creditRaw !== undefined && creditRaw !== '') {
      const creditNum = Number(creditRaw);
      if (!Number.isFinite(creditNum) || creditNum < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Credit days must be a non-negative number',
          path: ['creditDays'],
        });
      }
    }
    const ratingRaw = data.rating;
    if (ratingRaw !== undefined && ratingRaw !== '') {
      const ratingNum = Number(ratingRaw);
      if (!Number.isFinite(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rating must be between 0 and 5',
          path: ['rating'],
        });
      }
    }
    const ifsc = data.ifscCode.trim();
    if (ifsc.length > 0) {
      if (ifsc.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'IFSC code must be 11 characters',
          path: ['ifscCode'],
        });
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid IFSC code format (e.g., SBIN0001234)',
          path: ['ifscCode'],
        });
      }
    }
  });

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

const VENDOR_TYPE_OPTIONS = Object.entries(VENDOR_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const VENDOR_STATUS_OPTIONS = [
  { value: VendorStatus.ACTIVE, label: 'Active' },
  { value: VendorStatus.INACTIVE, label: 'Inactive' },
  { value: VendorStatus.BLACKLISTED, label: 'Blacklisted' },
];

function getDefaultValues(vendor?: Vendor): VendorFormValues {
  return {
    name: vendor?.name ?? '',
    code: vendor?.code ?? '',
    vendorType: (vendor?.vendorType as VendorType) ?? VendorType.SUPPLIER,
    status: (vendor?.status as VendorStatus) ?? VendorStatus.ACTIVE,
    contactPerson: vendor?.contactPerson ?? '',
    email: vendor?.email ?? '',
    phone: vendor?.phone ?? '',
    alternatePhone: vendor?.alternatePhone ?? '',
    address: vendor?.address ?? '',
    city: vendor?.city ?? '',
    state: vendor?.state ?? '',
    country: vendor?.country ?? 'India',
    pincode: vendor?.pincode ?? '',
    gstin: vendor?.gstin ?? '',
    pan: vendor?.pan ?? '',
    paymentTerms: vendor?.paymentTerms ?? '',
    creditDays: vendor?.creditDays ?? '',
    bankName: vendor?.bankName ?? '',
    accountNumber: vendor?.accountNumber ?? '',
    ifscCode: vendor?.ifscCode ?? '',
    rating: vendor?.rating ?? '',
    notes: vendor?.notes ?? '',
  };
}

export interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
}: VendorFormDialogProps): React.JSX.Element {
  const { create, update } = useVendorMutations();
  const queryClient = useQueryClient();
  const { organizationId, orgHeaders } = useOrgContext();
  const vendorKeys = useMemo(() => createResourceKeys('vendors'), []);

  // Custom mutation for status change with proper cache invalidation
  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VendorStatus }) => {
      const { data } = await apiClient.patch<Vendor>(
        `/vendors/${id}/status`,
        { status },
        { headers: orgHeaders },
      );
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all vendor queries to refresh lists and details
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all(organizationId) });

      // Optimistically update the detail cache
      queryClient.setQueryData<Vendor>(vendorKeys.detail(organizationId, variables.id), (prev) =>
        prev ? { ...prev, status: variables.status } : data,
      );

      showToast.success('Vendor status updated');
    },
    onError: (error: unknown) => {
      showToast.error(getErrorMessage(error));
    },
  });

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: getDefaultValues(vendor),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(vendor));
    }
  }, [open, vendor, form]);

  const handleClose = (): void => {
    onOpenChange(false);
  };

  const onSubmit = form.handleSubmit(async (raw) => {
    try {
      const creditRaw = raw.creditDays;
      const creditParsed =
        creditRaw === '' || creditRaw === undefined ? undefined : Number(creditRaw);
      const creditDays =
        creditParsed === undefined || !Number.isFinite(creditParsed)
          ? undefined
          : Math.max(0, Math.floor(creditParsed));

      const ratingRaw = raw.rating;
      const ratingParsed =
        ratingRaw === '' || ratingRaw === undefined ? undefined : Number(ratingRaw);
      const rating =
        ratingParsed === undefined || !Number.isFinite(ratingParsed)
          ? undefined
          : Math.min(5, Math.max(0, ratingParsed));

      const data = {
        name: raw.name.trim(),
        code: raw.code.trim(),
        vendorType: raw.vendorType,
        contactPerson: trimToOptional(raw.contactPerson),
        email: trimToOptional(raw.email),
        phone: trimToOptional(raw.phone),
        alternatePhone: trimToOptional(raw.alternatePhone),
        address: trimToOptional(raw.address),
        city: trimToOptional(raw.city),
        state: trimToOptional(raw.state),
        country: trimToOptional(raw.country),
        pincode: trimToOptional(raw.pincode),
        gstin: trimToOptional(raw.gstin),
        pan: trimToOptional(raw.pan),
        paymentTerms: trimToOptional(raw.paymentTerms),
        creditDays,
        bankName: trimToOptional(raw.bankName),
        accountNumber: trimToOptional(raw.accountNumber),
        ifscCode: trimToOptional(raw.ifscCode),
        rating,
        notes: trimToOptional(raw.notes),
        status: raw.status,
      };

      const { status, ...rest } = data;

      if (vendor) {
        await update.mutateAsync({ id: vendor.id, data: rest });

        // If status changed, update it via the dedicated status endpoint
        if (vendor.status !== status) {
          await changeStatus.mutateAsync({ id: vendor.id, status });
        }
      } else {
        await create.mutateAsync({ ...rest, status });
      }

      handleClose();
    } catch (error) {
      // Error is already displayed via mutation error handling
      // Just prevent the dialog from closing
    }
  });

  const isPending = create.isPending || update.isPending || changeStatus.isPending;
  const mutationError = create.error ?? update.error ?? changeStatus.error;

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="xl">
      <MUIDialogHeader>
        <MUIDialogTitle>{vendor ? 'Edit vendor' : 'New vendor'}</MUIDialogTitle>
        <MUIDialogDescription>
          {vendor
            ? 'Update vendor information, contact details, and payment terms.'
            : 'Add a new supplier or contractor to your vendor registry.'}
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void onSubmit(event)}>
        <MUIDialogBody>
          <div className="flex flex-col gap-4">
            {mutationError ? (
              <Alert variant="error" appearance="minimal">
                {getErrorMessage(mutationError)}
              </Alert>
            ) : null}

            <Card>
              <CardContent className="p-5">
                <MUITypography variant="sectionTitle" sx={{ mb: 3 }}>
                  Basic Information
                </MUITypography>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MUIInput
                    id="vendor-name"
                    fieldLabel="Vendor name"
                    placeholder="Enter vendor name"
                    required
                    error={form.formState.errors.name?.message}
                    {...form.register('name')}
                  />
                  <MUIInput
                    id="vendor-code"
                    fieldLabel="Vendor code"
                    placeholder="e.g., VEN-001"
                    required
                    error={form.formState.errors.code?.message}
                    {...form.register('code')}
                  />
                  <Controller
                    name="vendorType"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Vendor type"
                        placeholder="Select vendor type"
                        required
                        error={form.formState.errors.vendorType?.message}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={VENDOR_TYPE_OPTIONS}
                      />
                    )}
                  />
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Status"
                        placeholder="Select status"
                        required
                        error={form.formState.errors.status?.message}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={VENDOR_STATUS_OPTIONS}
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <MUITypography variant="sectionTitle" sx={{ mb: 3 }}>
                  Contact Information
                </MUITypography>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MUIInput
                    id="vendor-contact-person"
                    fieldLabel="Contact person"
                    placeholder="Full name"
                    error={form.formState.errors.contactPerson?.message}
                    {...form.register('contactPerson')}
                  />
                  <MUIInput
                    id="vendor-email"
                    fieldLabel="Email"
                    type="email"
                    placeholder="vendor@example.com"
                    error={form.formState.errors.email?.message}
                    {...form.register('email')}
                  />
                  <MUIInput
                    id="vendor-phone"
                    fieldLabel="Phone"
                    placeholder="+91 98765 43210"
                    error={form.formState.errors.phone?.message}
                    {...form.register('phone')}
                  />
                  <MUIInput
                    id="vendor-alternate-phone"
                    fieldLabel="Alternate phone"
                    placeholder="+91 98765 43210"
                    error={form.formState.errors.alternatePhone?.message}
                    {...form.register('alternatePhone')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <MUITypography variant="sectionTitle" sx={{ mb: 3 }}>
                  Address
                </MUITypography>
                <div className="flex flex-col gap-4">
                  <MUIInput
                    id="vendor-address"
                    fieldLabel="Street address"
                    placeholder="Building name, street, area"
                    error={form.formState.errors.address?.message}
                    {...form.register('address')}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MUIInput
                      id="vendor-city"
                      fieldLabel="City"
                      placeholder="City name"
                      error={form.formState.errors.city?.message}
                      {...form.register('city')}
                    />
                    <MUIInput
                      id="vendor-state"
                      fieldLabel="State"
                      placeholder="State name"
                      error={form.formState.errors.state?.message}
                      {...form.register('state')}
                    />
                    <MUIInput
                      id="vendor-pincode"
                      fieldLabel="PIN code"
                      placeholder="6-digit PIN"
                      error={form.formState.errors.pincode?.message}
                      {...form.register('pincode')}
                    />
                    <MUIInput
                      id="vendor-country"
                      fieldLabel="Country"
                      placeholder="Country name"
                      error={form.formState.errors.country?.message}
                      {...form.register('country')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <MUITypography variant="sectionTitle" sx={{ mb: 3 }}>
                  Tax Information
                </MUITypography>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MUIInput
                    id="vendor-gstin"
                    fieldLabel="GSTIN"
                    placeholder="22AAAAA0000A1Z5"
                    error={form.formState.errors.gstin?.message}
                    {...form.register('gstin')}
                  />
                  <MUIInput
                    id="vendor-pan"
                    fieldLabel="PAN"
                    placeholder="ABCDE1234F"
                    error={form.formState.errors.pan?.message}
                    {...form.register('pan')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <MUITypography variant="sectionTitle" sx={{ mb: 3 }}>
                  Payment Terms
                </MUITypography>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MUIInput
                    id="vendor-payment-terms"
                    fieldLabel="Payment terms"
                    placeholder="e.g., Net 30, Advance payment"
                    error={form.formState.errors.paymentTerms?.message}
                    {...form.register('paymentTerms')}
                  />
                  <Controller
                    name="creditDays"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <MUIInput
                        id="vendor-credit-days"
                        fieldLabel="Credit days"
                        type="number"
                        placeholder="Number of days"
                        inputProps={{ min: 0, step: 1 }}
                        value={field.value === undefined || field.value === '' ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <MUITypography variant="sectionTitle" sx={{ mb: 3 }}>
                  Bank Details
                </MUITypography>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MUIInput
                    id="vendor-bank-name"
                    fieldLabel="Bank name"
                    placeholder="e.g., State Bank of India"
                    error={form.formState.errors.bankName?.message}
                    {...form.register('bankName')}
                  />
                  <MUIInput
                    id="vendor-ifsc-code"
                    fieldLabel="IFSC code"
                    placeholder="e.g., SBIN0001234"
                    error={form.formState.errors.ifscCode?.message}
                    {...form.register('ifscCode')}
                  />
                  <div className="sm:col-span-2">
                    <MUIInput
                      id="vendor-account-number"
                      fieldLabel="Account number"
                      placeholder="Bank account number"
                      error={form.formState.errors.accountNumber?.message}
                      {...form.register('accountNumber')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <MUITypography variant="sectionTitle" sx={{ mb: 3 }}>
                  Additional Details
                </MUITypography>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Controller
                    name="rating"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <MUIInput
                        id="vendor-rating"
                        fieldLabel="Vendor rating"
                        type="number"
                        placeholder="0 to 5"
                        inputProps={{ min: 0, max: 5, step: 0.1 }}
                        value={field.value === undefined || field.value === '' ? '' : field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </div>
                <div className="mt-4">
                  <MUIInput
                    id="vendor-notes"
                    fieldLabel="Notes"
                    placeholder="Additional information or special instructions"
                    multiline
                    minRows={3}
                    error={form.formState.errors.notes?.message}
                    {...form.register('notes')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={isPending}>
            {vendor ? 'Save changes' : 'Create vendor'}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
