'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Autocomplete,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
  type AutocompleteProps,
  type TextFieldProps,
} from '@mui/material';
import * as React from 'react';

import { MUIAvatar } from './mui-avatar';
import { MUIFieldLabel, mergeRefs } from './mui-shared';

/* -------------------------------------------------------------------------- */
/*  Option types                                                               */
/* -------------------------------------------------------------------------- */

type SelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type SearchOption =
  | string
  | { label?: string; value?: string; disabled?: boolean; [key: string]: unknown };

/* -------------------------------------------------------------------------- */
/*  Shared extras                                                              */
/* -------------------------------------------------------------------------- */

type CommonExtras = {
  /** String → shown as helper text + error state; boolean → error state only */
  error?: boolean | string;
  success?: boolean | string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onEndIconClick?: () => void;
  loading?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  /** Label rendered above the input */
  fieldLabel?: React.ReactNode;
  /** Marks the label with a red asterisk */
  required?: boolean;
  /** Info tooltip shown next to the label */
  tooltip?: React.ReactNode;
};

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

type BaseFieldProps = CommonExtras &
  Omit<TextFieldProps, 'error' | 'label'> & {
    mode?: 'text' | 'select';
    options?: SelectOption[];
  };

type AutocompleteModeProps = CommonExtras &
  Omit<
    AutocompleteProps<SearchOption, false, boolean, boolean>,
    | 'renderInput'
    | 'options'
    | 'value'
    | 'onChange'
    | 'inputValue'
    | 'onInputChange'
    | 'loading'
    | 'disableClearable'
  > & {
    mode: 'autocomplete';
    options: SearchOption[];
    value: SearchOption | null;
    onChange: (value: SearchOption | null) => void;
    inputValue?: string;
    onInputChange?: (value: string) => void;
    textFieldProps?: Omit<TextFieldProps, 'value' | 'onChange' | 'label'>;
    disableClearable?: boolean;
    /**
     * When true each dropdown option renders a MUIAvatar beside the label.
     * The avatar name is read from the option's `label` field (or the string itself).
     * Pair with `secondaryTextKey` to show a subtitle (e.g. phone number).
     */
    showAvatar?: boolean;
    /**
     * Key of the option object whose value is used as the avatar image URL.
     * Falls back to initials when the key is missing or the URL is falsy.
     * Only relevant when `showAvatar` is true.
     * @default 'avatarUrl'
     */
    avatarUrlKey?: string;
    /**
     * Key of the option object whose value is shown as the secondary line
     * (subtitle) under the main label in the dropdown.
     * Only relevant when `showAvatar` is true.
     * @default 'secondaryText'
     */
    secondaryTextKey?: string;
  };

export type MUIInputProps = BaseFieldProps | AutocompleteModeProps;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const defaultGetOptionLabel = (option: SearchOption): string => {
  if (typeof option === 'string') return option;
  return option.label ?? option.value ?? '';
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

const MUIInputInner = (
  props: MUIInputProps,
  ref: React.ForwardedRef<HTMLInputElement>,
): React.JSX.Element => {
  const { error, success, startIcon, endIcon, onEndIconClick, loading, clearable, onClear } = props;
  const disabled = props.disabled ?? false;
  const { fieldLabel, required: labelRequired, tooltip } = props;

  const hasError = Boolean(error);
  const errorMsg = typeof error === 'string' ? error : undefined;
  const successMsg = typeof success === 'string' ? success : undefined;

  const buildEnd = (existing?: React.ReactNode, showClear?: boolean): React.ReactNode => (
    <>
      {loading && (
        <InputAdornment position="end">
          <CircularProgress size={18} />
        </InputAdornment>
      )}
      {showClear && (
        <InputAdornment position="end">
          <IconButton
            aria-label="Clear"
            size="small"
            onClick={onClear}
            disabled={disabled}
            edge="end"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </InputAdornment>
      )}
      {endIcon && (
        <InputAdornment position="end">
          {onEndIconClick ? (
            <IconButton size="small" onClick={onEndIconClick} edge="end">
              {endIcon}
            </IconButton>
          ) : (
            endIcon
          )}
        </InputAdornment>
      )}
      {existing}
    </>
  );

  const buildStart = (existing?: React.ReactNode): React.ReactNode | undefined => {
    if (!startIcon) return existing;
    return (
      <>
        <InputAdornment position="start">{startIcon}</InputAdornment>
        {existing}
      </>
    );
  };

  /* ---- Autocomplete mode ---- */
  if (props.mode === 'autocomplete') {
    /* eslint-disable @typescript-eslint/no-unused-vars -- strip CommonExtras from rest */
    const {
      mode,
      error: ce,
      success: cs,
      startIcon: csi,
      endIcon: cei,
      onEndIconClick: coe,
      loading: cl,
      clearable: ccl,
      onClear: coc,
      step: cst,
      min: cmn,
      max: cmx,
      fieldLabel: cfl,
      required: creq,
      tooltip: ctt,
      options,
      value,
      onChange,
      getOptionLabel = defaultGetOptionLabel,
      isOptionEqualToValue,
      freeSolo = false,
      inputValue,
      onInputChange,
      noOptionsText,
      loadingText,
      textFieldProps,
      disableClearable,
      showAvatar = false,
      avatarUrlKey = 'avatarUrl',
      secondaryTextKey = 'secondaryText',
      renderOption: callerRenderOption,
      ...autocompleteProps
    } = props;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    const tfProps = textFieldProps ?? {};
    const color: TextFieldProps['color'] =
      tfProps.color ?? (hasError ? 'error' : success ? 'success' : 'primary');
    const helperText = tfProps.helperText ?? errorMsg ?? successMsg;
    const mergedRef = mergeRefs<HTMLInputElement>(tfProps.inputRef, ref);

    // Avatar renderOption — only used when showAvatar=true and caller didn't supply their own
    const avatarRenderOption = showAvatar
      ? (
          optionProps: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key },
          option: SearchOption,
        ): React.ReactNode => {
          // Destructure key out so it is NOT spread — we set our own unique key below.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { key, ...liProps } = optionProps;
          const label = defaultGetOptionLabel(option);
          const optObj = typeof option === 'object' ? (option as Record<string, unknown>) : null;
          // Use the option's `value` field as the key — it must be unique (e.g. entity ID).
          // Falls back to label only when `value` is absent (e.g. plain string options).
          const uniqueKey = (optObj?.['value'] as string | undefined) ?? label;
          const avatarSrc = (optObj?.[avatarUrlKey] as string | undefined) ?? '';
          const secondary = (optObj?.[secondaryTextKey] as string | undefined) ?? '';
          return (
            <Box
              key={uniqueKey}
              component="li"
              {...liProps}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 0.75 }}
            >
              <MUIAvatar
                name={label}
                src={avatarSrc || undefined}
                size="sm"
                sx={{ flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                  {label}
                </Typography>
                {secondary && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: 'text.secondary', lineHeight: 1.2 }}
                  >
                    {secondary}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        }
      : undefined;

    const resolvedRenderOption = callerRenderOption ?? avatarRenderOption;

    return (
      <div>
        <MUIFieldLabel fieldLabel={fieldLabel} required={labelRequired} tooltip={tooltip} />
        <Autocomplete
          options={options}
          value={value}
          freeSolo={freeSolo}
          disableClearable={typeof clearable === 'boolean' ? !clearable : disableClearable}
          getOptionLabel={getOptionLabel}
          isOptionEqualToValue={isOptionEqualToValue}
          inputValue={inputValue}
          onInputChange={(_, v) => onInputChange?.(v)}
          onChange={(_, v, reason) => {
            onChange(v);
            if (reason === 'clear') onClear?.();
          }}
          loading={loading}
          noOptionsText={noOptionsText}
          loadingText={loadingText}
          renderOption={resolvedRenderOption}
          renderInput={(params) => (
            <TextField
              {...params}
              {...tfProps}
              inputRef={mergedRef}
              color={color}
              error={hasError}
              helperText={helperText}
              InputProps={{
                ...params.InputProps,
                ...tfProps.InputProps,
                startAdornment: buildStart(
                  <>
                    {tfProps.InputProps?.startAdornment}
                    {params.InputProps.startAdornment}
                  </>,
                ),
                endAdornment: buildEnd(
                  <>
                    {tfProps.InputProps?.endAdornment}
                    {params.InputProps.endAdornment}
                  </>,
                  false,
                ),
              }}
            />
          )}
          {...autocompleteProps}
        />
      </div>
    );
  }

  /* ---- Text / Select mode ---- */
  /* eslint-disable @typescript-eslint/no-unused-vars -- strip label props from TextField rest */
  const {
    mode,
    options,
    step,
    min,
    max,
    InputProps: inputProps,
    inputProps: nativeInputProps,
    children,
    color,
    helperText,
    inputRef,
    fieldLabel: stripLabel,
    required: stripReq,
    tooltip: stripTip,
    ref: registerRef,
    // Strip CommonExtras that must not reach the DOM
    error: stripError,
    success: stripSuccess,
    startIcon: stripStartIcon,
    endIcon: stripEndIcon,
    onEndIconClick: stripOnEndIconClick,
    loading: stripLoading,
    clearable: stripClearable,
    onClear: stripOnClear,
    ...textFieldProps
  } = props as BaseFieldProps & { ref?: React.Ref<HTMLInputElement> };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const selectOptions = mode === 'select' ? options : undefined;
  const resolvedColor: TextFieldProps['color'] =
    color ?? (hasError ? 'error' : success ? 'success' : 'primary');
  const resolvedHelper = helperText ?? errorMsg ?? successMsg;
  const hasVal =
    textFieldProps.value !== undefined &&
    textFieldProps.value !== null &&
    !(typeof textFieldProps.value === 'string' && textFieldProps.value.length === 0);
  const showClear = Boolean(clearable) && Boolean(onClear) && hasVal;
  const mergedRef = mergeRefs<HTMLInputElement>(inputRef, ref, registerRef);

  const resolvedChildren =
    mode === 'select' && selectOptions && selectOptions.length > 0 && !children
      ? selectOptions.map((o) => (
          <MenuItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </MenuItem>
        ))
      : children;

  return (
    <div>
      <MUIFieldLabel
        fieldLabel={fieldLabel}
        required={labelRequired}
        tooltip={tooltip}
        htmlFor={textFieldProps.id}
      />
      <TextField
        {...textFieldProps}
        inputRef={mergedRef}
        select={mode === 'select'}
        color={resolvedColor}
        error={hasError}
        helperText={resolvedHelper}
        InputProps={{
          ...inputProps,
          startAdornment: buildStart(inputProps?.startAdornment),
          endAdornment: buildEnd(inputProps?.endAdornment, showClear),
        }}
        inputProps={{ ...nativeInputProps, step, min, max }}
      >
        {resolvedChildren}
      </TextField>
    </div>
  );
};

export const MUIInput = React.forwardRef<HTMLInputElement, MUIInputProps>(MUIInputInner);
MUIInput.displayName = 'MUIInput';
