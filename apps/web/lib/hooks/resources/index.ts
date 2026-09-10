// Users
export {
  useAdminUser,
  useAdminUsersList,
  useAdminUserMutations,
  useCheckUserAvailability,
  type AdminUser,
  type AdminUserListFilters,
} from './users';

// User Roles
export { useUserRoles, useUserRoleMutations, type UserRoleAssignment } from './user-roles';

// Invitations
export { useInvitationMutations, type Invitation } from './invitations';

// Roles
export { useRoles, useRole, useRoleMutations, type AdminRole, type RoleFilters } from './roles';

// Permissions
export {
  usePermissions,
  useAllPermissions,
  type AdminPermission,
  type Permission,
} from './permissions';

// Workflow Steps
export {
  useWorkflowSteps,
  useAllActiveWorkflowSteps,
  useWorkflowStepMutations,
  type WorkflowStep,
} from './workflow-steps';

// Properties
// Products
export { useProductOptions, useAllMountingStructureProductsForAdmin } from './products';

// Admin: Product Types
export {
  useProductType,
  useProductTypeList,
  useProductTypeMutations,
  type ProductType,
  type ProductTypeAttribute,
  type ProductTypeFilters,
} from './product-types';

// Admin: Brands
export { useBrandList, useBrandMutations, type Brand, type BrandFilters } from './brands';

// Admin: Products
export {
  useProductsAdmin,
  useProductAdminMutations,
  type ProductAdminItem,
  type ProductAdminFilters,
} from './products-admin';

// Admin: Product Prices
export { useProductPrices, useProductPriceMutations, type ProductPrice } from './product-prices';

// Admin: Installation Pricing
export {
  useInstallationPricing,
  useInstallationPricingMutations,
  type InstallationPricingItem,
  type InstallationPricingFilters,
} from './installation-pricing';

// Admin: Quote Config
export { useQuoteConfig, useQuoteConfigMutations } from './quote-config';

// Admin: Subsidy Config
export {
  useSubsidyConfigList,
  useSubsidyConfigMutations,
  type SubsidyConfigItem,
  type SubsidyConfigFilters,
} from './subsidy-config';

// Documents (generic entity-document system)
export { useUpdateDocument } from './documents';

// Customers (FDAL — search + detail only; full module stays in feature folder)
export { useCustomerSearch, useCustomerDetail, type Customer } from './customers';

// Customer Properties (FDAL — by-customer endpoint)
export { useCustomerPropertiesByCustomer } from './customer-properties';

// Customer Quotes (FDAL — filtered by customerId)
export { useCustomerQuotes, type CustomerQuote } from './customer-quotes';
// Note: quoteKeys above is re-exported from the quotes feature as a compatibility alias

// Employees (FDAL)
export { useEmployees, type EmployeeListItem } from './employees';

// Employee Profile (FDAL — current user's profile page)
export {
  useCurrentUserEmployeeProfile,
  useEmployeeProfileMutations,
  useUserEmployeeProfile,
  type EmployeeProfile,
} from './profile';

// Team Workload (FDAL — flat array endpoint)
export { useTeamWorkload, type TeamWorkloadItem } from './team-workload';

// Projects (FDAL entry point)
export {
  useProjectSummary,
  useProjectTaskList,
  useConvertFromQuote,
  useUpdateProjectWarehouse,
  useProjectListResource,
  type ProjectSummary,
  type ActivityFeedItem,
  type TeamWorkloadEntry,
  type ProjectTaskItem,
  type ProjectListItem,
} from './projects';

// Quotes list (FDAL resource)
export { useQuoteListResource, type QuoteListFilters } from './quotes';

// BOM (FDAL resource)
export {
  useProjectBom,
  useBomChanges,
  useAllocateBomPending,
  useAddBomItem,
  useChangeBomQuantity,
  useReplaceBomItem,
  useRemoveBomItem,
  bomResourceKeys,
  type BomItem,
  type BomChange,
  type BomLineChangeState,
  type BomChangeType,
} from './bom';

// Finance — Payment Terms (planned receivables)
// Finance — Receipts (cash inflow ledger)
// Finance — Project Expenses (cash outflow ledger)
// Finance — Org Aggregations (Finance module pages)
export { useOrgOutstanding, useOrgCustomersAr, type OutstandingTerm } from './finance-org';

// Finance / BOM — Procurement Status
export { useBomProcurementStatus } from './bom-procurement';

// Inventory — Stock
export { useInventoryStockList, type InventoryStock } from './inventory-stock';

// Inventory — Warehouses
export { useWarehouse, useWarehouseMutations, type Warehouse } from './warehouses';

// Inventory — Vendors
// Inventory — Purchase Orders
// Inventory — Stock Allocations
export { useStockAllocations, type StockAllocation } from './stock-allocations';

// Inventory — Material Dispatches
// Inventory — Transactions (read-only ledger)
export { useInventoryTransactions, type InventoryTransaction } from './inventory-transactions';

// Notifications
// Inventory — Stats (Part 10)
export {
  resolveStatsWindow,
  STATS_MAX_WINDOW_DAYS,
  type StatsWindowInput,
} from './inventory-stats';

// Inventory — Federated Search (Part 5)
export {
  useInventorySearch,
  type InventorySearchType,
  type InventorySearchHit,
} from './inventory-search';

// Inventory — Saved Views (Part 7)
export {
  useSavedViews,
  useSavedViewMutations,
  type SavedView,
  type SavedViewResource,
} from './saved-views';

// Inventory — Bulk operations (Part 4)
// Inventory — CSV Export (Part 6 + Part 9)
// Sales Pipeline
export {
  usePipelineDashboard,
  type PipelineFunnelStage,
  type PipelineLeaderboardEntry,
} from './pipeline';
