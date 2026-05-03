'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, IconButton } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { MUIInput, MUISelect } from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES } from '@/lib/config/routes';
import { useResourceList, type BaseFilters } from '@/lib/hooks/core';
import {
  useMaterialDispatchMutations,
  type MaterialDispatchItem,
} from '@/lib/hooks/resources/material-dispatches';
import { useStockAllocations, type StockAllocation } from '@/lib/hooks/resources/stock-allocations';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { getErrorMessage } from '@/lib/utils';

interface ProjectPick {
  id: string;
  name: string;
  projectNumber?: string;
}

const lineSchema = z.object({
  stockAllocationId: z.string().uuid('Pick an allocation'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
});

const dispatchCreateSchema = z
  .object({
    projectId: z.string().uuid('Select a project'),
    warehouseId: z.string().uuid('Select a warehouse'),
    vehicleNumber: z.string().optional(),
    driverName: z.string().optional(),
    driverPhone: z.string().optional(),
    transportCompany: z.string().optional(),
    dispatchDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    notes: z.string().optional(),
    lines: z.array(lineSchema).min(1, 'Add at least one line'),
  })
  .superRefine((val, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < val.lines.length; i++) {
      const line = val.lines[i];
      if (!line) continue;
      const id = line.stockAllocationId;
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate allocation',
          path: ['lines', i, 'stockAllocationId'],
        });
      }
      seen.add(id);
    }
  });

type DispatchCreateFormValues = z.infer<typeof dispatchCreateSchema>;

export function DispatchCreatePage(): React.JSX.Element {
  const router = useRouter();
  const { create } = useMaterialDispatchMutations();

  const { items: projects, isLoading: projectsLoading } = useResourceList<ProjectPick, BaseFilters>(
    {
      resource: 'projects',
      endpoint: '/projects',
      defaultPageSize: 200,
      syncToUrl: false,
    },
  );
  const { items: warehouses, isLoading: warehousesLoading } = useWarehouses({
    syncToUrl: false,
    defaultPageSize: 200,
  });

  const form = useForm<DispatchCreateFormValues>({
    resolver: zodResolver(dispatchCreateSchema),
    defaultValues: {
      projectId: '',
      warehouseId: '',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      transportCompany: '',
      dispatchDate: '',
      expectedDeliveryDate: '',
      notes: '',
      lines: [{ stockAllocationId: '', quantity: 1 }],
    },
  });

  const projectId = form.watch('projectId');
  const warehouseId = form.watch('warehouseId');

  const { items: allocationRows, setFilters: setAllocationFilters } = useStockAllocations(
    {
      syncToUrl: false,
      defaultPageSize: 200,
    },
    { enabled: Boolean(projectId && warehouseId) },
  );

  useEffect(() => {
    if (projectId && warehouseId) {
      setAllocationFilters({ projectId, warehouseId });
    }
  }, [projectId, warehouseId, setAllocationFilters]);

  const allocations = useMemo(() => {
    return (allocationRows as StockAllocation[]).filter((a) => {
      if (a.status === 'cancelled') return false;
      const avail = Number(a.allocatedQuantity) - Number(a.dispatchedQuantity ?? 0);
      return avail > 0.0001;
    });
  }, [allocationRows]);

  const allocationById = useMemo(() => {
    const m = new Map<string, StockAllocation>();
    allocations.forEach((a) => m.set(a.id, a));
    return m;
  }, [allocations]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.projectNumber ? `${p.projectNumber} — ${p.name}` : p.name,
  }));
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));

  const allocationSelectOptions = useMemo(
    () =>
      allocations.map((a) => {
        const avail = Number(a.allocatedQuantity) - Number(a.dispatchedQuantity ?? 0);
        const label = `${a.product?.name ?? 'Product'} · available ${avail}`;
        return { value: a.id, label };
      }),
    [allocations],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const itemsPayload = values.lines.map((line) => {
      const alloc = allocationById.get(line.stockAllocationId);
      if (!alloc) {
        throw new Error('Allocation not found');
      }
      return {
        productId: alloc.productId,
        quantity: line.quantity,
      };
    });

    try {
      await create.mutateAsync({
        projectId: values.projectId,
        warehouseId: values.warehouseId,
        vehicleNumber: values.vehicleNumber || undefined,
        driverName: values.driverName || undefined,
        driverPhone: values.driverPhone || undefined,
        transportCompany: values.transportCompany || undefined,
        dispatchDate: values.dispatchDate || undefined,
        expectedDeliveryDate: values.expectedDeliveryDate || undefined,
        notes: values.notes || undefined,
        items: itemsPayload as MaterialDispatchItem[],
      });
      void router.push(ROUTES.INVENTORY.DISPATCHES);
    } catch (err) {
      form.setError('root', { message: getErrorMessage(err) });
    }
  });

  const rootError = form.formState.errors.root?.message;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton aria-label="Back" onClick={() => router.back()} size="small">
          <ArrowBackIcon />
        </IconButton>
        <MUITypography variant="drawerTitle">Create dispatch</MUITypography>
      </div>

      {rootError ? (
        <MUITypography variant="body" className="text-red-600">
          {rootError}
        </MUITypography>
      ) : null}

      <form className="flex max-w-3xl flex-col gap-6" onSubmit={(e) => void onSubmit(e)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="projectId"
            render={({ field, fieldState }) => (
              <MUIInput
                mode="autocomplete"
                fieldLabel="Project"
                required
                options={projectOptions}
                loading={projectsLoading}
                value={projectOptions.find((o) => o.value === field.value) ?? null}
                onChange={(opt) => {
                  const v =
                    opt && typeof opt === 'object' && 'value' in opt ? String(opt.value) : '';
                  field.onChange(v);
                }}
                error={fieldState.error?.message}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : (option.label ?? String(option.value ?? ''))
                }
              />
            )}
          />
          <Controller
            control={form.control}
            name="warehouseId"
            render={({ field, fieldState }) => (
              <MUISelect
                fieldLabel="Warehouse"
                required
                placeholder="Select warehouse"
                options={warehouseOptions}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value as string)}
                error={fieldState.error?.message}
                disabled={warehousesLoading}
              />
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MUIInput
            fieldLabel="Vehicle number"
            {...form.register('vehicleNumber')}
            error={form.formState.errors.vehicleNumber?.message}
          />
          <MUIInput
            fieldLabel="Transport company"
            {...form.register('transportCompany')}
            error={form.formState.errors.transportCompany?.message}
          />
          <MUIInput
            fieldLabel="Driver name"
            {...form.register('driverName')}
            error={form.formState.errors.driverName?.message}
          />
          <MUIInput
            fieldLabel="Driver phone"
            {...form.register('driverPhone')}
            error={form.formState.errors.driverPhone?.message}
          />
          <MUIInput
            fieldLabel="Dispatch date"
            type="date"
            InputLabelProps={{ shrink: true }}
            {...form.register('dispatchDate')}
            error={form.formState.errors.dispatchDate?.message}
          />
          <MUIInput
            fieldLabel="Expected delivery"
            type="date"
            InputLabelProps={{ shrink: true }}
            {...form.register('expectedDeliveryDate')}
            error={form.formState.errors.expectedDeliveryDate?.message}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <MUITypography variant="sectionTitle">From allocations</MUITypography>
            <Button
              type="button"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => append({ stockAllocationId: '', quantity: 1 })}
              disabled={!projectId || !warehouseId}
            >
              Add line
            </Button>
          </div>
          {!projectId || !warehouseId ? (
            <MUITypography variant="body" className="text-foreground-secondary">
              Select a project and warehouse to load allocations.
            </MUITypography>
          ) : allocations.length === 0 ? (
            <MUITypography variant="body" className="text-foreground-secondary">
              No available allocations for this project and warehouse.
            </MUITypography>
          ) : null}

          <div className="flex flex-col gap-4">
            {fields.map((fieldRow, index) => (
              <div
                key={fieldRow.id}
                className="flex flex-col gap-3 rounded-lg border border-border-light p-4 sm:flex-row sm:items-start"
              >
                <div className="min-w-0 flex-1">
                  <MUISelect
                    fieldLabel="Allocation"
                    required
                    options={allocationSelectOptions}
                    value={form.watch(`lines.${index}.stockAllocationId`)}
                    onChange={(e) =>
                      form.setValue(`lines.${index}.stockAllocationId`, e.target.value as string, {
                        shouldValidate: true,
                      })
                    }
                    error={form.formState.errors.lines?.[index]?.stockAllocationId?.message}
                  />
                </div>
                <div className="w-full sm:w-40">
                  <MUIInput
                    fieldLabel="Quantity"
                    required
                    type="number"
                    inputProps={{ min: 0.001, step: 'any' }}
                    {...form.register(`lines.${index}.quantity`)}
                    error={form.formState.errors.lines?.[index]?.quantity?.message}
                  />
                </div>
                <IconButton
                  aria-label="Remove line"
                  size="small"
                  className="sm:mt-6"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </div>
            ))}
          </div>
          {form.formState.errors.lines &&
          typeof form.formState.errors.lines.message === 'string' ? (
            <MUITypography variant="finePrint" className="mt-2 text-red-600">
              {form.formState.errors.lines.message}
            </MUITypography>
          ) : null}
        </div>

        <MUIInput
          fieldLabel="Notes"
          multiline
          minRows={2}
          {...form.register('notes')}
          error={form.formState.errors.notes?.message}
        />

        <div className="flex gap-2">
          <Button type="submit" variant="contained" disabled={create.isPending}>
            Create dispatch
          </Button>
          <Button type="button" variant="outlined" color="inherit" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
