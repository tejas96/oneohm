'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { type JSX, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { COST_COMPONENT_FIELDS } from '../constants';
import {
  installationPricingSchema,
  type InstallationPricingFormData,
} from '../schemas/installation-pricing.schema';

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
  MUIDatePicker,
  MUIInput,
  MUISwitch,
  Typography,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import {
  useInstallationPricingMutations,
  type InstallationPricingItem,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface EditPricingTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: InstallationPricingItem | null;
}

export function EditPricingTierModal({
  open,
  onOpenChange,
  target,
}: EditPricingTierModalProps): JSX.Element {
  const mutations = useInstallationPricingMutations();

  const form = useForm<InstallationPricingFormData>({
    resolver: zodResolver(installationPricingSchema),
    mode: 'onChange',
    defaultValues: {
      minSystemSizeKw: 0,
      maxSystemSizeKw: null,
      transportRatePerKm: 35,
      floorIncrementPercent: 25,
      gstRate: 18,
      costComponents: {
        electrical_work: 0,
        fixed_material: 0,
        structure_cost: 0,
        installation_labor: 0,
        loading_unloading: 0,
        msedcl_charges: 0,
        supervision: 0,
        variable_floor: 0,
        profitability_percent: 0,
      },
      effectiveFrom: '',
      effectiveTo: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (!target) return;
    form.reset({
      minSystemSizeKw: target.minSystemSizeKw ?? 0,
      maxSystemSizeKw: target.maxSystemSizeKw ?? null,
      transportRatePerKm: target.transportRatePerKm ?? 0,
      floorIncrementPercent: target.floorIncrementPercent ?? 0,
      gstRate: target.gstRate ?? 0,
      costComponents: {
        electrical_work: target.costComponents?.electrical_work ?? 0,
        fixed_material: target.costComponents?.fixed_material ?? 0,
        structure_cost: target.costComponents?.structure_cost ?? 0,
        installation_labor: target.costComponents?.installation_labor ?? 0,
        loading_unloading: target.costComponents?.loading_unloading ?? 0,
        msedcl_charges: target.costComponents?.msedcl_charges ?? 0,
        supervision: target.costComponents?.supervision ?? 0,
        variable_floor: target.costComponents?.variable_floor ?? 0,
        profitability_percent:
          (target.costComponents as Record<string, number>)?.profitability_percent ?? 0,
      },
      effectiveFrom: target.effectiveFrom ?? '',
      effectiveTo: target.effectiveTo ?? '',
      isActive: target.isActive,
    });
  }, [form, target]);

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    InstallationPricingFormData,
    { id: string; data: Partial<InstallationPricingItem> }
  >({
    form,
    mutation: mutations.update,
    onOpenChange,
    transformPayload: (data) => ({
      id: target?.id ?? '',
      data: {
        ...data,
        maxSystemSizeKw: data.maxSystemSizeKw ?? null,
        effectiveTo: data.effectiveTo || undefined,
      },
    }),
  });

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="lg">
        <MUIDialogHeader>
          <MUIDialogTitle>Edit Pricing Tier</MUIDialogTitle>
          <MUIDialogDescription>
            Update installation pricing for this system size range.
          </MUIDialogDescription>
        </MUIDialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {Boolean(mutations.update.error) && (
              <Alert variant="error" appearance="minimal">
                {getErrorMessage(mutations.update.error)}
              </Alert>
            )}

            <Card>
              <CardContent className="space-y-5">
                <div>
                  <Typography variant="body" className="font-semibold">
                    Tier Range
                  </Typography>
                  <p className="text-xs text-foreground-tertiary">
                    Define the kW range that this tier applies to.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <MUIInput
                      id="tier-min"
                      fieldLabel="Min System Size (kW)"
                      tooltip="Minimum system size for this pricing tier."
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1"
                      error={form.formState.errors.minSystemSizeKw?.message}
                      {...form.register('minSystemSizeKw', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <MUIInput
                      id="tier-max"
                      fieldLabel="Max System Size (kW)"
                      tooltip="Leave empty for open-ended tiers."
                      type="number"
                      step="0.01"
                      placeholder="e.g. 10 (optional)"
                      error={form.formState.errors.maxSystemSizeKw?.message}
                      {...form.register('maxSystemSizeKw', {
                        setValueAs: (value) => (value === '' ? null : Number(value)),
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Typography variant="body" className="font-semibold">
                    Rates
                  </Typography>
                  <p className="text-xs text-foreground-tertiary">
                    Base rates that adjust the installation calculation.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <MUIInput
                      id="tier-transport"
                      fieldLabel="Transport Rate (per km)"
                      tooltip="Transport cost per kilometer."
                      type="number"
                      step="0.01"
                      placeholder="e.g. 35"
                      {...form.register('transportRatePerKm', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <MUIInput
                      id="tier-floor"
                      fieldLabel="Floor Increment (%)"
                      tooltip="Increment per additional floor."
                      type="number"
                      step="0.01"
                      placeholder="e.g. 25"
                      {...form.register('floorIncrementPercent', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <MUIInput
                      id="tier-gst"
                      fieldLabel="GST Rate (%)"
                      tooltip="GST percentage applied to installation."
                      type="number"
                      step="0.01"
                      placeholder="e.g. 18"
                      {...form.register('gstRate', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <Typography variant="body" className="font-semibold">
                    Cost Components
                  </Typography>
                  <p className="text-xs text-foreground-tertiary">
                    Update the cost breakdown used in the installation calculator.
                  </p>
                </div>
                <Alert variant="info" appearance="minimal">
                  Use 0 for components that are not applicable in this tier.
                </Alert>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {COST_COMPONENT_FIELDS.map((field) => {
                    const fieldKey = field.key;
                    return (
                      <div key={fieldKey}>
                        <MUIInput
                          fieldLabel={field.label}
                          tooltip={`Cost component for ${field.label.toLowerCase()}.`}
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5000"
                          {...form.register(`costComponents.${fieldKey}` as const, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <Typography variant="body" className="font-semibold">
                    Effective Dates
                  </Typography>
                  <p className="text-xs text-foreground-tertiary">
                    Control when this tier becomes active.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Controller
                      name="effectiveFrom"
                      control={form.control}
                      render={({ field }) => (
                        <MUIDatePicker
                          fieldLabel="Effective From"
                          required
                          tooltip="Date when this tier becomes active."
                          error={form.formState.errors.effectiveFrom?.message}
                          value={field.value || null}
                          onChange={(date) =>
                            field.onChange(date ? date.toISOString().slice(0, 10) : '')
                          }
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Controller
                      name="effectiveTo"
                      control={form.control}
                      render={({ field }) => (
                        <MUIDatePicker
                          fieldLabel="Effective To"
                          tooltip="Optional end date for this tier."
                          value={field.value || null}
                          onChange={(date) =>
                            field.onChange(date ? date.toISOString().slice(0, 10) : '')
                          }
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border-light p-3">
                  <Controller
                    name="isActive"
                    control={form.control}
                    render={({ field }) => (
                      <MUISwitch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        label="Active"
                        description="Only active tiers are used in calculations."
                        tooltip="Only active tiers are used in calculations."
                        labelPosition="left"
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </MUIDialogBody>
          <MUIDialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid || !target?.id}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </MUIDialogFooter>
        </form>
    </MUIDialog>
  );
}
