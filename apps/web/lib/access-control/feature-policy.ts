import type { FixedRoleCode } from '@tejas96/shared';

export type FeatureAccessKey =
  | 'dashboard.view'
  | 'profile.view'
  | 'profile.manage'
  | 'notifications.view'
  | 'customers.view'
  | 'customers.manage'
  | 'customers.delete'
  | 'properties.view'
  | 'properties.manage'
  | 'properties.delete'
  | 'onboarding.manage'
  | 'pipeline.view'
  | 'quotes.view'
  | 'quotes.create'
  | 'quotes.manage'
  | 'quotes.delete'
  | 'quotes.priceBreakdown.view'
  | 'projects.view'
  | 'projects.create'
  | 'projects.update'
  | 'projects.delete'
  | 'projects.team.manage'
  | 'projects.tasks.manage'
  | 'projects.design.manage'
  | 'projects.documents.manage'
  | 'projects.reports.view'
  | 'projects.bom.view'
  | 'projects.bom.manage'
  | 'inventory.stock.view'
  | 'inventory.stock.manage'
  | 'inventory.procurement.view'
  | 'inventory.procurement.manage'
  | 'inventory.allocations.view'
  | 'inventory.allocations.manage'
  | 'inventory.dispatch.view'
  | 'inventory.dispatch.manage'
  | 'inventory.transactions.view'
  | 'inventory.export'
  | 'inventory.search'
  | 'finance.view'
  | 'finance.project.view'
  | 'finance.ledger.manage'
  | 'service.view'
  | 'service.manage'
  | 'admin.users.view'
  | 'admin.users.manage'
  | 'admin.users.delete'
  | 'admin.userRoles.manage'
  | 'admin.ownerRoles.manage'
  | 'admin.catalog.manage'
  | 'admin.settings.manage'
  | 'admin.discom.manage';

const ALL_NON_OWNER_ROLES = [
  'guest',
  'field_worker',
  'store',
  'reseller',
  'liaisoning',
  'designer',
  'finance',
  'execution',
  'ic_partner',
  'sales',
  'marketing',
  'service',
  'hr',
  'loan',
  'dispatch',
] as const satisfies readonly FixedRoleCode[];

const OPERATIONAL_NON_OWNER_ROLES = ALL_NON_OWNER_ROLES.filter(
  (role) => role !== 'guest',
);

export const FEATURE_ROLE_POLICY = {
  'dashboard.view': ALL_NON_OWNER_ROLES,
  'profile.view': ALL_NON_OWNER_ROLES,
  'profile.manage': OPERATIONAL_NON_OWNER_ROLES,
  'notifications.view': OPERATIONAL_NON_OWNER_ROLES,
  'customers.view': [
    'field_worker',
    'reseller',
    'liaisoning',
    'finance',
    'sales',
    'marketing',
    'service',
    'loan',
  ],
  'customers.manage': ['field_worker', 'sales'],
  'customers.delete': [],
  'properties.view': [
    'field_worker',
    'reseller',
    'liaisoning',
    'designer',
    'finance',
    'execution',
    'sales',
    'service',
    'loan',
  ],
  'properties.manage': ['field_worker', 'sales'],
  'properties.delete': [],
  'onboarding.manage': ['field_worker', 'sales'],
  'pipeline.view': ['reseller', 'sales', 'marketing'],
  'quotes.view': [
    'field_worker',
    'reseller',
    'designer',
    'finance',
    'sales',
    'loan',
  ],
  'quotes.create': ['field_worker', 'reseller', 'sales'],
  'quotes.manage': ['field_worker', 'reseller', 'sales'],
  'quotes.delete': [],
  'quotes.priceBreakdown.view': ['finance', 'sales'],
  'projects.view': [
    'field_worker',
    'store',
    'liaisoning',
    'designer',
    'finance',
    'execution',
    'ic_partner',
    'sales',
    'service',
    'loan',
    'dispatch',
  ],
  'projects.create': [],
  'projects.update': [],
  'projects.delete': [],
  'projects.team.manage': [],
  'projects.tasks.manage': [
    'field_worker',
    'liaisoning',
    'designer',
    'execution',
    'ic_partner',
    'service',
  ],
  'projects.design.manage': ['designer'],
  'projects.documents.manage': [
    'field_worker',
    'liaisoning',
    'designer',
    'execution',
    'ic_partner',
    'service',
  ],
  'projects.reports.view': [
    'liaisoning',
    'designer',
    'finance',
    'execution',
    'service',
  ],
  'projects.bom.view': [
    'store',
    'designer',
    'execution',
    'ic_partner',
    'dispatch',
  ],
  'projects.bom.manage': ['designer'],
  'inventory.stock.view': ['store', 'finance', 'execution', 'dispatch'],
  'inventory.stock.manage': ['store'],
  'inventory.procurement.view': ['store', 'finance'],
  'inventory.procurement.manage': ['store'],
  'inventory.allocations.view': [
    'store',
    'execution',
    'ic_partner',
    'dispatch',
  ],
  'inventory.allocations.manage': ['store'],
  'inventory.dispatch.view': ['store', 'execution', 'dispatch'],
  'inventory.dispatch.manage': ['dispatch'],
  'inventory.transactions.view': ['store', 'finance', 'dispatch'],
  'inventory.export': ['store', 'finance'],
  'inventory.search': ['store', 'finance', 'execution', 'dispatch'],
  'finance.view': ['finance'],
  'finance.project.view': ['finance', 'loan'],
  'finance.ledger.manage': ['finance'],
  'service.view': ['service'],
  'service.manage': ['service'],
  'admin.users.view': ['hr'],
  'admin.users.manage': ['hr'],
  'admin.users.delete': [],
  'admin.userRoles.manage': [],
  'admin.ownerRoles.manage': ['super_admin'],
  'admin.catalog.manage': [],
  'admin.settings.manage': [],
  'admin.discom.manage': [],
} satisfies Record<FeatureAccessKey, readonly FixedRoleCode[]>;

const FEATURE_ACCESS_KEYS = Object.keys(FEATURE_ROLE_POLICY) as FeatureAccessKey[];

export function isFeatureAccessKey(value: string): value is FeatureAccessKey {
  return FEATURE_ACCESS_KEYS.includes(value as FeatureAccessKey);
}
