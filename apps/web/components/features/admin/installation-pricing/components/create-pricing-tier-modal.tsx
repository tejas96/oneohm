'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { COST_COMPONENT_FIELDS } from '../constants';
import {
  installationPricingSchema,
  type InstallationPricingFormData,
} from '../schemas/installation-pricing.schema';

import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Switch,
  Typography,
} from '@/components/ui';
import { Alert, FieldLabel } from '@/components/shared';
import { useModalForm } from '@/lib/hooks/core';
import {
  useInstallationPricingMutations,
  type InstallationPricingItem,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface CreatePricingTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePricingTierModal({
  open,
  onOpenChange,
}: CreatePricingTierModalProps): JSX.Element {
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

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    InstallationPricingFormData,
    Partial<InstallationPricingItem>
  >({
    form,
    mutation: mutations.create,
    onOpenChange,
    transformPayload: (data) => ({
      ...data,
      maxSystemSizeKw: data.maxSystemSizeKw ?? null,
      effectiveTo: data.effectiveTo || undefined,
    }),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Create Pricing Tier</DialogTitle>
          <DialogDescription>
            Define installation pricing for a system size range.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogBody className="space-y-5 max-h-[75vh] overflow-y-auto">
            {Boolean(mutations.create.error) && (
              <Alert variant="error" appearance="minimal">
                {getErrorMessage(mutations.create.error)}
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
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="tier-min"
                      label="Min System Size (kW)"
                      tooltip="Minimum system size for this pricing tier."
                    />
                    <Input
                      id="tier-min"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1"
                      error={form.formState.errors.minSystemSizeKw?.message}
                      {...form.register('minSystemSizeKw', { valueAsNumber: true })}
                    />
                    {form.formState.errors.minSystemSizeKw && (
                      <p className="text-xs text-error">
                        {form.formState.errors.minSystemSizeKw.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="tier-max"
                      label="Max System Size (kW)"
                      tooltip="Leave empty for open-ended tiers."
                    />
                    <Input
                      id="tier-max"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 10 (optional)"
                      error={form.formState.errors.maxSystemSizeKw?.message}
                      {...form.register('maxSystemSizeKw', {
                        setValueAs: (value) => (value === '' ? null : Number(value)),
                      })}
                    />
                    {form.formState.errors.maxSystemSizeKw && (
                      <p className="text-xs text-error">
                        {form.formState.errors.maxSystemSizeKw.message}
                      </p>
                    )}
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
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="tier-transport"
                      label="Transport Rate (per km)"
                      tooltip="Transport cost per kilometer."
                    />
                    <Input
                      id="tier-transport"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 35"
                      {...form.register('transportRatePerKm', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="tier-floor"
                      label="Floor Increment (%)"
                      tooltip="Increment per additional floor."
                    />
                    <Input
                      id="tier-floor"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 25"
                      {...form.register('floorIncrementPercent', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="tier-gst"
                      label="GST Rate (%)"
                      tooltip="GST percentage applied to installation."
                    />
                    <Input
                      id="tier-gst"
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
                    Add the cost breakdown used in the installation calculator.
                  </p>
                </div>
                <Alert variant="info" appearance="minimal">
                  Use 0 for components that are not applicable in this tier.
                </Alert>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {COST_COMPONENT_FIELDS.map((field) => {
                    const fieldKey = field.key;
                    return (
                      <div key={fieldKey} className="space-y-1.5">
                        <FieldLabel
                          label={field.label}
                          tooltip={`Cost component for ${field.label.toLowerCase()}.`}
                        />
                        <Input
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
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="tier-from"
                      label="Effective From"
                      required
                      tooltip="Date when this tier becomes active."
                    />
                    <Input
                      id="tier-from"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      error={form.formState.errors.effectiveFrom?.message}
                      {...form.register('effectiveFrom')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="tier-to"
                      label="Effective To"
                      tooltip="Optional end date for this tier."
                    />
                    <Input
                      id="tier-to"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      {...form.register('effectiveTo')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border-light p-3">
                  <div>
                    <FieldLabel
                      label="Active"
                      tooltip="Only active tiers are used in calculations."
                    />
                    <p className="text-xs text-foreground-tertiary">
                      Only active tiers are used in calculations.
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('isActive')}
                    onCheckedChange={(value) => form.setValue('isActive', value)}
                  />
                </div>
              </CardContent>
            </Card>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Tier'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
