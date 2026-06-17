'use client';

import AgricultureOutlinedIcon from '@mui/icons-material/AgricultureOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Card, CardContent, Chip, Checkbox, FormControlLabel } from '@mui/material';
import {
  Root as RadioGroupRoot,
  Item as RadioGroupItem,
  Indicator as RadioGroupIndicator,
} from '@radix-ui/react-radio-group';
import { PropertyType } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { type CustomerResponse } from '../../../../customers';
import { useCustomers } from '../../../../customers/hooks';
import { PROPERTY_ALERTS } from '../../../constants';

import { MUIAvatar, MUIInput, MUITypography, MUIFieldLabel } from '@/components/ui';
import { PROPERTY_TYPE_OPTIONS } from '@/lib/config/constants';
import { cn } from '@/lib/utils';

interface Step1BasicInfoProps {
  isEditMode: boolean;
  initialCustomerId?: string;
  preloadedCustomer?: CustomerResponse;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  selectedCustomer: CustomerResponse | undefined;
  setSelectedCustomer: (customer: CustomerResponse | undefined) => void;
}

const PROPERTY_TYPE_ICONS: Record<PropertyType, React.ComponentType<{ sx?: any }>> = {
  [PropertyType.RESIDENTIAL]: HomeOutlinedIcon,
  [PropertyType.RESIDENTIAL_APARTMENT]: ApartmentOutlinedIcon,
  [PropertyType.COMMERCIAL]: StorefrontOutlinedIcon,
  [PropertyType.INDUSTRIAL]: FactoryOutlinedIcon,
  [PropertyType.AGRICULTURAL]: AgricultureOutlinedIcon,
  [PropertyType.INSTITUTIONAL]: SchoolOutlinedIcon,
};

interface PropertyTypeRadioCardProps {
  value: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ sx?: any }>;
}

function PropertyTypeRadioCard({
  value,
  label,
  description,
  icon: Icon,
}: PropertyTypeRadioCardProps): React.JSX.Element {
  return (
    <RadioGroupItem
      value={value}
      className={cn(
        'relative flex flex-col items-center text-center cursor-pointer rounded-lg border p-2.5 transition-all duration-200 w-full',
        'border-border-light bg-background',
        'hover:border-primary/50 hover:bg-primary/5',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
      )}
    >
      {/* Radio Indicator circle in top-right */}
      <div className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full border border-border-medium flex items-center justify-center bg-background">
        <RadioGroupIndicator className="flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        </RadioGroupIndicator>
      </div>

      {/* Illustrative Icon */}
      <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-2">
        <Icon sx={{ fontSize: 16 }} />
      </div>

      {/* Texts */}
      <MUITypography variant="bodyPrimary" className="font-semibold text-xs leading-none">
        {label}
      </MUITypography>
      <MUITypography
        variant="timestamp"
        className="text-foreground-secondary text-center mt-1 text-[10px] leading-tight"
      >
        {description}
      </MUITypography>
    </RadioGroupItem>
  );
}

export function Step1BasicInfo({
  isEditMode,
  initialCustomerId,
  preloadedCustomer,
  selectedCustomerId,
  setSelectedCustomerId,
  selectedCustomer,
  setSelectedCustomer,
}: Step1BasicInfoProps): React.JSX.Element {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const [customerSearch, setCustomerSearch] = React.useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  const handleCustomerInputChange = (value: string): void => {
    setCustomerSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const isContextAware = !isEditMode && !!initialCustomerId;

  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    limit: 10,
    enabled: !isEditMode && !initialCustomerId,
  });

  const customerOptions = React.useMemo(() => {
    return (customersData?.data ?? []).map((c: any) => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName ?? ''}`.trim(),
      secondaryText: c.phone,
    }));
  }, [customersData]);

  // Handle selected customer caching
  React.useEffect(() => {
    if (!isEditMode && !initialCustomerId && selectedCustomerId && customersData?.data) {
      const found = (customersData.data as any[]).find((c: any) => c.id === selectedCustomerId);
      if (found) {
        setSelectedCustomer(found as CustomerResponse);
      }
    }
  }, [selectedCustomerId, customersData, isEditMode, initialCustomerId, setSelectedCustomer]);

  const customerToRender = preloadedCustomer ?? selectedCustomer;

  return (
    <Card variant="outlined">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-light">
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          <HomeOutlinedIcon fontSize="small" />
        </div>
        <div className="flex-1 min-w-0">
          <MUITypography variant="sectionTitle">Property Information</MUITypography>
          <MUITypography variant="body">
            Basic details about the property and customer
          </MUITypography>
        </div>
      </div>
      <CardContent className="p-6 space-y-6">
        {/* Customer Selection/Display (Create Mode only) */}
        {!isEditMode && (
          <div>
            {isContextAware ? (
              customerToRender && (
                <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/15 rounded-lg">
                  <MUIAvatar
                    name={`${customerToRender.firstName} ${customerToRender.lastName ?? ''}`}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <MUITypography variant="bodyPrimary" noWrap className="font-semibold text-sm">
                      {customerToRender.firstName} {customerToRender.lastName ?? ''}
                    </MUITypography>
                    <MUITypography variant="timestamp" className="text-foreground-secondary mt-0.5">
                      {customerToRender.phone}
                    </MUITypography>
                  </div>
                  <Chip
                    label="Customer"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ height: 20, fontSize: 10 }}
                  />
                </div>
              )
            ) : (
              <div className="space-y-4">
                <MUIInput
                  mode="autocomplete"
                  fieldLabel="Customer"
                  required
                  options={customerOptions}
                  value={
                    selectedCustomerId
                      ? ((customerOptions as any[]).find(
                          (o: any) => o.value === selectedCustomerId,
                        ) ?? null)
                      : null
                  }
                  inputValue={customerSearch}
                  onInputChange={handleCustomerInputChange}
                  onChange={(option) => {
                    const id =
                      option && typeof option === 'object' && 'value' in option
                        ? String(option.value)
                        : '';
                    setSelectedCustomerId(id);
                    setValue('customerId', id, { shouldValidate: true, shouldDirty: true });
                  }}
                  loading={isLoadingCustomers}
                  showAvatar
                  secondaryTextKey="secondaryText"
                  getOptionLabel={(option) =>
                    typeof option === 'string'
                      ? option
                      : `${(option as { label?: string }).label ?? ''}`
                  }
                  isOptionEqualToValue={(option, val) =>
                    typeof option === 'object' &&
                    typeof val === 'object' &&
                    (option as { value?: string }).value === (val as { value?: string }).value
                  }
                  noOptionsText={
                    debouncedSearch.length < 2
                      ? 'Type at least 2 characters to search'
                      : 'No customers found'
                  }
                  loadingText="Searching customers…"
                  clearable
                  onClear={() => {
                    setSelectedCustomerId('');
                    setSelectedCustomer(undefined);
                    setCustomerSearch('');
                    setDebouncedSearch('');
                    setValue('customerId', '', { shouldValidate: true, shouldDirty: true });
                  }}
                  error={errors.customerId?.message as string | undefined}
                  textFieldProps={{ placeholder: 'Search by name or phone…', size: 'small' }}
                />

                {customerToRender && (
                  <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                    <MUIAvatar
                      name={`${customerToRender.firstName} ${customerToRender.lastName ?? ''}`}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <MUITypography variant="bodyPrimary" noWrap className="font-medium">
                        {customerToRender.firstName} {customerToRender.lastName ?? ''}
                      </MUITypography>
                      <MUITypography variant="timestamp">{customerToRender.phone}</MUITypography>
                    </div>
                  </div>
                )}
              </div>
            )}
            <hr className="border-border-light my-5" />
          </div>
        )}

        {/* Unified Two-Column Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Property Name & Primary Status */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <MUIInput
                fieldLabel="Property Name"
                required
                id="propertyName"
                placeholder="e.g., Main Residence, Office Building"
                size="small"
                {...register('propertyName')}
                error={errors.propertyName?.message as string | undefined}
              />
              <span className="text-2xs text-foreground-tertiary block mt-1.5 leading-relaxed px-1">
                💡 {PROPERTY_ALERTS.propertyTip.message}
              </span>
            </div>

            {/* isPrimary — create mode only */}
            {!isEditMode && (
              <div className="flex items-center gap-2 pt-2">
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={Boolean(watch('isPrimary'))}
                      onChange={(e) =>
                        setValue('isPrimary', e.target.checked, { shouldDirty: true })
                      }
                    />
                  }
                  label={
                    <MUITypography variant="bodyPrimary" className="text-sm">
                      Set as primary property
                    </MUITypography>
                  }
                />
              </div>
            )}
          </div>

          {/* Right Column: Property Type Grid */}
          <div className="md:col-span-7">
            <MUIFieldLabel fieldLabel="Property Type" required />

            <RadioGroupRoot
              value={(watch('propertyType') as string) ?? ''}
              onValueChange={(v) =>
                setValue('propertyType', v as PropertyType, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full"
            >
              {PROPERTY_TYPE_OPTIONS.map((type) => {
                const Icon = PROPERTY_TYPE_ICONS[type.value as PropertyType];
                return (
                  <PropertyTypeRadioCard
                    key={type.value}
                    value={type.value}
                    label={type.label}
                    description={type.description}
                    icon={Icon}
                  />
                );
              })}
            </RadioGroupRoot>

            {errors.propertyType && (
              <MUITypography variant="alertTitle" color="error" className="mt-2 block">
                {errors.propertyType.message as string}
              </MUITypography>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
