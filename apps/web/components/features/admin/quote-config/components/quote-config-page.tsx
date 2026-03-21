'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { type JSX, useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { quoteConfigSchema, type QuoteConfigFormData } from '../schemas/quote-config.schema';

import { Alert, FieldLabel } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MUIInput,
  MUISwitch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Typography,
} from '@/components/ui';
import { useQuoteConfig, useQuoteConfigMutations } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

export function QuoteConfigPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useQuoteConfig();
  const mutations = useQuoteConfigMutations();

  const form = useForm<QuoteConfigFormData>({
    resolver: zodResolver(quoteConfigSchema),
    mode: 'onChange',
    defaultValues: {
      defaultValidityDays: 30,
      maxVersions: 3,
      defaultCompletionWeeks: 4,
      gstConfig: {
        rate1: 12,
        rate1Percentage: 70,
        rate2: 18,
        rate2Percentage: 30,
      },
      wattageRounding: {
        roundTo: 10,
        roundUpThreshold: 5,
      },
      paymentMilestones: [
        { stage: 'advance', name: 'Advance', percentage: 10, order: 1 },
        { stage: 'installation_complete', name: 'Installation Complete', percentage: 85, order: 2 },
        { stage: 'commissioning', name: 'Commissioning', percentage: 5, order: 3 },
      ],
      showInventoryStock: true,
      minProfitMarginPercent: undefined,
      notes: '',
    },
  });

  const milestonesFieldArray = useFieldArray({ control: form.control, name: 'paymentMilestones' });

  useEffect(() => {
    if (!data) return;
    form.reset({
      defaultValidityDays: data.defaultValidityDays,
      maxVersions: data.maxVersions,
      defaultCompletionWeeks: data.defaultCompletionWeeks,
      gstConfig: data.gstConfig,
      wattageRounding: data.wattageRounding,
      paymentMilestones: data.paymentMilestones ?? [],
      showInventoryStock: data.showInventoryStock,
      minProfitMarginPercent: data.minProfitMarginPercent ?? undefined,
      notes: data.notes ?? '',
    });
  }, [data, form]);

  const gstSummary = useMemo(() => {
    const rate1 = form.watch('gstConfig.rate1');
    const rate1Percent = form.watch('gstConfig.rate1Percentage');
    const rate2 = form.watch('gstConfig.rate2');
    const rate2Percent = form.watch('gstConfig.rate2Percentage');
    return `${rate1Percent}% taxed at ${rate1}% + ${rate2Percent}% taxed at ${rate2}%`;
  }, [form]);

  const wattagePreview = useMemo(() => {
    const roundTo = form.watch('wattageRounding.roundTo');
    const threshold = form.watch('wattageRounding.roundUpThreshold');
    const example = 547;
    const remainder = example % roundTo;
    const rounded = remainder >= threshold ? example + (roundTo - remainder) : example - remainder;
    return `${example}W rounds to ${rounded}W`;
  }, [form]);

  const milestoneSum = useMemo(() => {
    return form.watch('paymentMilestones').reduce((sum, m) => sum + (m.percentage || 0), 0);
  }, [form]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-foreground-secondary">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-error/30 p-6">
        <div className="flex items-center gap-3 text-error">
          <AlertCircle className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load quote configuration</p>
            <p className="text-sm text-foreground-secondary mt-1">{getErrorMessage(error)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg border border-border-light p-8">
        <Typography variant="body">Quote configuration is not available yet.</Typography>
      </div>
    );
  }

  return (
    <Card className="border-border-light">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Quote Configuration</CardTitle>
          <Typography variant="body" color="muted" className="mt-1">
            Configure defaults for all quotes and calculations.
          </Typography>
        </div>
        <Button
          size="sm"
          onClick={() => {
            void form.handleSubmit(async (values) => {
              try {
                await mutations.update.mutateAsync({
                  id: data.id,
                  data: values,
                });
              } catch {
                // Toast handled by mutation config
              }
            })();
          }}
          disabled={mutations.update.isPending || !form.formState.isValid}
        >
          {mutations.update.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {Boolean(mutations.update.error) && (
          <Alert variant="error" appearance="minimal" className="mb-4">
            {getErrorMessage(mutations.update.error)}
          </Alert>
        )}
        <Alert variant="info" appearance="minimal" className="mb-4">
          Update these defaults carefully — changes apply to new quotes immediately.
        </Alert>
        <Tabs defaultValue="general">
          <TabsList variant="underline" className="w-full justify-start">
            <TabsTrigger value="general" variant="underline">
              General Settings
            </TabsTrigger>
            <TabsTrigger value="gst" variant="underline">
              GST Configuration
            </TabsTrigger>
            <TabsTrigger value="milestones" variant="underline">
              Payment Milestones
            </TabsTrigger>
            <TabsTrigger value="rounding" variant="underline">
              Wattage Rounding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <MUIInput
                  id="validity"
                  fieldLabel="Default Validity (days)"
                  tooltip="How many days a quote stays valid by default."
                  type="number"
                  placeholder="e.g. 30"
                  {...form.register('defaultValidityDays', { valueAsNumber: true })}
                />
              </div>
              <div>
                <MUIInput
                  id="versions"
                  fieldLabel="Max Versions"
                  tooltip="Maximum revisions allowed per quote."
                  type="number"
                  placeholder="e.g. 3"
                  {...form.register('maxVersions', { valueAsNumber: true })}
                />
              </div>
              <div>
                <MUIInput
                  id="completion"
                  fieldLabel="Completion Weeks"
                  tooltip="Default project completion timeline."
                  type="number"
                  placeholder="e.g. 4"
                  {...form.register('defaultCompletionWeeks', { valueAsNumber: true })}
                />
              </div>
              <div>
                <MUIInput
                  id="min-margin"
                  fieldLabel="Min Profit Margin (%)"
                  tooltip="Minimum margin allowed on a quote."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12.5"
                  {...form.register('minProfitMarginPercent', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel
                htmlFor="notes"
                label="Notes"
                tooltip="Internal default notes shown on quotes."
              />
              <Textarea
                id="notes"
                size="sm"
                rows={3}
                placeholder="e.g. Pricing includes standard installation"
                {...form.register('notes')}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border-light p-3">
              <Controller
                name="showInventoryStock"
                control={form.control}
                render={({ field }) => (
                  <MUISwitch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    label="Show Inventory Stock"
                    description="Display live stock availability in quote builder."
                    tooltip="Display live stock availability in quote builder."
                    labelPosition="left"
                  />
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="gst" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <MUIInput
                  fieldLabel="GST Rate 1"
                  tooltip="Primary GST rate used for line items."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5"
                  {...form.register('gstConfig.rate1', { valueAsNumber: true })}
                />
              </div>
              <div>
                <MUIInput
                  fieldLabel="Rate 1 Percentage"
                  tooltip="Percentage split for GST rate 1."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 100"
                  {...form.register('gstConfig.rate1Percentage', { valueAsNumber: true })}
                />
              </div>
              <div>
                <MUIInput
                  fieldLabel="GST Rate 2"
                  tooltip="Secondary GST rate used when applicable."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12"
                  {...form.register('gstConfig.rate2', { valueAsNumber: true })}
                />
              </div>
              <div>
                <MUIInput
                  fieldLabel="Rate 2 Percentage"
                  tooltip="Percentage split for GST rate 2."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0"
                  {...form.register('gstConfig.rate2Percentage', { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border-light p-3 text-sm text-foreground-secondary">
              Example: {gstSummary}
            </div>
          </TabsContent>

          <TabsContent value="milestones" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="body" className="font-semibold">
                  Payment Milestones
                </Typography>
                <Typography variant="body" color="muted" className="text-xs">
                  Total percentage must sum to 100%.
                </Typography>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  milestonesFieldArray.append({
                    stage: '',
                    name: '',
                    percentage: 0,
                    order: milestonesFieldArray.fields.length + 1,
                  })
                }
              >
                <Plus className="mr-2 size-icon-sm" />
                Add Milestone
              </Button>
            </div>

            {milestonesFieldArray.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-border-light p-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <MUIInput
                      fieldLabel="Stage"
                      tooltip="Short identifier for this milestone stage."
                      placeholder="e.g. booking"
                      {...form.register(`paymentMilestones.${index}.stage`)}
                    />
                  </div>
                  <div>
                    <MUIInput
                      fieldLabel="Name"
                      tooltip="Label shown on quotes and invoices."
                      placeholder="e.g. Booking Amount"
                      {...form.register(`paymentMilestones.${index}.name`)}
                    />
                  </div>
                  <div>
                    <MUIInput
                      fieldLabel="Percentage"
                      tooltip="Share of total amount for this milestone."
                      type="number"
                      step="0.01"
                      placeholder="e.g. 10"
                      {...form.register(`paymentMilestones.${index}.percentage`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div>
                    <MUIInput
                      fieldLabel="Order"
                      tooltip="Display order in the payment schedule."
                      type="number"
                      placeholder="e.g. 1"
                      {...form.register(`paymentMilestones.${index}.order`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => milestonesFieldArray.remove(index)}
                    disabled={milestonesFieldArray.fields.length <= 1}
                  >
                    <Trash2 className="mr-2 size-icon-sm" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-border-light p-3 text-sm text-foreground-secondary">
              Current total: {milestoneSum}%
            </div>
          </TabsContent>

          <TabsContent value="rounding" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <MUIInput
                  fieldLabel="Round To (W)"
                  tooltip="Round system size to the nearest watt value."
                  type="number"
                  placeholder="e.g. 10"
                  {...form.register('wattageRounding.roundTo', { valueAsNumber: true })}
                />
              </div>
              <div>
                <MUIInput
                  fieldLabel="Round Up Threshold"
                  tooltip="Threshold above which rounding rounds up."
                  type="number"
                  placeholder="e.g. 5"
                  {...form.register('wattageRounding.roundUpThreshold', {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border-light p-3 text-sm text-foreground-secondary">
              Example: {wattagePreview}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
