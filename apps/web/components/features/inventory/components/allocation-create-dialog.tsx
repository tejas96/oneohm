'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@mui/material';
import { StockAllocationSourceType } from '@oneohm-epc/shared/types';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProductPicker } from './shared/product-picker';
import { WarehousePicker } from './shared/warehouse-picker';

import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISelect,
} from '@/components/ui';
import { useResourceList, type BaseFilters } from '@/lib/hooks/core';
import { useStockAllocationMutations } from '@/lib/hooks/resources/stock-allocations';

interface ProjectPick {
  id: string;
  name: string;
  projectNumber?: string;
}

const allocationCreateSchema = z.object({
  projectId: z.string().uuid('Select a project'),
  warehouseId: z.string().uuid('Select a warehouse'),
  productId: z.string().uuid('Select a product'),
  allocatedQuantity: z.coerce.number().positive('Quantity must be positive'),
  sourceType: z.nativeEnum(StockAllocationSourceType),
  notes: z.string().optional(),
});

type AllocationCreateFormValues = z.infer<typeof allocationCreateSchema>;

const SOURCE_OPTIONS = [
  { value: StockAllocationSourceType.OWN, label: 'Own' },
  { value: StockAllocationSourceType.THIRD_PARTY, label: 'Third party' },
];

export interface AllocationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function AllocationCreateDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: AllocationCreateDialogProps): React.JSX.Element {
  const { create } = useStockAllocationMutations();
  const { items: projects, isLoading: projectsLoading } = useResourceList<ProjectPick, BaseFilters>(
    {
      resource: 'projects',
      endpoint: '/projects',
      defaultPageSize: 200,
      syncToUrl: false,
    },
  );

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.projectNumber ? `${p.projectNumber} — ${p.name}` : p.name,
  }));

  const form = useForm<AllocationCreateFormValues>({
    resolver: zodResolver(allocationCreateSchema),
    defaultValues: {
      projectId: defaultProjectId ?? '',
      warehouseId: '',
      productId: '',
      allocatedQuantity: 1,
      sourceType: StockAllocationSourceType.OWN,
      notes: '',
    },
  });

  useEffect(() => {
    if (open && defaultProjectId) {
      form.setValue('projectId', defaultProjectId);
    }
  }, [open, defaultProjectId, form]);

  const handleClose = (): void => {
    onOpenChange(false);
    form.reset({
      projectId: defaultProjectId ?? '',
      warehouseId: '',
      productId: '',
      allocatedQuantity: 1,
      sourceType: StockAllocationSourceType.OWN,
      notes: '',
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await create.mutateAsync({
      projectId: values.projectId,
      warehouseId: values.warehouseId,
      productId: values.productId,
      allocatedQuantity: values.allocatedQuantity,
      sourceType: values.sourceType,
      notes: values.notes || undefined,
    });
    handleClose();
  });

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Create stock allocation</MUIDialogTitle>
      </MUIDialogHeader>
      <MUIDialogBody dividers>
        <form
          id="allocation-create-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => void onSubmit(e)}
        >
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
          <WarehousePicker control={form.control} name="warehouseId" required />
          <ProductPicker control={form.control} name="productId" required />
          <MUIInput
            fieldLabel="Allocated quantity"
            required
            type="number"
            inputProps={{ min: 0.001, step: 'any' }}
            {...form.register('allocatedQuantity')}
            error={form.formState.errors.allocatedQuantity?.message}
          />
          <Controller
            control={form.control}
            name="sourceType"
            render={({ field, fieldState }) => (
              <MUISelect
                fieldLabel="Source type"
                required
                options={SOURCE_OPTIONS}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                error={fieldState.error?.message}
              />
            )}
          />
          <MUIInput
            fieldLabel="Notes"
            multiline
            minRows={2}
            {...form.register('notes')}
            error={form.formState.errors.notes?.message}
          />
        </form>
      </MUIDialogBody>
      <MUIDialogFooter>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleClose}
          disabled={create.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="allocation-create-form"
          variant="contained"
          disabled={create.isPending}
        >
          Create
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
