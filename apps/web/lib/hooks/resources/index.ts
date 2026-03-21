// Users
export {
  useAdminUsers,
  useAdminUser,
  useAdminUserMutations,
  useAdminUserPermissions,
  useCheckUserAvailability,
  type AdminUser,
  type AdminUserFilters,
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
