// Users
export {
  useAdminUsers,
  useAdminUser,
  useAdminUsersList,
  useAdminUserMutations,
  useAdminUserPermissions,
  useCheckUserAvailability,
  type AdminUser,
  type AdminUserFilters,
  type AdminUserListFilters,
  type AdminUserListResponse,
} from './users';

// User Roles
export { useUserRoles, useUserRoleMutations, type UserRoleAssignment } from './user-roles';

// Invitations
export {
  useInvitations,
  useInvitationMutations,
  type Invitation,
  type InvitationFilters,
} from './invitations';

// Roles
export {
  useRoles,
  useRole,
  useRoleMutations,
  useRolePermissions,
  type AdminRole,
  type RoleWithPermissions,
  type RoleFilters,
} from './roles';

// Permissions
export {
  usePermissions,
  useAllPermissions,
  usePermissionPermissions,
  type AdminPermission,
  type Permission,
  type PermissionFilters,
} from './permissions';

// Workflow Steps
export {
  useWorkflowSteps,
  useAllActiveWorkflowSteps,
  useWorkflowStep,
  useWorkflowStepMutations,
  useWorkflowStepStats,
  useWorkflowStepPermissions,
  type WorkflowStep,
  type WorkflowStepFilters,
} from './workflow-steps';

// Properties
export {
  usePropertyList,
  usePropertyTemperatureStats,
  usePropertyMutations,
  type PropertyItem,
  type PropertyListFilters,
} from './properties';

// Products
export {
  useProductOptions,
  useAllPanelProducts,
  useAllInverterProducts,
  useAllStructureProducts,
  type PanelBrandOption,
  type InverterBrandOption,
  type StructureTypeOption,
  type PanelTechnologyVariant,
  type InverterCapacityOption,
} from './products';

// Admin: Product Types
export {
  useProductType,
  useProductTypeList,
  useProductTypeMutations,
  useProductTypePermissions,
  type ProductType,
  type ProductTypeAttribute,
  type ProductTypeFilters,
} from './product-types';

// Admin: Brands
export {
  useBrandList,
  useBrandMutations,
  useBrandPermissions,
  type Brand,
  type BrandFilters,
} from './brands';

// Admin: Products
export {
  useProductsAdmin,
  useProductAdminMutations,
  useProductAdminPermissions,
  type ProductAdminItem,
  type ProductAdminFilters,
} from './products-admin';

// Admin: Product Prices
export { useProductPrices, useProductPriceMutations, type ProductPrice } from './product-prices';

// Admin: Installation Pricing
export {
  useInstallationPricing,
  useInstallationPricingMutations,
  useInstallationPricingPermissions,
  type InstallationPricingItem,
  type InstallationPricingFilters,
} from './installation-pricing';

// Admin: Quote Config
export { useQuoteConfig, useQuoteConfigMutations, type QuoteConfig } from './quote-config';

// Admin: Subsidy Config
export {
  useSubsidyConfigList,
  useSubsidyConfigMutations,
  useSubsidyConfigPermissions,
  type SubsidyConfigItem,
  type SubsidyConfigFilters,
} from './subsidy-config';

// Documents (generic entity-document system)
export {
  useDocumentsByEntity,
  useDocumentsByEntityBatch,
  useUploadDocument,
  useUploadDocumentsBulk,
  useUpdateDocument,
  useDeleteDocument,
} from './documents';

// Site Activities
export { useSiteActivityByProperty, useCompleteVisit, useCompleteSurvey } from './site-activities';

// Lookups
export {
  useLookups,
  useLookup,
  useLookupMutations,
  useLookupPermissions,
  useLookupsByTypeCode,
  useLookupOptions,
  useLookupTypeCodes,
  type Lookup,
  type LookupByTypeCode,
  type LookupOption,
  type LookupFilters,
} from './lookups';

// Customers (FDAL — search + detail only; full module stays in feature folder)
export { useCustomerSearch, useCustomerDetail, customerKeys, type Customer } from './customers';

// Customer Properties (FDAL — by-customer endpoint)
export {
  useCustomerPropertiesByCustomer,
  type CustomerPropertyResponse,
} from './customer-properties';

// Customer Quotes (FDAL — filtered by customerId)
export {
  useCustomerQuotes,
  quoteKeys,
  type CustomerQuote,
  type CustomerQuotesResponse,
} from './customer-quotes';
// Note: quoteKeys above is re-exported from the quotes feature as a compatibility alias

// Employees (FDAL)
export {
  useEmployees,
  type EmployeeListItem,
  type EmployeeUser,
  type EmployeeFilters,
} from './employees';

// Team Workload (FDAL — flat array endpoint)
export { useTeamWorkload, type TeamWorkloadItem } from './team-workload';

// Projects (FDAL entry point)
export {
  useProjectSummary,
  useProjectTaskList,
  useConvertFromQuote,
  type UseConvertFromQuoteReturn,
  type ProjectSummary,
  type ProjectSummaryMetrics,
  type ActivityFeedItem,
  type TeamWorkloadEntry,
  type MilestoneProgressEntry,
  type UpcomingDeadline,
  type ProjectTaskItem,
  type ProjectTaskListParams,
  type ProjectResponse,
  type ConvertFromQuotePayload,
} from './projects';

// Quotes list (FDAL resource)
export { useQuoteListResource, quoteResourceKeys, type QuoteListFilters } from './quotes';

// BOM (FDAL resource)
export {
  useEntityBom,
  useFinalizeBomAndAllocate,
  bomResourceKeys,
  type Bom,
  type BomItem,
} from './bom';

// Inventory — Stock
export {
  useInventoryStockList,
  useInventoryStockDetail,
  useAdjustInventoryStock,
  useTransferInventoryStock,
  inventoryStockKeys,
  type InventoryStock,
  type InventoryStockFilters,
  type AdjustStockPayload,
  type TransferStockPayload,
} from './inventory-stock';

// Inventory — Warehouses
export {
  useWarehouses,
  useWarehouse,
  useWarehouseMutations,
  useWarehouseStats,
  warehouseKeys,
  type Warehouse,
  type WarehouseFilters,
} from './warehouses';

// Inventory — Vendors
export {
  useVendors,
  useVendor,
  useVendorMutations,
  useVendorStats,
  vendorKeys,
  type Vendor,
  type VendorFilters,
} from './vendors';

// Inventory — Purchase Orders
export {
  usePurchaseOrders,
  usePurchaseOrder,
  usePurchaseOrderMutations,
  usePurchaseOrderStats,
  purchaseOrderKeys,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseOrderFilters,
  type RecordPaymentPayload,
} from './purchase-orders';

// Inventory — Stock Allocations
export {
  useStockAllocations,
  useStockAllocation,
  useStockAllocationMutations,
  useStockAllocationStats,
  stockAllocationKeys,
  type StockAllocation,
  type StockAllocationFilters,
} from './stock-allocations';

// Inventory — Material Dispatches
export {
  useMaterialDispatches,
  useMaterialDispatch,
  useMaterialDispatchMutations,
  useMaterialDispatchStats,
  materialDispatchKeys,
  type MaterialDispatch,
  type MaterialDispatchItem,
  type MaterialDispatchFilters,
} from './material-dispatches';

// Inventory — Transactions (read-only ledger)
export {
  useInventoryTransactions,
  useInventoryTransaction,
  useInventoryTransactionStats,
  inventoryTransactionKeys,
  type InventoryTransaction,
  type InventoryTransactionFilters,
} from './inventory-transactions';

// Notifications
export {
  useNotifications,
  useNotificationUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  notificationKeys,
  type Notification,
  type NotificationFilters,
} from './notifications';

// Inventory — Stats (Part 10)
export {
  resolveStatsWindow,
  usePoSpendTrend,
  usePoTopVendors,
  usePoSpendByWarehouse,
  usePoOutstandingByVendor,
  useTransactionsByTypeTrend,
  useDispatchFunnel,
  useAllocationFunnel,
  useTopLowStock,
  type StatsTrendPoint,
  type StatsTrendResponse,
  type StatsTopItem,
  type StatsTopItemsResponse,
  type StatsFunnelStage,
  type StatsFunnelResponse,
  type StatsRangePreset,
  type StatsWindowInput,
  type ResolvedStatsWindow,
  type UseTrendStatsOptions,
  type UseTopStatsOptions,
  type UseFunnelStatsOptions,
  type UseTopLowStockOptions,
} from './inventory-stats';

// Inventory — Federated Search (Part 5)
export {
  useInventorySearch,
  type InventorySearchType,
  type InventorySearchHit,
  type InventorySearchResponse,
  type UseInventorySearchOptions,
  type UseInventorySearchReturn,
} from './inventory-search';

// Inventory — Saved Views (Part 7)
export {
  useSavedViews,
  useSavedView,
  useSavedViewMutations,
  savedViewKeys,
  type SavedView,
  type SavedViewResource,
  type CreateSavedViewPayload,
  type UpdateSavedViewPayload,
  type SavedViewMutations,
} from './saved-views';

// Inventory — Bulk operations (Part 4)
export {
  useInventoryBulk,
  type BulkResult,
  type BulkCancelPayload,
  type UseInventoryBulkReturn,
} from './inventory-bulk';

// Inventory — CSV Export (Part 6 + Part 9)
export {
  useInventoryExport,
  type InventoryExportResource,
  type ExportInventoryOptions,
  type UseInventoryExportReturn,
} from './inventory-export';
