'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { VendorStatus, VendorType } from '@tejas96/shared/types';
import {
  GSTIN_FORMAT_MESSAGE,
  GSTIN_LENGTH,
  GSTIN_LENGTH_MESSAGE,
  GSTIN_REGEX,
  IFSC_FORMAT_MESSAGE,
  IFSC_LENGTH,
  IFSC_LENGTH_MESSAGE,
  IFSC_REGEX,
  normalizeBusinessIdentifier,
  PAN_FORMAT_MESSAGE,
  PAN_LENGTH,
  PAN_LENGTH_MESSAGE,
  PAN_REGEX,
} from '@tejas96/shared/utils';
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
import { type Vendor, useVendorMutations } from '@/lib/hooks/resources/vendors';
import { type Gate, useGatedAction } from '@/lib/rbac';
import { getErrorMessage } from '@/lib/utils';

function trimToOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** GSTIN, PAN and IFSC are saved upper-case, whatever case they were typed in. */
function identifierOrUndefined(value: string): string | undefined {
  const trimmed = trimToOptional(value);
  return trimmed === undefined ? undefined : normalizeBusinessIdentifier(trimmed);
}

/**
 * `codeRequired` is false only where the server may generate the code
 * (VEN-0001, VEN-0002, …): a vendor added while recording an expense, by
 * someone who has no reason to invent one.
 */
const buildVendorFormSchema = (codeRequired: boolean) =>
  z
    .object({
      name: z.string().min(1, 'Name is required').max(255),
      code: codeRequired ? z.string().min(1, 'Code is required').max(50) : z.string().max(50),
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
        if (gst.length !== GSTIN_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: GSTIN_LENGTH_MESSAGE,
            path: ['gstin'],
          });
        } else if (!GSTIN_REGEX.test(gstUpper)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: GSTIN_FORMAT_MESSAGE,
            path: ['gstin'],
          });
        }
      }
      const panVal = data.pan.trim();
      if (panVal.length > 0) {
        const panUpper = panVal.toUpperCase();
        if (panVal.length !== PAN_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: PAN_LENGTH_MESSAGE,
            path: ['pan'],
          });
        } else if (!PAN_REGEX.test(panUpper)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: PAN_FORMAT_MESSAGE,
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
        if (ifsc.length !== IFSC_LENGTH) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: IFSC_LENGTH_MESSAGE,
            path: ['ifscCode'],
          });
        } else if (!IFSC_REGEX.test(ifsc.toUpperCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: IFSC_FORMAT_MESSAGE,
            path: ['ifscCode'],
          });
        }
      }
    });

type VendorFormValues = z.infer<ReturnType<typeof buildVendorFormSchema>>;

const VENDOR_TYPE_OPTIONS = Object.entries(VENDOR_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const VENDOR_STATUS_OPTIONS = [
  { value: VendorStatus.ACTIVE, label: 'Active' },
  { value: VendorStatus.INACTIVE, label: 'Inactive' },
  { value: VendorStatus.BLACKLISTED, label: 'Blacklisted' },
];

function getDefaultValues(vendor?: Vendor, initialName = ''): VendorFormValues {
  return {
    name: vendor?.name ?? initialName,
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
  // The props below are for adding a vendor from outside Inventory — the
  // expense dialog. Same form, same checks, same vendors table: there is no
  // second, shorter way to create a vendor.
  /** Prefills the name typed into the picker's search. */
  initialName?: string;
  /** Hands back the vendor just created, so the caller can select it. The caller closes the dialog. */
  onCreated?: (vendor: Vendor) => void;
  /** The permission this entry point is gated on. Inventory's by default. */
  gate?: Gate;
  /** The code may be left blank; the server then assigns the next VEN- code. */
  autoCode?: boolean;
  /**
   * Refuse a name another vendor already has. Inventory allows same-named
   * vendors on purpose and tells them apart by code, but someone adding one in
   * a hurry from an expense has almost always missed the existing vendor.
   */
  refuseDuplicateName?: boolean;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  initialName = '',
  onCreated,
  gate = 'inventory.vendors.manage',
  autoCode = false,
  refuseDuplicateName = false,
}: VendorFormDialogProps): React.JSX.Element {
  const save = useGatedAction(gate, () => undefined, 'Save vendor');
  const { create, update } = useVendorMutations();
  const queryClient = useQueryClient();
  const vendorKeys = useMemo(() => createResourceKeys('vendors'), []);

  // Custom mutation for status change with proper cache invalidation
  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VendorStatus }) => {
      const { data } = await apiClient.patch<Vendor>(`/vendors/${id}/status`, { status });
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all vendor queries to refresh lists and details
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all() });

      // Optimistically update the detail cache
      queryClient.setQueryData<Vendor>(vendorKeys.detail(variables.id), (prev) =>
        prev ? { ...prev, status: variables.status } : data,
      );

      showToast.success('Vendor status updated');
    },
    onError: (error: unknown) => {
      showToast.error(getErrorMessage(error));
    },
  });

  // `autoCode` is fixed for the life of a dialog (only the expense dialog sets it,
  // and it only ever creates), so the schema is too.
  const schema = useMemo(
    () => buildVendorFormSchema(!autoCode || Boolean(vendor)),
    [autoCode, vendor],
  );
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(vendor, initialName),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(vendor, initialName));
    }
  }, [open, vendor, initialName, form]);

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
        code: autoCode && !vendor ? trimToOptional(raw.code) : raw.code.trim(),
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
        gstin: identifierOrUndefined(raw.gstin),
        pan: identifierOrUndefined(raw.pan),
        paymentTerms: trimToOptional(raw.paymentTerms),
        creditDays,
        bankName: trimToOptional(raw.bankName),
        accountNumber: trimToOptional(raw.accountNumber),
        ifscCode: identifierOrUndefined(raw.ifscCode),
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
        if (refuseDuplicateName) {
          const { data: found } = await apiClient.get<{ data: Vendor[] }>('/vendors', {
            params: { search: data.name, limit: 25 },
          });
          const clash = found.data.find(
            (v) => v.name.trim().toLowerCase() === data.name.toLowerCase(),
          );
          if (clash) {
            form.setError('name', {
              type: 'manual',
              message: `“${clash.name}” is already a vendor (${clash.code}). Close this and pick them from the list.`,
            });
            return;
          }
        }
        const created = await create.mutateAsync({ ...rest, status });
        if (onCreated) {
          onCreated(created);
          return;
        }
      }

      handleClose();
    } catch {
      // Error is already displayed via mutation error handling
      // Just prevent the dialog from closing
    }
  });

  // isSubmitting also covers the duplicate-name lookup before the create starts.
  const isPending =
    create.isPending || update.isPending || changeStatus.isPending || form.formState.isSubmitting;
  const mutationError = create.error ?? update.error ?? changeStatus.error;

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="xl">
      <MUIDialogHeader>
        <MUIDialogTitle>{vendor ? 'Edit vendor' : 'New vendor'}</MUIDialogTitle>
        <MUIDialogDescription>
          {vendor
            ? 'Update vendor information, contact details, and payment terms.'
            : onCreated
              ? 'Saved to the vendor registry in Inventory, so every screen uses this same vendor.'
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
                    placeholder={
                      autoCode && !vendor ? 'Leave blank for the next VEN- code' : 'e.g., VEN-001'
                    }
                    required={!autoCode || Boolean(vendor)}
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
          <Button
            type="submit"
            variant="default"
            onClick={(e) => {
              if (!save.allowed) {
                e.preventDefault();
                save.onGatedClick();
              }
            }}
            aria-disabled={!save.allowed}
            disabled={isPending}
          >
            {vendor ? 'Save changes' : 'Create vendor'}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
