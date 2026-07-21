'use client';

import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import { useState, useRef, useCallback } from 'react';

import { MUIAvatar, MUIInput, MUITypography } from '@/components/ui';
import { useDebounce } from '@/lib/hooks';
import { type Customer, useCustomerSearch } from '@/lib/hooks/resources';

// ── Props ──────────────────────────────────────────────────────

interface CustomerSearchChipProps {
  selectedCustomer: Customer | null; // eslint-disable-line @typescript-eslint/no-redundant-type-constituents
  onSelect: (customer: Customer) => void;
  onClear: () => void;
  error?: string;
}

// ── Component ─────────────────────────────────────────────────

export function CustomerSearchChip({
  selectedCustomer,
  onSelect,
  onClear,
  error,
}: CustomerSearchChipProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(search, 400);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const { items: customers, isFetching } = useCustomerSearch(
    debouncedSearch.length >= 2 ? debouncedSearch : '',
  );

  const handleSelect = useCallback(
    (c: Customer) => {
      onSelect(c);
      setSearch('');
      setShowDropdown(false);
    },
    [onSelect],
  );

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => setShowDropdown(false), 150);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setShowDropdown(true);
  }, []);

  if (selectedCustomer) {
    const fullName = `${selectedCustomer.firstName} ${selectedCustomer.lastName ?? ''}`.trim();
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary">
        <MUIAvatar name={fullName} size="sm" />
        <div className="flex-1 min-w-0">
          <MUITypography variant="bodyPrimary" noWrap>
            {fullName}
          </MUITypography>
          <MUITypography variant="timestamp" className="text-foreground-secondary">
            {selectedCustomer.phone}
            {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ''}
          </MUITypography>
        </div>
        <IconButton size="small" onClick={onClear} aria-label="Clear customer selection">
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    );
  }

  const showList = showDropdown && debouncedSearch.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <MUIInput
        fieldLabel="Search customer"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search by name, phone, or email…"
        startIcon={<SearchIcon fontSize="small" />}
        loading={isFetching}
        error={error}
        fullWidth
      />

      {showList && (
        <Paper
          elevation={4}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-lg"
        >
          {customers.length === 0 && !isFetching ? (
            <div className="p-3">
              <MUITypography variant="body" className="text-foreground-secondary">
                No customers found
              </MUITypography>
            </div>
          ) : (
            customers.map((c) => {
              const fullName = `${c.firstName} ${c.lastName ?? ''}`.trim();
              return (
                <button
                  key={c.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 hover:bg-background-secondary transition-colors text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(c);
                  }}
                >
                  <MUIAvatar name={fullName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <MUITypography variant="bodyPrimary" noWrap>
                      {fullName}
                    </MUITypography>
                    <MUITypography variant="timestamp" className="text-foreground-secondary">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ''}
                    </MUITypography>
                  </div>
                </button>
              );
            })
          )}
        </Paper>
      )}
    </div>
  );
}
