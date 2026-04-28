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
export { useEntityBom, bomResourceKeys, type Bom, type BomItem } from './bom';
