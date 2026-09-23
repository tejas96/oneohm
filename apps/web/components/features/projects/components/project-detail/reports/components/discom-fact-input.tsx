'use client';

import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useMemo } from 'react';

import { useDiscomById, useDiscoms } from '@/components/features/properties/hooks/use-discoms';

interface DiscomOption {
  value: string;
  label: string;
}

interface DiscomFactInputProps {
  inputId: string;
  /** DISCOM id, or '' when the site has none. */
  value: string;
  error: string | null;
  /** Under the field: the error, plus Undo on a held value. */
  helper?: React.ReactNode;
  saving: boolean;
  onPick: (discomId: string) => void;
}

/**
 * The site form's DISCOM picker, as a Reports tab field: active DISCOMs, plus
 * the site's current one when it has since been made inactive, so the stored
 * value always shows. Picking saves at once, like Category.
 */
export function DiscomFactInput({
  inputId,
  value,
  error,
  helper,
  saving,
  onPick,
}: DiscomFactInputProps): React.JSX.Element {
  const { data: discoms = [], isLoading, isError } = useDiscoms();
  const { data: current } = useDiscomById(value || undefined);

  const options = useMemo<DiscomOption[]>(() => {
    const list = discoms.map((discom) => ({ value: discom.id, label: discom.label }));
    if (current && !list.some((option) => option.value === current.id)) {
      list.unshift({ value: current.id, label: current.label });
    }
    return list;
  }, [discoms, current]);

  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Autocomplete
      size="small"
      fullWidth
      options={options}
      value={selected}
      readOnly={saving}
      disableClearable={!!selected}
      isOptionEqualToValue={(option, picked) => option.value === picked.value}
      onChange={(_, option) => {
        if (option) onPick(option.value);
      }}
      loading={isLoading}
      loadingText="Loading DISCOM list…"
      noOptionsText={isError ? 'Failed to load DISCOM list' : 'No DISCOM available'}
      renderInput={(params) => (
        <TextField
          {...params}
          id={inputId}
          placeholder="Not set"
          error={!!error}
          helperText={helper ?? error ?? undefined}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {saving ? <CircularProgress size={14} aria-label="Saving" /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
