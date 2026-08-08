/**
 * Common/Reusable Interfaces
 *
 * This file contains generic, reusable interfaces that are used across
 * multiple modules to maintain consistency and reduce code duplication.
 */

// ============================================================================
// Pagination Interfaces
// ============================================================================

/**
 * Generic pagination metadata
 * Used in paginated API responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Generic paginated response wrapper
 * Used for all list/collection endpoints with pagination
 *
 * @example
 * // Controller usage
 * async findAll(): Promise<PaginatedResponse<UserDto>> {
 *   const { users, total } = await this.service.findAll(page, limit);
 *   return {
 *     data: users,
 *     meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
 *   };
 * }
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Pagination query parameters
 * Used in controller @Query decorators
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ============================================================================
// Filter Interfaces
// ============================================================================

/**
 * Date range filter
 * Used for filtering by date ranges
 */
export interface DateRangeFilter {
  fromDate?: string;
  toDate?: string;
}

/**
 * Search filter
 * Used for text-based search queries
 */
export interface SearchFilter {
  search?: string;
}

/**
 * Status filter (generic)
 * Used for filtering by any status enum
 */
export interface StatusFilter<T = string> {
  status?: T;
}

/**
 * Combined common filters
 * Most list endpoints use some combination of these
 */
export interface CommonFilters extends DateRangeFilter, SearchFilter {
  [key: string]: unknown; // Allow additional filters
}

// ============================================================================
// Statistics/Aggregation Interfaces
// ============================================================================

/**
 * Generic statistics response
 * Used for dashboard/summary endpoints
 *
 * @example
 * // Service usage
 * async getStatistics(): Promise<StatisticsResponse> {
 *   const byStatus = await this.repository.countByStatus();
 *   return {
 *     total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
 *     byStatus
 *   };
 * }
 */
export interface StatisticsResponse<T extends string = string> {
  total: number;
  byStatus: Record<T, number>;
}

/**
 * Extended statistics with additional breakdown
 * Used when multiple groupings are needed
 */
export interface ExtendedStatisticsResponse<
  TStatus extends string = string,
  TType extends string = string,
> {
  total: number;
  byStatus: Record<TStatus, number>;
  byType: Record<TType, number>;
}

/**
 * Count result
 * Used for simple count queries
 */
export interface CountResult {
  count: number;
}

/**
 * Sum/Total result
 * Used for financial or quantity aggregations
 */
export interface TotalResult {
  total: number;
}

// ============================================================================
// Repository Response Interfaces
// ============================================================================

/**
 * Repository find all response
 * Standard response from repository findAll methods
 *
 * @example
 * // Repository usage
 * async findAll(page: number, limit: number): Promise<FindAllResponse<Entity>> {
 *   const [items, total] = await this.repository.findAndCount({ skip, take });
 *   return { items, total };
 * }
 */
export interface FindAllResponse<T> {
  items: T[];
  total: number;
}

// ============================================================================
// Audit/Tracking Interfaces
// ============================================================================

/**
 * Created by tracking
 * For entities that track who created them
 */
export interface CreatedByTracking {
  createdBy: string;
  createdAt: Date;
}

/**
 * Updated by tracking
 * For entities that track who updated them
 */
export interface UpdatedByTracking {
  updatedBy?: string;
  updatedAt: Date;
}

/**
 * Full audit trail
 * For entities with complete audit tracking
 */
export interface AuditTrail extends CreatedByTracking, UpdatedByTracking {
  deletedBy?: string;
  deletedAt?: Date;
}

// ============================================================================
// Identifier Interfaces
// ============================================================================

/**
 * UUID identifier
 * For entities using UUID primary keys
 */
export interface UuidIdentifier {
  id: string;
}

// ============================================================================
// Validation Interfaces
// ============================================================================

/**
 * Validation error detail
 * Used in error responses
 */
export interface ValidationError {
  field: string;
  message: string;
  constraints?: Record<string, string>;
}

/**
 * Bulk operation result
 * Used when performing operations on multiple items
 */
export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================================================
// Address/Location Interfaces
// ============================================================================

/**
 * Standard address
 * Used across multiple modules (projects, warehouses, vendors, etc.)
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

/**
 * Coordinates (geographical)
 * Used for location tracking
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Full location with address and coordinates
 */
export interface Location extends Address {
  coordinates?: Coordinates;
}

// ============================================================================
// Contact Information Interfaces
// ============================================================================

/**
 * Contact person details
 * Used in vendors, customers, warehouses, etc.
 */
export interface ContactPerson {
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
}

/**
 * Contact information
 * Standard contact details
 */
export interface ContactInfo {
  email?: string;
  phone?: string;
  mobile?: string;
  alternatePhone?: string;
}

// ============================================================================
// File/Document Interfaces
// ============================================================================

/**
 * File metadata
 * Used for document/file uploads
 */
export interface FileMetadata {
  filename: string;
  mimeType: string;
  size: number; // bytes
  url: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

/**
 * Document reference
 * Used for linking documents to entities
 */
export interface DocumentReference {
  id: string;
  type: string;
  name: string;
  url: string;
}

// ============================================================================
// Workflow/Status Transition Interfaces
// ============================================================================

/**
 * Status transition
 * For tracking status changes
 */
export interface StatusTransition<T = string> {
  from: T;
  to: T;
  transitionedAt: Date;
  transitionedBy: string;
  reason?: string;
}

/**
 * Status history entry
 * For maintaining complete status history
 */
export interface StatusHistoryEntry<T = string> extends StatusTransition<T> {
  id: string;
  notes?: string;
}

// ============================================================================
// Financial/Monetary Interfaces
// ============================================================================

/**
 * Money amount
 * Used for all financial values
 */
export interface MoneyAmount {
  amount: number;
  currency: string; // ISO 4217 code (e.g., 'INR', 'USD')
}

/**
 * Price breakdown
 * Used in quotes, invoices, etc.
 */
export interface PriceBreakdown {
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  shippingAmount?: number;
  total: number;
}

// ============================================================================
// Time Period Interfaces
// ============================================================================

/**
 * Time period
 * Used for date ranges, project durations, etc.
 */
export interface TimePeriod {
  startDate: Date;
  endDate: Date;
}

/**
 * Duration
 * Used for estimated/actual durations
 */
export interface Duration {
  value: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
}
