import {
  FIXED_ROLES,
  OWNER_ROLES,
  type FixedRoleCode,
  type FixedRoleDefinition,
  type FixedRoleGroup,
  isFixedRoleCode,
} from '@tejas96/shared';

import { canAccessFeature } from '@/lib/access-control/access';
import {
  FEATURE_ROLE_POLICY,
  type FeatureAccessKey,
} from '@/lib/access-control/feature-policy';

export const FIXED_ROLE_GROUP_ORDER: readonly FixedRoleGroup[] = [
  'owner',
  'commercial',
  'project_delivery',
  'operations',
  'support',
];

export const FIXED_ROLE_GROUP_LABELS: Record<FixedRoleGroup, string> = {
  owner: 'Owner',
  commercial: 'Commercial',
  project_delivery: 'Project Delivery',
  operations: 'Operations',
  support: 'Support',
};

export interface FixedRoleGroupSection {
  group: FixedRoleGroup;
  label: string;
  roles: readonly FixedRoleDefinition[];
}

export function buildFixedRoleGroupSections(): FixedRoleGroupSection[] {
  return FIXED_ROLE_GROUP_ORDER.map((group) => ({
    group,
    label: FIXED_ROLE_GROUP_LABELS[group],
    roles: FIXED_ROLES.filter((role) => role.group === group),
  }));
}

export function dedupeFixedRoles(roles: readonly FixedRoleCode[]): FixedRoleCode[] {
  const unique = new Set<FixedRoleCode>();
  for (const role of roles) {
    unique.add(role);
  }
  return [...unique];
}

export interface PartitionedRoleCodes {
  canonical: FixedRoleCode[];
  legacy: string[];
}

export function partitionRoleCodes(raw: readonly string[]): PartitionedRoleCodes {
  const canonical: FixedRoleCode[] = [];
  const legacy: string[] = [];
  const seenCanonical = new Set<FixedRoleCode>();
  const seenLegacy = new Set<string>();

  for (const code of raw) {
    if (isFixedRoleCode(code)) {
      if (!seenCanonical.has(code)) {
        seenCanonical.add(code);
        canonical.push(code);
      }
      continue;
    }

    if (!seenLegacy.has(code)) {
      seenLegacy.add(code);
      legacy.push(code);
    }
  }

  return { canonical, legacy };
}

const OWNER_ROLE_SET = new Set<string>(OWNER_ROLES);

export function isOwnerFixedRole(role: FixedRoleCode): boolean {
  return OWNER_ROLE_SET.has(role);
}

export type OwnerGovernanceDenialReason = 'owner_roles' | 'self_owner_removal';

export interface OwnerGovernanceContext {
  actorRoles: readonly string[];
  targetUserId: string;
  actorUserId: string;
}

export function canManageOwnerRoles(actorRoles: readonly string[]): boolean {
  return canAccessFeature(actorRoles, 'admin.ownerRoles.manage');
}

export function evaluateOwnerRoleToggle(
  role: FixedRoleCode,
  enabling: boolean,
  context: OwnerGovernanceContext,
): { allowed: true } | { allowed: false; reason: OwnerGovernanceDenialReason } {
  if (!isOwnerFixedRole(role)) {
    return { allowed: true };
  }

  if (!canManageOwnerRoles(context.actorRoles)) {
    return { allowed: false, reason: 'owner_roles' };
  }

  if (!enabling && context.targetUserId === context.actorUserId) {
    return { allowed: false, reason: 'self_owner_removal' };
  }

  return { allowed: true };
}

export type ToggleFixedRoleResult =
  | { ok: true; roles: FixedRoleCode[] }
  | { ok: false; reason: OwnerGovernanceDenialReason };

export function toggleFixedRoleSelection(
  currentRoles: readonly FixedRoleCode[],
  role: FixedRoleCode,
  checked: boolean,
  context: OwnerGovernanceContext,
): ToggleFixedRoleResult {
  const governance = evaluateOwnerRoleToggle(role, checked, context);
  if (!governance.allowed) {
    return { ok: false, reason: governance.reason };
  }

  if (checked) {
    if (currentRoles.includes(role)) {
      return { ok: true, roles: dedupeFixedRoles(currentRoles) };
    }

    return { ok: true, roles: dedupeFixedRoles([...currentRoles, role]) };
  }

  return { ok: true, roles: currentRoles.filter((code) => code !== role) };
}

export function hasPlaceholderOnlySelection(roles: readonly FixedRoleCode[]): boolean {
  if (roles.length === 0) {
    return false;
  }

  return roles.every((code) => {
    const definition = FIXED_ROLES.find((role) => role.code === code);
    return definition?.availability === 'coming_soon';
  });
}

const FEATURE_DOMAIN_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  profile: 'Profile',
  notifications: 'Notifications',
  customers: 'Customers',
  properties: 'Properties',
  onboarding: 'Onboarding',
  pipeline: 'Pipeline',
  quotes: 'Quotes',
  projects: 'Projects',
  inventory: 'Inventory',
  finance: 'Finance',
  service: 'Service',
  admin: 'Administration',
};

const FEATURE_LABELS: Partial<Record<FeatureAccessKey, string>> = {
  'dashboard.view': 'View dashboard',
  'profile.view': 'View profile',
  'profile.manage': 'Manage profile',
  'notifications.view': 'View notifications',
  'customers.view': 'View customers',
  'customers.manage': 'Manage customers',
  'customers.delete': 'Delete customers',
  'properties.view': 'View properties',
  'properties.manage': 'Manage properties',
  'properties.delete': 'Delete properties',
  'onboarding.manage': 'Manage onboarding',
  'pipeline.view': 'View pipeline',
  'quotes.view': 'View quotes',
  'quotes.create': 'Create quotes',
  'quotes.manage': 'Manage quotes',
  'quotes.delete': 'Delete quotes',
  'quotes.priceBreakdown.view': 'View quote price breakdown',
  'projects.view': 'View projects',
  'projects.create': 'Create projects',
  'projects.update': 'Update projects',
  'projects.delete': 'Delete projects',
  'projects.team.manage': 'Manage project teams',
  'projects.tasks.manage': 'Manage project tasks',
  'projects.design.manage': 'Manage project design',
  'projects.documents.manage': 'Manage project documents',
  'projects.reports.view': 'View project reports',
  'projects.bom.view': 'View project BOM',
  'projects.bom.manage': 'Manage project BOM',
  'inventory.stock.view': 'View stock',
  'inventory.stock.manage': 'Manage stock',
  'inventory.procurement.view': 'View procurement',
  'inventory.procurement.manage': 'Manage procurement',
  'inventory.allocations.view': 'View allocations',
  'inventory.allocations.manage': 'Manage allocations',
  'inventory.dispatch.view': 'View dispatch',
  'inventory.dispatch.manage': 'Manage dispatch',
  'inventory.transactions.view': 'View inventory transactions',
  'inventory.export': 'Export inventory',
  'inventory.search': 'Search inventory',
  'finance.view': 'View finance',
  'finance.project.view': 'View project finance',
  'finance.ledger.manage': 'Manage ledger',
  'service.view': 'View service',
  'service.manage': 'Manage service',
  'admin.users.view': 'View users',
  'admin.users.manage': 'Manage users',
  'admin.users.delete': 'Delete users',
  'admin.userRoles.manage': 'Manage user roles',
  'admin.ownerRoles.manage': 'Manage owner roles',
  'admin.catalog.manage': 'Manage catalog',
  'admin.settings.manage': 'Manage settings',
  'admin.discom.manage': 'Manage DISCOM',
};

export interface GrantSummarySection {
  title: string;
  items: string[];
}

export interface GrantSummary {
  headline: string;
  sections: GrantSummarySection[];
  emptyMessage?: string;
  placeholderOnlyMessage?: string;
}

function hasOwnerProductBypass(roles: readonly FixedRoleCode[]): boolean {
  return roles.some((role) => isOwnerFixedRole(role));
}

function collectGrantedFeatures(selectedRoles: readonly FixedRoleCode[]): FeatureAccessKey[] {
  const granted: FeatureAccessKey[] = [];
  const selected = new Set<string>(selectedRoles);

  for (const feature of Object.keys(FEATURE_ROLE_POLICY) as FeatureAccessKey[]) {
    const allowedRoles = FEATURE_ROLE_POLICY[feature];
    if (allowedRoles.some((allowedRole) => selected.has(allowedRole))) {
      granted.push(feature);
    }
  }

  return granted;
}

function groupGrantedFeatures(features: readonly FeatureAccessKey[]): GrantSummarySection[] {
  const grouped = new Map<string, Set<string>>();

  for (const feature of features) {
    const [domain = 'other'] = feature.split('.');
    const title = FEATURE_DOMAIN_LABELS[domain] ?? domain;
    const label = FEATURE_LABELS[feature] ?? feature;
    const items = grouped.get(title) ?? new Set<string>();
    items.add(label);
    grouped.set(title, items);
  }

  return [...grouped.entries()]
    .map(([title, items]) => ({
      title,
      items: [...items].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function buildGrantSummary(selectedRoles: readonly FixedRoleCode[]): GrantSummary {
  if (selectedRoles.length === 0) {
    return {
      headline: 'What this grants',
      sections: [],
      emptyMessage: 'Select one or more roles to preview access.',
    };
  }

  const placeholderOnlyMessage = hasPlaceholderOnlySelection(selectedRoles)
    ? 'These roles are assigned, but their dedicated workspaces are not yet available.'
    : undefined;

  if (hasOwnerProductBypass(selectedRoles)) {
    return {
      headline: 'What this grants',
      sections: [
        {
          title: 'Product access',
          items: ['Full product access, including admin surfaces'],
        },
      ],
      placeholderOnlyMessage,
    };
  }

  const grantedFeatures = collectGrantedFeatures(selectedRoles);

  if (grantedFeatures.length === 0) {
    return {
      headline: 'What this grants',
      sections: [],
      emptyMessage: 'Selected roles do not grant additional product access yet.',
      placeholderOnlyMessage,
    };
  }

  return {
    headline: 'What this grants',
    sections: groupGrantedFeatures(grantedFeatures),
    placeholderOnlyMessage,
  };
}

export function rolesAreEqual(
  left: readonly FixedRoleCode[],
  right: readonly FixedRoleCode[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((role) => rightSet.has(role));
}
