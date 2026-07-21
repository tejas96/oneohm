'use client';

import { Users } from 'lucide-react';
import * as React from 'react';

import { SearchInput, type SearchResult, type SearchResultGroup } from './search-input';

import { getInitials } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

export interface CustomerSearchComboboxProps {
  /** Pre-loaded customers for filtering */
  customers: Customer[];
  /** Currently selected customer */
  value?: Customer | null;
  /** Called when customer is selected */
  onSelect: (customer: Customer | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function searchCustomers(customers: Customer[], query: string): Customer[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return customers
    .filter((customer) => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
      const phone = customer.phone.toLowerCase();
      const email = customer.email?.toLowerCase() || '';

      return (
        fullName.includes(lowerQuery) || phone.includes(lowerQuery) || email.includes(lowerQuery)
      );
    })
    .slice(0, 10); // Limit results
}

// ============================================================================
// Component
// ============================================================================

export function CustomerSearchCombobox({
  customers,
  value,
  onSelect,
  placeholder = 'Search customers by name, phone, or email...',
  isLoading = false,
  disabled = false,
  className,
}: CustomerSearchComboboxProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResultGroup[]>([]);

  // If there's a selected value, show it in the input
  const displayValue = value ? `${value.firstName} ${value.lastName}` : searchQuery;

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Clear selection when user starts typing
    if (value && query !== `${value.firstName} ${value.lastName}`) {
      onSelect(null);
    }

    // Filter customers
    const matchedCustomers = searchCustomers(customers, query);

    const searchResults: SearchResult[] = matchedCustomers.map((customer) => ({
      id: customer.id,
      type: 'customer',
      title: `${customer.firstName} ${customer.lastName}`,
      subtitle: `${customer.phone}${customer.email ? ` • ${customer.email}` : ''}`,
      avatar: {
        initials: getInitials(`${customer.firstName} ${customer.lastName ?? ''}`.trim()),
        color: 'primary',
      },
    }));

    setResults(searchResults.length > 0 ? [{ category: 'Customers', results: searchResults }] : []);
  };

  const handleResultClick = (result: SearchResult) => {
    const selectedCustomer = customers.find((c) => c.id === result.id);
    if (selectedCustomer) {
      onSelect(selectedCustomer);
      setSearchQuery(`${selectedCustomer.firstName} ${selectedCustomer.lastName}`);
      setResults([]);
    }
  };

  // TODO: Phase 2 - Add clear button functionality
  const handleClear = (): void => {
    setSearchQuery('');
    setResults([]);
    onSelect(null);
  };
  void handleClear;

  if (disabled) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 px-3 py-2 bg-background-secondary rounded-lg text-foreground-secondary">
          <Users className="size-icon-sm" />
          <span>{value ? `${value.firstName} ${value.lastName}` : placeholder}</span>
        </div>
      </div>
    );
  }

  return (
    <SearchInput
      value={displayValue}
      placeholder={placeholder}
      results={results}
      isLoading={isLoading}
      onSearch={handleSearch}
      onResultClick={handleResultClick}
      className={className}
    />
  );
}
