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
  Typography,
} from '@mui/material';
import * as React from 'react';

import type { Employee } from '@/components/features/employees/hooks/use-employees';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Generate a deterministic background color for an avatar from a name string */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 45%, 45%)`;
}

/** Get up-to-2-character initials from a full name */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

/** Derive display name from an Employee record */
function employeeDisplayName(emp: Employee): string {
  if (emp.user) {
    const name = `${emp.user.firstName ?? ''} ${emp.user.lastName ?? ''}`.trim();
    return name || emp.user.email || emp.user.phone || emp.userId;
  }
  return emp.userId;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface MUIUserAssigneeSelectorProps {
  /** Currently assigned user ID (null = unassigned) */
  value: string | null;
  /** Called with the new userId on selection, or null on unassign */
  onChange: (userId: string | null) => void;
  /** Employees to display. Pass data from useEmployees(). */
  employees: Employee[];
  /** True while employees are being fetched */
  employeesLoading?: boolean;
  /** Error message if employees failed to load */
  employeesError?: string | null;
  /** True while the assign mutation is running */
  loading?: boolean;
  /** Disables the trigger and prevents the popover from opening */
  disabled?: boolean;
  /** Shows a "Remove assignee" option when an assignee is set */
  allowUnassign?: boolean;
  /** Optional label rendered above the trigger via MUIFieldLabel pattern */
  label?: React.ReactNode;
  /** Validation error shown below the trigger */
  error?: boolean | string;
  /** Placeholder text shown on the trigger when no assignee is set */
  placeholder?: string;
  /** Popup anchor size hint — used to set min-width of the popover */
  triggerMinWidth?: number;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function MUIUserAssigneeSelector({
  value,
  onChange,
  employees,
  employeesLoading = false,
  employeesError = null,
  loading = false,
  disabled = false,
  allowUnassign = false,
  label,
  error,
  placeholder = 'Assign user',
  triggerMinWidth = 220,
}: MUIUserAssigneeSelectorProps): React.JSX.Element {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);
  const isOpen = Boolean(anchorEl);

  // Find currently assigned employee from the list
  const currentEmployee = React.useMemo(
    () => (value ? (employees.find((e) => e.userId === value) ?? null) : null),
    [value, employees],
  );
  const currentName = currentEmployee ? employeeDisplayName(currentEmployee) : null;

  // Client-side filtering
  const filtered = React.useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const name = employeeDisplayName(emp).toLowerCase();
      const email = emp.user?.email?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q);
    });
  }, [employees, search]);

  const hasError = Boolean(error);
  const errorMsg = typeof error === 'string' ? error : undefined;

  // ---- Handlers ----

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch('');
  };

  const handleSelect = (userId: string | null) => {
    onChange(userId);
    handleClose();
  };

  // Auto-focus search when popover opens
  React.useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isOpen]);

  /* ---- Trigger ---- */
  const triggerContent = (
    <Button
      ref={triggerRef}
      onClick={handleOpen}
      disabled={disabled || loading}
      variant="outlined"
      size="small"
      sx={{
        minWidth: triggerMinWidth,
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
        <CircularProgress size={16} sx={{ mr: 0.5 }} />
      ) : currentName ? (
        <Avatar
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
      <Typography
        component="span"
        sx={{
          fontSize: 'inherit',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'left',
        }}
      >
        {loading ? 'Saving…' : (currentName ?? placeholder)}
      </Typography>
    </Button>
  );

  /* ---- Full render ---- */
  return (
    <Box>
      {/* Optional label */}
      {label && (
        <Typography
          component="label"
          sx={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'text.primary',
            mb: '6px',
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      )}

      {/* Trigger button */}
      {disabled ? (
        <Tooltip title="Assignment is disabled" placement="top">
          <span>{triggerContent}</span>
        </Tooltip>
      ) : (
        triggerContent
      )}

      {/* Validation error */}
      {errorMsg && (
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'error.main',
            mt: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 13 }} />
          {errorMsg}
        </Typography>
      )}

      {/* Popover */}
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
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
            placeholder="Search by name or email…"
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

        {/* Unassign option */}
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
                <Typography sx={{ fontSize: '0.8125rem', color: 'error.main' }}>
                  Remove assignee
                </Typography>
              </ListItemButton>
            </Box>
            <Divider />
          </>
        )}

        {/* Employee list */}
        <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
          {/* Employee fetch error */}
          {employeesError && (
            <Box sx={{ px: 1.5, py: 1.5 }}>
              <Alert severity="error" variant="outlined" sx={{ fontSize: '0.8125rem' }}>
                {employeesError}
              </Alert>
            </Box>
          )}

          {/* Loading employees */}
          {!employeesError && employeesLoading && (
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
              <Typography sx={{ fontSize: '0.8125rem' }}>Loading employees…</Typography>
            </Box>
          )}

          {/* Empty — no employees at all */}
          {!employeesError && !employeesLoading && employees.length === 0 && (
            <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                No employees found in this organization.
              </Typography>
            </Box>
          )}

          {/* Empty — no search matches */}
          {!employeesError &&
            !employeesLoading &&
            employees.length > 0 &&
            filtered.length === 0 && (
              <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  No results for &ldquo;{search}&rdquo;.
                </Typography>
              </Box>
            )}

          {/* Employee rows */}
          {!employeesError && !employeesLoading && filtered.length > 0 && (
            <List dense disablePadding sx={{ px: 0.75, py: 0.75 }}>
              {filtered.map((emp) => {
                const name = employeeDisplayName(emp);
                const isSelected = emp.userId === value;
                const secondaryText = [emp.designation, emp.department].filter(Boolean).join(' · ');

                return (
                  <ListItemButton
                    key={emp.userId}
                    onClick={() => handleSelect(emp.userId)}
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
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.65rem',
                          bgcolor: stringToColor(name),
                        }}
                      >
                        {getInitials(name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={name}
                      secondary={secondaryText || undefined}
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
