'use client';

import CheckIcon from '@mui/icons-material/Check';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
  Tooltip,
} from '@mui/material';
import * as React from 'react';

import type { Employee } from '@/components/features/employees/hooks/use-employees';
import { MUITypography } from '@/components/ui/mui-typography';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 45%, 45%)`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function employeeToOption(emp: Employee): AssigneeOption {
  let displayName: string;
  if (emp.user) {
    const name = `${emp.user.firstName ?? ''} ${emp.user.lastName ?? ''}`.trim();
    displayName = name || emp.user.email || emp.user.phone || emp.userId;
  } else {
    displayName = emp.userId;
  }
  const secondaryText = [emp.designation, emp.department].filter(Boolean).join(' · ');
  return {
    id: emp.userId,
    displayName,
    secondaryText: secondaryText || undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public types                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Normalized assignee item. Callers map their domain type (Employee,
 * ProjectTeamMember, etc.) to this shape before passing to the selector.
 */
export interface AssigneeOption {
  /** Unique user / member ID — matched against `value` prop */
  id: string;
  /** Human-readable name shown in trigger and list */
  displayName: string;
  /** Optional subtitle shown below the name in the popover list */
  secondaryText?: string;
  /** Optional avatar URL; falls back to initials when absent */
  avatarUrl?: string;
}

export interface MUIUserAssigneeSelectorProps {
  /** Currently assigned ID (null = unassigned) */
  value: string | null;
  /** Called with the selected ID, or null when unassigned. Not required in readOnly mode. */
  onChange?: (userId: string | null) => void;

  // ── Generic path ───────────────────────────────────────────────────────────
  /** Normalized list of selectable members. When provided, `employees` is ignored. */
  options?: AssigneeOption[];
  /** True while `options` are being fetched */
  optionsLoading?: boolean;
  /** Error message shown in the popover when options failed to load */
  optionsError?: string | null;

  // ── Legacy path (backward-compatible) ─────────────────────────────────────
  /**
   * Employee list from `useEmployees()`.
   * Automatically converted to `AssigneeOption[]` internally.
   * Ignored when `options` is provided.
   */
  employees?: Employee[];
  /** @deprecated Use optionsLoading. Kept for backward compatibility. */
  employeesLoading?: boolean;
  /** @deprecated Use optionsError. Kept for backward compatibility. */
  employeesError?: string | null;

  // ── Behaviour ──────────────────────────────────────────────────────────────
  /** True while the assign/unassign mutation is running — shows spinner in trigger */
  loading?: boolean;
  /** Disables the trigger; prevents popover from opening */
  disabled?: boolean;
  /** Shows a "Remove assignee" option in the popover when a value is set */
  allowUnassign?: boolean;
  /**
   * Read-only display mode — renders avatar + name with no button or popover.
   * Useful for table cells and detail view headers.
   */
  readOnly?: boolean;
  /**
   * Disables MUI Portal rendering for the popover.
   * Required when used inside Radix UI Sheet/Dialog to prevent focus-trap click-through.
   */
  disablePortal?: boolean;

  // ── Presentation ───────────────────────────────────────────────────────────
  /** Optional label rendered above the trigger */
  label?: React.ReactNode;
  /** Validation error shown below the trigger */
  error?: boolean | string;
  /** Placeholder shown on the trigger when no assignee is set */
  placeholder?: string;
  /** Sets min-width of the trigger button and popover */
  triggerMinWidth?: number;
  /** Search field placeholder text */
  searchPlaceholder?: string;
  /** Message shown when the options list is empty */
  emptyText?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function MUIUserAssigneeSelector({
  value,
  onChange,
  options,
  optionsLoading,
  optionsError,
  employees = [],
  employeesLoading,
  employeesError,
  loading = false,
  disabled = false,
  allowUnassign = false,
  readOnly = false,
  disablePortal = false,
  label,
  error,
  placeholder = 'Assign user',
  triggerMinWidth = 220,
  searchPlaceholder = 'Search by name…',
  emptyText,
}: MUIUserAssigneeSelectorProps): React.JSX.Element {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);
  const isOpen = Boolean(anchorEl);

  // Resolve which data source to use: explicit options take priority over employees
  const resolvedOptions = React.useMemo<AssigneeOption[]>(
    () => options ?? employees.map(employeeToOption),
    [options, employees],
  );

  // Resolve loading / error from either prop set
  const isOptionsLoading = optionsLoading ?? employeesLoading ?? false;
  const optionsErrorMsg = optionsError ?? employeesError ?? null;

  // Find the currently assigned option
  const currentOption = React.useMemo(
    () => (value ? (resolvedOptions.find((o) => o.id === value) ?? null) : null),
    [value, resolvedOptions],
  );
  const currentName = currentOption?.displayName ?? null;

  // Client-side search filtering — searches displayName and secondaryText
  const filtered = React.useMemo(() => {
    if (!search.trim()) return resolvedOptions;
    const q = search.trim().toLowerCase();
    return resolvedOptions.filter(
      (o) =>
        o.displayName.toLowerCase().includes(q) ||
        (o.secondaryText?.toLowerCase().includes(q) ?? false),
    );
  }, [resolvedOptions, search]);

  const hasError = Boolean(error);
  const errorMsg = typeof error === 'string' ? error : undefined;
  const resolvedEmptyText = emptyText ?? 'No members found.';

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || readOnly) return;
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch('');
  };

  const handleSelect = (id: string | null) => {
    onChange?.(id);
    handleClose();
  };

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isOpen]);

  // ── Read-only display mode ───────────────────────────────────────────────────

  if (readOnly) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {currentName ? (
          <>
            <Avatar
              src={currentOption?.avatarUrl}
              sx={{
                width: 24,
                height: 24,
                fontSize: '0.65rem',
                bgcolor: stringToColor(currentName),
                flexShrink: 0,
              }}
            >
              {getInitials(currentName)}
            </Avatar>
            <MUITypography
              variant="bodyPrimary"
              component="span"
              noWrap
            >
              {currentName}
            </MUITypography>
          </>
        ) : (
          <MUITypography variant="placeholder" component="span">
            {placeholder}
          </MUITypography>
        )}
      </Box>
    );
  }

  // ── Interactive trigger ──────────────────────────────────────────────────────

  const triggerContent = (
    <Button
      onClick={handleOpen}
      disabled={disabled || loading}
      variant="outlined"
      size="small"
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1,
        px: 1.25,
        py: 0.75,
        borderColor: hasError ? 'error.main' : 'divider',
        color: currentName ? 'text.primary' : 'text.secondary',
        fontWeight: 400,
        fontSize: '0.8125rem',
        textTransform: 'none',
        '&:hover': {
          borderColor: hasError ? 'error.main' : 'primary.main',
          backgroundColor: 'action.hover',
        },
        '&.Mui-disabled': {
          borderColor: 'divider',
          color: 'text.disabled',
        },
      }}
    >
      {loading ? (
        <CircularProgress size={16} sx={{ mr: 0.5, flexShrink: 0 }} />
      ) : currentName ? (
        <Avatar
          src={currentOption?.avatarUrl}
          sx={{
            width: 22,
            height: 22,
            fontSize: '0.6rem',
            bgcolor: stringToColor(currentName),
            flexShrink: 0,
          }}
        >
          {getInitials(currentName)}
        </Avatar>
      ) : (
        <PersonAddOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
      )}
      <MUITypography
        variant="inherit"
        component="span"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'left',
        }}
      >
        {loading ? 'Saving…' : (currentName ?? placeholder)}
      </MUITypography>
    </Button>
  );

  // ── Full render ──────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Optional label */}
      {label && (
        <MUITypography
          variant="bodyPrimary"
          component="label"
          sx={{ fontWeight: 500, mb: '6px', lineHeight: 1 }}
        >
          {label}
        </MUITypography>
      )}

      {/* Trigger — wrapped in Tooltip when disabled */}
      {disabled ? (
        <Tooltip title="Assignment is disabled" placement="top">
          <span style={{ display: 'block' }}>{triggerContent}</span>
        </Tooltip>
      ) : (
        triggerContent
      )}

      {/* Validation error */}
      {errorMsg && (
        <MUITypography
          variant="alertTitle"
          component="span"
          sx={{
            color: 'error.main',
            mt: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 13 }} />
          {errorMsg}
        </MUITypography>
      )}

      {/* Popover */}
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        disablePortal={disablePortal}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 4,
            sx: {
              mt: 0.5,
              minWidth: triggerMinWidth,
              maxWidth: 320,
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Search bar */}
        <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
          <TextField
            inputRef={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
          />
        </Box>

        {/* Unassign option — only when allowUnassign=true and a value is set */}
        {allowUnassign && value && (
          <>
            <Box sx={{ px: 1.5, pb: 0.5 }}>
              <ListItemButton
                onClick={() => handleSelect(null)}
                dense
                sx={{
                  borderRadius: 1,
                  px: 1,
                  gap: 1,
                  '&:hover': { backgroundColor: 'error.50', color: 'error.main' },
                }}
              >
                <PersonRemoveOutlinedIcon
                  sx={{ fontSize: 16, color: 'error.main', flexShrink: 0 }}
                />
                <MUITypography variant="body" component="span" sx={{ color: 'error.main' }}>
                  Remove assignee
                </MUITypography>
              </ListItemButton>
            </Box>
            <Divider />
          </>
        )}

        {/* Options list */}
        <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
          {/* Error state */}
          {optionsErrorMsg && (
            <Box sx={{ px: 1.5, py: 1.5 }}>
              <Alert severity="error" variant="outlined" sx={{ fontSize: '0.8125rem' }}>
                {optionsErrorMsg}
              </Alert>
            </Box>
          )}

          {/* Loading state */}
          {!optionsErrorMsg && isOptionsLoading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                py: 3,
                color: 'text.secondary',
              }}
            >
              <CircularProgress size={22} />
              <MUITypography variant="body">Loading…</MUITypography>
            </Box>
          )}

          {/* Empty — no options at all */}
          {!optionsErrorMsg && !isOptionsLoading && resolvedOptions.length === 0 && (
            <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
              <MUITypography variant="body">
                {resolvedEmptyText}
              </MUITypography>
            </Box>
          )}

          {/* Empty — no search matches */}
          {!optionsErrorMsg &&
            !isOptionsLoading &&
            resolvedOptions.length > 0 &&
            filtered.length === 0 && (
              <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                <MUITypography variant="body">
                  No results for &ldquo;{search}&rdquo;.
                </MUITypography>
              </Box>
            )}

          {/* Option rows */}
          {!optionsErrorMsg && !isOptionsLoading && filtered.length > 0 && (
            <List dense disablePadding sx={{ px: 0.75, py: 0.75 }}>
              {filtered.map((option) => {
                const isSelected = option.id === value;
                return (
                  <ListItemButton
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    dense
                    selected={isSelected}
                    sx={{
                      borderRadius: 1,
                      px: 1,
                      mb: 0.25,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.50',
                        '&:hover': { backgroundColor: 'primary.100' },
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <Avatar
                        src={option.avatarUrl}
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.65rem',
                          bgcolor: stringToColor(option.displayName),
                        }}
                      >
                        {getInitials(option.displayName)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={option.displayName}
                      secondary={option.secondaryText}
                      primaryTypographyProps={{
                        noWrap: true,
                        sx: { fontSize: '0.8125rem', fontWeight: isSelected ? 600 : 400 },
                      }}
                      secondaryTypographyProps={{
                        noWrap: true,
                        sx: { fontSize: '0.7rem' },
                      }}
                    />
                    {isSelected && (
                      <CheckIcon
                        sx={{ fontSize: 15, color: 'primary.main', flexShrink: 0, ml: 0.5 }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>
      </Popover>
    </Box>
  );
}
