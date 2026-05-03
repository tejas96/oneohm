'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { VendorStatus, VendorType } from '@oneohm-epc/shared/types';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { VENDOR_TYPE_LABEL } from '../constants';

import { Alert } from '@/components/shared';
import {
  Button,
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
} from '@/components/ui';
import { type Vendor, useVendorMutations } from '@/lib/hooks/resources/vendors';
import { getErrorMessage } from '@/lib/utils';

function trimOpt(s: string): string | undefined {
  const t = s.trim();
  return t === '' ? undefined : t;
}

const vendorFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    code: z.string().min(1, 'Code is required').max(50),
    vendorType: z.nativeEnum(VendorType),
    contactPerson: z.string().max(255).optional(),
    email: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    pincode: z.string().max(10).optional(),
    gstin: z.string().max(15).optional(),
    pan: z.string().max(10).optional(),
    paymentTerms: z.string().max(500).optional(),
    creditDays: z.union([z.string(), z.number()]).optional(),
    rating: z.union([z.string(), z.number()]).optional(),
    notes: z.string().max(2000).optional(),
    status: z.nativeEnum(VendorStatus).optional(),
  })
  .superRefine((data, ctx) => {
    const pin = (data.pincode ?? '').trim();
    if (pin.length > 0 && (pin.length < 6 || pin.length > 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PIN must be 6–10 characters',
        path: ['pincode'],
      });
    }
    const ph = (data.phone ?? '').trim();
    if (ph.length > 0 && (ph.length < 10 || ph.length > 20)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone must be 10–20 characters',
        path: ['phone'],
      });
    }
    const em = (data.email ?? '').trim();
    if (em.length > 0 && !z.string().email().safeParse(em).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid email', path: ['email'] });
    }
    const gst = (data.gstin ?? '').trim();
    if (gst.length > 0 && gst.length !== 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GSTIN must be 15 characters',
        path: ['gstin'],
      });
    }
    const panVal = (data.pan ?? '').trim();
    if (panVal.length > 0 && panVal.length !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PAN must be 10 characters',
        path: ['pan'],
      });
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

function defaultValuesFrom(v?: Vendor): VendorFormValues {
  return {
    name: v?.name ?? '',
    code: v?.code ?? '',
    vendorType: (v?.vendorType as VendorType) || VendorType.SUPPLIER,
    contactPerson: v?.contactPerson ?? '',
    email: v?.email ?? '',
    phone: v?.phone ?? '',
    address: v?.address ?? '',
    city: v?.city ?? '',
    state: v?.state ?? '',
    pincode: v?.pincode ?? '',
    gstin: v?.gstin ?? '',
    pan: v?.pan ?? '',
    paymentTerms: v?.paymentTerms ?? '',
    creditDays: v?.creditDays ?? '',
    rating: v?.rating ?? '',
    notes: v?.notes ?? '',
    status: (v?.status as VendorStatus) || VendorStatus.ACTIVE,
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
  const isEdit = Boolean(vendor?.id);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: defaultValuesFrom(vendor),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValuesFrom(vendor));
    }
  }, [open, vendor, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const creditRaw = values.creditDays;
    const creditParsed =
      creditRaw === '' || creditRaw === undefined ? undefined : Number(creditRaw);
    const creditDays =
      creditParsed === undefined || !Number.isFinite(creditParsed)
        ? undefined
        : Math.max(0, Math.floor(creditParsed));
    const ratingRaw = values.rating;
    const ratingParsed =
      ratingRaw === '' || ratingRaw === undefined ? undefined : Number(ratingRaw);
    const rating =
      ratingParsed === undefined || !Number.isFinite(ratingParsed)
        ? undefined
        : Math.min(5, Math.max(0, ratingParsed));

    const basePayload = {
      name: values.name.trim(),
      code: values.code.trim(),
      vendorType: values.vendorType,
      contactPerson: trimOpt(values.contactPerson ?? ''),
      email: trimOpt(values.email ?? ''),
      phone: trimOpt(values.phone ?? ''),
      address: trimOpt(values.address ?? ''),
      city: trimOpt(values.city ?? ''),
      state: trimOpt(values.state ?? ''),
      pincode: trimOpt(values.pincode ?? ''),
      gstin: trimOpt(values.gstin ?? ''),
      pan: trimOpt(values.pan ?? ''),
      paymentTerms: trimOpt(values.paymentTerms ?? ''),
      creditDays,
      rating,
      notes: trimOpt(values.notes ?? ''),
    };

    if (isEdit && vendor) {
      await update.mutateAsync({ id: vendor.id, data: basePayload });
    } else {
      await create.mutateAsync({
        ...basePayload,
        status: values.status ?? VendorStatus.ACTIVE,
      } as Parameters<typeof create.mutateAsync>[0]);
    }
    onOpenChange(false);
  });

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="xl">
      <MUIDialogHeader>
        <MUIDialogTitle>{isEdit ? 'Edit vendor' : 'New vendor'}</MUIDialogTitle>
      </MUIDialogHeader>
      <MUIDialogBody dividers>
        <form id="vendor-form" className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
          {error ? (
            <Alert variant="error" title="Something went wrong">
              {getErrorMessage(error)}
            </Alert>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="Name" required error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="Code" required error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="vendorType"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUISelect
                  {...field}
                  fieldLabel="Vendor type"
                  required
                  options={VENDOR_TYPE_OPTIONS}
                  error={fieldState.error?.message}
                />
              )}
            />
            {!isEdit ? (
              <Controller
                name="status"
                control={form.control}
                render={({ field, fieldState }) => (
                  <MUISelect
                    {...field}
                    fieldLabel="Status"
                    options={VENDOR_STATUS_OPTIONS}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ) : null}
            <Controller
              name="contactPerson"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput
                  {...field}
                  fieldLabel="Contact person"
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="Email" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="Phone" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="address"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="Address" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="city"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="City" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="state"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="State" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="pincode"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="Pincode" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="gstin"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="GSTIN" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="pan"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="PAN" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="paymentTerms"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput {...field} fieldLabel="Payment terms" error={fieldState.error?.message} />
              )}
            />
            <Controller
              name="creditDays"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput
                  {...field}
                  fieldLabel="Credit days"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={field.value === undefined ? '' : field.value}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="rating"
              control={form.control}
              render={({ field, fieldState }) => (
                <MUIInput
                  {...field}
                  fieldLabel="Rating (0–5)"
                  type="number"
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  value={field.value === undefined ? '' : field.value}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <MUIInput
                {...field}
                fieldLabel="Notes"
                multiline
                minRows={2}
                error={fieldState.error?.message}
              />
            )}
          />
        </form>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" form="vendor-form" variant="default" disabled={pending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
