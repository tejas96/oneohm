'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { WarehouseStatus, WarehouseType } from '@tejas96/shared/types';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/shared';
import {
  Button,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
} from '@/components/ui';
import { useWarehouseMutations, type Warehouse } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

function trimToOptional(value: string): string | undefined {
  const t = value.trim();
  return t === '' ? undefined : t;
}

const warehouseFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    code: z.string().min(1, 'Code is required').max(50),
    warehouseType: z.nativeEnum(WarehouseType),
    address: z.string().max(500),
    city: z.string().max(100),
    state: z.string().max(100),
    pincode: z.string().max(10),
    contactPerson: z.string().max(255),
    phone: z.string().max(20),
    email: z.string().max(255),
    status: z.nativeEnum(WarehouseStatus),
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
    if (ph.length > 0 && (ph.length < 10 || ph.length > 20)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone must be 10–20 characters',
        path: ['phone'],
      });
    }
    if (ph.length > 0 && !/^\+?[\d\s\-()]+$/.test(ph)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone must contain only numbers, spaces, and +()-',
        path: ['phone'],
      });
    }
    const em = data.email.trim();
    if (em.length > 0 && !z.string().email().safeParse(em).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid email address',
        path: ['email'],
      });
    }
  });

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

function getDefaultValues(warehouse?: Warehouse): WarehouseFormValues {
  return {
    name: warehouse?.name ?? '',
    code: warehouse?.code ?? '',
    warehouseType:
      warehouse?.warehouseType === WarehouseType.THIRD_PARTY
        ? WarehouseType.THIRD_PARTY
        : WarehouseType.OWN,
    address: warehouse?.address ?? '',
    city: warehouse?.city ?? '',
    state: warehouse?.state ?? '',
    pincode: warehouse?.pincode ?? '',
    contactPerson: warehouse?.contactPerson ?? '',
    phone: warehouse?.phone ?? '',
    email: warehouse?.email ?? '',
    status:
      warehouse?.status === WarehouseStatus.INACTIVE
        ? WarehouseStatus.INACTIVE
        : WarehouseStatus.ACTIVE,
  };
}

const WAREHOUSE_TYPE_OPTIONS = [
  { value: WarehouseType.OWN, label: 'Own' },
  { value: WarehouseType.THIRD_PARTY, label: 'Third Party' },
];

const WAREHOUSE_STATUS_OPTIONS = [
  { value: WarehouseStatus.ACTIVE, label: 'Active' },
  { value: WarehouseStatus.INACTIVE, label: 'Inactive' },
];

export interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
}: WarehouseFormDialogProps): React.JSX.Element {
  const { create, update, action } = useWarehouseMutations();

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: getDefaultValues(warehouse),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(warehouse));
    }
  }, [open, warehouse, form]);

  const handleClose = (): void => {
    onOpenChange(false);
  };

  const onSubmit = form.handleSubmit(async (raw) => {
    const data = {
      name: raw.name.trim(),
      code: raw.code.trim(),
      warehouseType: raw.warehouseType,
      address: trimToOptional(raw.address),
      city: trimToOptional(raw.city),
      state: trimToOptional(raw.state),
      pincode: trimToOptional(raw.pincode),
      contactPerson: trimToOptional(raw.contactPerson),
      phone: trimToOptional(raw.phone),
      email: trimToOptional(raw.email),
      status: raw.status,
    };

    const { status, ...rest } = data;

    if (warehouse) {
      await update.mutateAsync({ id: warehouse.id, data: rest });
      if (status !== warehouse.status) {
        await action('changeStatus', warehouse.id, { status });
      }
    } else {
      await create.mutateAsync({ ...rest, status });
    }

    handleClose();
  });

  const isPending = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error;

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>{warehouse ? 'Edit warehouse' : 'New warehouse'}</MUIDialogTitle>
        <MUIDialogDescription>
          {warehouse ? 'Update warehouse details and status.' : 'Create a new storage location.'}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MUIInput
                id="warehouse-name"
                fieldLabel="Name"
                required
                error={form.formState.errors.name?.message}
                {...form.register('name')}
                variant="outlined"
              />
              <MUIInput
                id="warehouse-code"
                fieldLabel="Code"
                required
                error={form.formState.errors.code?.message}
                {...form.register('code')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="warehouseType"
                control={form.control}
                render={({ field }) => (
                  <MUISelect
                    fieldLabel="Warehouse type"
                    required
                    placeholder="Select type"
                    error={form.formState.errors.warehouseType?.message}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    options={WAREHOUSE_TYPE_OPTIONS}
                  />
                )}
              />
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <MUISelect
                    fieldLabel="Status"
                    required
                    placeholder="Select status"
                    error={form.formState.errors.status?.message}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    options={WAREHOUSE_STATUS_OPTIONS}
                  />
                )}
              />
            </div>

            <MUIInput
              id="warehouse-address"
              fieldLabel="Address"
              error={form.formState.errors.address?.message}
              {...form.register('address')}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MUIInput
                id="warehouse-city"
                fieldLabel="City"
                error={form.formState.errors.city?.message}
                {...form.register('city')}
              />
              <MUIInput
                id="warehouse-state"
                fieldLabel="State"
                error={form.formState.errors.state?.message}
                {...form.register('state')}
              />
              <MUIInput
                id="warehouse-pincode"
                fieldLabel="PIN code"
                error={form.formState.errors.pincode?.message}
                {...form.register('pincode')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MUIInput
                id="warehouse-contact"
                fieldLabel="Contact person"
                error={form.formState.errors.contactPerson?.message}
                {...form.register('contactPerson')}
              />
              <MUIInput
                id="warehouse-phone"
                fieldLabel="Phone"
                error={form.formState.errors.phone?.message}
                {...form.register('phone')}
              />
            </div>

            <MUIInput
              id="warehouse-email"
              fieldLabel="Email"
              type="email"
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />
          </div>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={isPending}>
            {warehouse ? 'Save changes' : 'Create warehouse'}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
