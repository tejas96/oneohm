'use client';

import CheckIcon from '@mui/icons-material/Check';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type MouseEvent,
  type ReactNode,
} from 'react';

import type { Employee } from '@/components/features/employees/hooks/use-employees';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIFieldLabel } from '@/components/ui/mui-shared';
import { MUITypography } from '@/components/ui/mui-typography';
import {
  MUI_INPUT_HEIGHT,
  MUI_FONT_SIZE,
  MUI_BORDER_RADIUS,
  MUI_BORDER_COLOR,
} from '@/lib/theme/mui-theme';

/* -------------------------------------------------------------------------- */
/*  MUIAvatarGroup — public types                                              */
/* -------------------------------------------------------------------------- */

/** Shape required by MUIAvatarGroup — intentionally minimal */
export interface MUIAvatarGroupMember {
  /** Unique ID — matched against `selectedIds` */
  id: string;
  /** Full display name used for initials and tooltip */
  displayName: string;
  /** Optional initials override (e.g. '?' for unassigned) */
  initials?: string;
  /** Optional avatar image URL */
  avatarUrl?: string;
}

export interface MUIAvatarGroupProps {
  /** List of members to display */
  members: MUIAvatarGroupMember[];
  /**
   * Maximum number of avatars to show inline before collapsing into "+N" overflow.
   * @default 4
   */
  max?: number;
  /**
   * Avatar diameter in pixels.
   * @default 28
   */
  size?: number;
  /**
   * When true, avatars can be clicked to toggle selection (filter mode).
   * Requires `selectedIds` and `onToggle`.
   */
  selectable?: boolean;
  /** Set of currently selected member IDs */
  selectedIds?: Set<string>;
  /** Called when a member avatar or overflow-list item is clicked (selectable mode only) */
  onToggle?: (memberId: string) => void;
  /** When provided, a "Clear" button appears next to the group when any avatar is selected */
  onClear?: () => void;
  /** Shown when `members` is empty */
  emptyText?: string;
}

/* -------------------------------------------------------------------------- */
/*  MUIAvatarGroup — component                                                 */
/* -------------------------------------------------------------------------- */

export function MUIAvatarGroup({
  members,
  max = 4,
  size = 28,
  selectable = false,
  selectedIds,
  onToggle,
  onClear,
  emptyText = 'No members',
}: MUIAvatarGroupProps): JSX.Element {
  const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(null);
  const overflowOpen = Boolean(overflowAnchor);

  if (members.length === 0) {
    return (
      <MUITypography variant="body" sx={{ color: 'text.disabled' }}>
        {emptyText}
      </MUITypography>
    );
  }

  const visible = members.slice(0, max);
  const overflow = members.slice(max);
  const hasOverflow = overflow.length > 0;
  const hasSelection = selectable && selectedIds && selectedIds.size > 0;
  const overlap = Math.round(size * 0.3);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {/* Stacked visible avatars */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {visible.map((member, idx) => {
          const isSelected = selectedIds?.has(member.id) ?? false;
          return (
            <Tooltip key={member.id} title={member.displayName} placement="top" arrow>
              <MUIAvatar
                name={member.displayName}
                initials={member.initials}
                src={member.avatarUrl}
                size={size}
                onClick={selectable ? () => onToggle?.(member.id) : undefined}
                sx={{
                  ml: idx === 0 ? 0 : `-${overlap}px`,
                  border: '2px solid',
                  borderColor: 'background.paper',
                  transition: 'transform 0.15s',
                  zIndex: visible.length - idx,
                  cursor: selectable ? 'pointer' : 'default',
                  outline: isSelected ? '2px solid' : 'none',
                  outlineColor: 'primary.main',
                  outlineOffset: '1px',
                  '&:hover': selectable ? { transform: 'scale(1.1)', zIndex: 20 } : {},
                }}
              />
            </Tooltip>
          );
        })}

        {/* "+N" overflow trigger */}
        {hasOverflow && (
          <Tooltip title={`${overflow.length} more — click to view all`} placement="top" arrow>
            <MUIAvatar
              name=""
              initials={`+${overflow.length}`}
              size={size}
              onClick={(e: MouseEvent<HTMLElement>) => setOverflowAnchor(e.currentTarget)}
              sx={{
                ml: `-${overlap}px`,
                border: '2px solid',
                borderColor: 'background.paper',
                transition: 'transform 0.15s',
                bgcolor: 'action.selected',
                color: 'text.secondary',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 0,
                '&:hover': { bgcolor: 'action.focus', transform: 'scale(1.08)', zIndex: 20 },
              }}
            />
          </Tooltip>
        )}
      </Box>

      {/* Clear selection */}
      {hasSelection && onClear && (
        <Box
          component="button"
          type="button"
          onClick={onClear}
          sx={{
            background: 'none',
            border: 'none',
            p: 0,
            cursor: 'pointer',
            color: 'text.secondary',
            typography: 'caption',
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            ml: 0.5,
            '&:hover': { color: 'text.primary' },
          }}
        >
          ✕ Clear
        </Box>
      )}

      {/* Overflow popover — lists ALL members */}
      <Popover
        open={overflowOpen}
        anchorEl={overflowAnchor}
        onClose={() => setOverflowAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 4,
            sx: {
              mt: 0.5,
              minWidth: 180,
              maxWidth: 240,
              borderRadius: 1.5,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
          <MUITypography variant="body" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            All members ({members.length})
          </MUITypography>
        </Box>
        <List dense disablePadding sx={{ px: 0.75, pb: 0.75 }}>
          {members.map((member) => {
            const isSelected = selectedIds?.has(member.id) ?? false;
            return (
              <ListItemButton
                key={member.id}
                onClick={
                  selectable
                    ? () => {
                        onToggle?.(member.id);
                        setOverflowAnchor(null);
                      }
                    : undefined
                }
                dense
                selected={isSelected}
                sx={{
                  borderRadius: 1,
                  px: 1,
                  mb: 0.25,
                  cursor: selectable ? 'pointer' : 'default',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                    '&:hover': { backgroundColor: 'action.focus' },
                  },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 36 }}>
                  <MUIAvatar
                    name={member.displayName}
                    initials={member.initials}
                    src={member.avatarUrl}
                    size={28}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={member.displayName}
                  primaryTypographyProps={{
                    noWrap: true,
                    variant: 'body2',
                    sx: { fontWeight: isSelected ? 600 : 400 },
                  }}
                />
                {isSelected && (
                  <CheckIcon sx={{ fontSize: 15, color: 'primary.main', flexShrink: 0, ml: 0.5 }} />
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Popover>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  MUIUserAssigneeSelector — public types                                     */
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
  /**
   * Elevates the options popover above nested panels (e.g. table filter popovers ~1300).
   */
  popoverZIndex?: number;
  /** Where the options popover opens relative to the trigger */
  popoverPlacement?: 'above' | 'below';

  // ── Presentation ───────────────────────────────────────────────────────────
  /** Label rendered above the trigger — uses shared MUIFieldLabel for consistent sizing */
  fieldLabel?: ReactNode;
  /** @deprecated Use fieldLabel. Kept for backward compatibility. */
  label?: ReactNode;
  /** Marks the label with a red asterisk */
  required?: boolean;
  /** Info tooltip shown next to the label */
  tooltip?: ReactNode;
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
/*  MUIUserAssigneeSelector — component                                        */
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
  popoverZIndex,
  popoverPlacement = 'below',
  fieldLabel,
  label,
  required,
  tooltip,
  error,
  placeholder = 'Assign user',
  triggerMinWidth = 220,
  searchPlaceholder = 'Search by name…',
  emptyText,
}: MUIUserAssigneeSelectorProps): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const isOpen = Boolean(anchorEl);

  // Explicit options take priority over legacy employees prop
  const resolvedOptions = useMemo<AssigneeOption[]>(
    () => options ?? employees.map(employeeToOption),
    [options, employees],
  );

  const isOptionsLoading = optionsLoading ?? employeesLoading ?? false;
  const optionsErrorMsg = optionsError ?? employeesError ?? null;

  const currentOption = useMemo(
    () => (value ? (resolvedOptions.find((o) => o.id === value) ?? null) : null),
    [value, resolvedOptions],
  );
  const currentName = currentOption?.displayName ?? null;

  const filtered = useMemo(() => {
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

  useEffect(() => {
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
            <MUIAvatar
              name={currentName}
              src={currentOption?.avatarUrl}
              size="sm"
              sx={{ flexShrink: 0 }}
            />
            <MUITypography variant="bodyPrimary" component="span" noWrap>
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
      onClick={(e) => {
        setAnchorEl(e.currentTarget);
      }}
      disabled={disabled || loading}
      variant="outlined"
      size="small"
      sx={{
        width: '100%',
        height: MUI_INPUT_HEIGHT,
        justifyContent: 'flex-start',
        gap: 1,
        px: 1.25,
        borderRadius: `${MUI_BORDER_RADIUS}px`,
        borderColor: hasError ? 'error.main' : MUI_BORDER_COLOR,
        color: currentName ? 'text.primary' : 'text.secondary',
        fontWeight: 400,
        textTransform: 'none',
        fontSize: MUI_FONT_SIZE,
        '&:hover': {
          borderColor: hasError ? 'error.main' : 'primary.main',
          backgroundColor: 'action.hover',
        },
        '&.Mui-disabled': { borderColor: 'divider', color: 'text.disabled' },
      }}
    >
      {loading ? (
        <CircularProgress size={16} sx={{ mr: 0.5, flexShrink: 0 }} />
      ) : currentName ? (
        <MUIAvatar
          name={currentName}
          src={currentOption?.avatarUrl}
          size={22}
          sx={{ flexShrink: 0 }}
        />
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

  const resolvedLabel = fieldLabel ?? label;

  return (
    <Box>
      <MUIFieldLabel fieldLabel={resolvedLabel} required={required} tooltip={tooltip} />

      {disabled ? (
        <Tooltip title="Assignment is disabled" placement="top">
          <Box component="span" sx={{ display: 'block' }}>
            {triggerContent}
          </Box>
        </Tooltip>
      ) : (
        triggerContent
      )}

      {errorMsg && (
        <MUITypography
          variant="alertTitle"
          component="span"
          sx={{ color: 'error.main', mt: '4px', display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <WarningAmberIcon sx={{ fontSize: 13 }} />
          {errorMsg}
        </MUITypography>
      )}

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
          setSearch('');
        }}
        disablePortal={disablePortal}
        anchorOrigin={{
          vertical: popoverPlacement === 'above' ? 'top' : 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: popoverPlacement === 'above' ? 'bottom' : 'top',
          horizontal: 'left',
        }}
        slotProps={{
          root: popoverZIndex !== undefined ? { sx: { zIndex: popoverZIndex } } : undefined,
          paper: {
            elevation: 4,
            sx: {
              ...(popoverPlacement === 'above' ? { mb: 0.5 } : { mt: 0.5 }),
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
        {/* Search */}
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
            sx={{ '& .MuiInputBase-input': { typography: 'body2' } }}
          />
        </Box>

        {/* Unassign option */}
        {allowUnassign && value && (
          <>
            <Box sx={{ px: 1.5, pb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  onChange?.(null);
                  setAnchorEl(null);
                  setSearch('');
                }}
                dense
                sx={{
                  borderRadius: 1,
                  px: 1,
                  gap: 1,
                  '&:hover': { backgroundColor: 'rgba(220,38,38,0.08)', color: 'error.main' },
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
          {optionsErrorMsg && (
            <Box sx={{ px: 1.5, py: 1.5 }}>
              <Alert severity="error" variant="outlined" sx={{ typography: 'body2' }}>
                {optionsErrorMsg}
              </Alert>
            </Box>
          )}

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

          {!optionsErrorMsg && !isOptionsLoading && resolvedOptions.length === 0 && (
            <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
              <MUITypography variant="body">{resolvedEmptyText}</MUITypography>
            </Box>
          )}

          {!optionsErrorMsg &&
            !isOptionsLoading &&
            resolvedOptions.length > 0 &&
            filtered.length === 0 && (
              <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                <MUITypography variant="body">No results for &ldquo;{search}&rdquo;.</MUITypography>
              </Box>
            )}

          {!optionsErrorMsg && !isOptionsLoading && filtered.length > 0 && (
            <List dense disablePadding sx={{ px: 0.75, py: 0.75 }}>
              {filtered.map((option) => {
                const isSelected = option.id === value;
                return (
                  <ListItemButton
                    key={option.id}
                    onClick={() => {
                      onChange?.(option.id);
                      setAnchorEl(null);
                      setSearch('');
                    }}
                    dense
                    selected={isSelected}
                    sx={{
                      borderRadius: 1,
                      px: 1,
                      mb: 0.25,
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                        '&:hover': { backgroundColor: 'action.focus' },
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <MUIAvatar name={option.displayName} src={option.avatarUrl} size={28} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={option.displayName}
                      secondary={option.secondaryText}
                      primaryTypographyProps={{
                        noWrap: true,
                        variant: 'body2',
                        sx: { fontWeight: isSelected ? 600 : 400 },
                      }}
                      secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
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

/* -------------------------------------------------------------------------- */
/*  Private helpers                                                            */
/* -------------------------------------------------------------------------- */

function employeeToOption(emp: Employee): AssigneeOption {
  let displayName: string;
  if (emp.user) {
    const name = `${emp.user.firstName ?? ''} ${emp.user.lastName ?? ''}`.trim();
    displayName = name || emp.user.email || emp.user.phone || emp.userId;
  } else {
    displayName = emp.userId;
  }
  const secondaryText = [emp.designation, emp.department].filter(Boolean).join(' · ');
  return { id: emp.userId, displayName, secondaryText: secondaryText || undefined };
}
