'use client';

import { DcrPreference } from '@oneohm-epc/shared/types';
import { useCallback, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { PRICING_AFFECTING_FIELDS, PROPERTY_TYPE_TO_PROJECT_TYPE } from '../constants';
import type { QuoteBuilderFormData } from '../schemas/quote.schema';

export interface UseQuoteFormLogicOptions {
  form: UseFormReturn<QuoteBuilderFormData>;
  onCalculationCleared: () => void;
}

export interface UseQuoteFormLogicReturn {
  handleSystemSizeChange: (value: number) => void;
  handleSelectedSubsidyIdsChange: (ids: string[]) => void;
  handleBrandChange: (value: string) => void;
  handleInverterBrandChange: (value: string) => void;
  handlePhaseChange: (value: string) => void;
  handleTechnologyVariantSelect: (technology: string, wattage: number) => void;
  handlePropertySelect: (propertyType?: string) => void;
  handleFieldChange: (fieldName: string, value: unknown) => void;
  shouldDisableSinglePhase: boolean;
  shouldShowDcrPreference: boolean;
  isDcrDisabled: boolean;
}

/**
 * Encapsulates all quote form business rules.
 * Keeps the QuoteBuilder component as pure UI.
 */
export function useQuoteFormLogic({
  form,
  onCalculationCleared,
}: UseQuoteFormLogicOptions): UseQuoteFormLogicReturn {
  const { setValue, watch, getValues } = form;

  const systemSizeKw = watch('systemSizeKw');
  const selectedSubsidyIds = watch('selectedSubsidyIds') ?? [];

  const pricingFieldsRef = useRef(new Set<string>(PRICING_AFFECTING_FIELDS));

  const clearCalculationIfNeeded = useCallback(
    (fieldName: string) => {
      if (pricingFieldsRef.current.has(fieldName)) {
        onCalculationCleared();
      }
    },
    [onCalculationCleared],
  );

  // Auto-switch phase based on system size (>7kW must be three phase)
  const handleSystemSizeChange = useCallback(
    (value: number) => {
      setValue('systemSizeKw', value, { shouldValidate: true });
      if (value > 7) {
        setValue('phaseType', 'three_phase');
        setValue('preferredInverterCapacityKw', undefined);
      }
      clearCalculationIfNeeded('systemSizeKw');
    },
    [setValue, clearCalculationIfNeeded],
  );

  const handleSelectedSubsidyIdsChange = useCallback(
    (ids: string[]) => {
      setValue('selectedSubsidyIds', ids, { shouldValidate: true });
      if (ids.length === 0) {
        setValue('dcrPreference', DcrPreference.NON_DCR_ONLY);
      } else {
        const pref = getValues('dcrPreference');
        if (pref === DcrPreference.NON_DCR_ONLY) {
          setValue('dcrPreference', DcrPreference.DCR_ONLY);
        }
      }
      clearCalculationIfNeeded('selectedSubsidyIds');
    },
    [setValue, getValues, clearCalculationIfNeeded],
  );

  // Brand change -> reset technology + wattage
  const handleBrandChange = useCallback(
    (value: string) => {
      setValue('preferredPanelBrand', value);
      setValue('preferredPanelTechnology', undefined);
      setValue('preferredPanelWattage', undefined);
      clearCalculationIfNeeded('preferredPanelBrand');
    },
    [setValue, clearCalculationIfNeeded],
  );

  // Technology variant selection -> set both technology and wattage
  const handleTechnologyVariantSelect = useCallback(
    (technology: string, wattage: number) => {
      setValue('preferredPanelTechnology', technology);
      setValue('preferredPanelWattage', wattage);
      clearCalculationIfNeeded('preferredPanelTechnology');
    },
    [setValue, clearCalculationIfNeeded],
  );

  // Property selected -> auto-map propertyType to projectType
  const handlePropertySelect = useCallback(
    (propertyType?: string) => {
      if (propertyType) {
        const mapped = PROPERTY_TYPE_TO_PROJECT_TYPE[propertyType.toLowerCase()];
        if (mapped) {
          setValue('projectType', mapped);
          clearCalculationIfNeeded('projectType');
        }
      }
    },
    [setValue, clearCalculationIfNeeded],
  );

  // Inverter brand change -> reset capacity
  const handleInverterBrandChange = useCallback(
    (value: string) => {
      setValue('preferredInverterBrand', value);
      setValue('preferredInverterCapacityKw', undefined);
      clearCalculationIfNeeded('preferredInverterBrand');
    },
    [setValue, clearCalculationIfNeeded],
  );

  // Phase change -> reset inverter capacity
  const handlePhaseChange = useCallback(
    (value: string) => {
      setValue('phaseType', value);
      setValue('preferredInverterCapacityKw', undefined);
      clearCalculationIfNeeded('phaseType');
    },
    [setValue, clearCalculationIfNeeded],
  );

  // Generic field change that checks if calculation should be cleared
  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      setValue(fieldName as keyof QuoteBuilderFormData, value as never);
      clearCalculationIfNeeded(fieldName);
    },
    [setValue, clearCalculationIfNeeded],
  );

  return {
    handleSystemSizeChange,
    handleSelectedSubsidyIdsChange,
    handleBrandChange,
    handleInverterBrandChange,
    handlePhaseChange,
    handleTechnologyVariantSelect,
    handlePropertySelect,
    handleFieldChange,
    shouldDisableSinglePhase: systemSizeKw > 7,
    shouldShowDcrPreference: selectedSubsidyIds.length > 0,
    isDcrDisabled: selectedSubsidyIds.length === 0,
  };
}
