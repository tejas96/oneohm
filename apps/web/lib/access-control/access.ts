import {
  isFixedRoleCode,
  OWNER_ROLES,
  type FixedRoleCode,
  type OwnerRoleCode,
} from '@tejas96/shared';

import {
  FEATURE_ROLE_POLICY,
  isFeatureAccessKey,
  type FeatureAccessKey,
} from './feature-policy';

const OWNER_ROLE_SET = new Set<string>(OWNER_ROLES);

export function hasRole(
  roles: readonly string[],
  role: FixedRoleCode,
): boolean {
  return roles.some((assigned) => assigned === role);
}

export function hasAnyRole(
  roles: readonly string[],
  requiredRoles: readonly FixedRoleCode[],
): boolean {
  const required = new Set<string>(requiredRoles);
  return roles.some((assigned) => required.has(assigned));
}

function isOwnerRole(role: string): role is OwnerRoleCode {
  return OWNER_ROLE_SET.has(role);
}

function hasOwnerBypass(roles: readonly string[]): boolean {
  return roles.some((role) => isOwnerRole(role));
}

function hasCanonicalRoles(roles: readonly string[]): roles is readonly FixedRoleCode[] {
  return roles.length > 0 && roles.every(isFixedRoleCode);
}

/**
 * Evaluate fixed-role access for a feature.
 *
 * Order:
 * 1. Empty roles deny
 * 2. Unknown/unregistered feature deny
 * 3. Owner-role governance exception (Superadmin only)
 * 4. Admin/Superadmin product bypass
 * 5. Additive role-policy lookup
 */
export function canAccessFeature(
  roles: readonly string[],
  feature: FeatureAccessKey,
): boolean {
  if (!roles.length) {
    return false;
  }

  if (!isFeatureAccessKey(feature)) {
    return false;
  }

  if (feature === 'admin.ownerRoles.manage') {
    return hasRole(roles, 'super_admin');
  }

  if (hasOwnerBypass(roles)) {
    return true;
  }

  const allowedRoles = FEATURE_ROLE_POLICY[feature];
  const canonicalRoles = roles.filter(isFixedRoleCode);

  return canonicalRoles.some((role) =>
    (allowedRoles as readonly FixedRoleCode[]).includes(role),
  );
}

export function filterCanonicalRoles(roles: readonly string[]): FixedRoleCode[] {
  return roles.filter(isFixedRoleCode);
}

export function assertCanonicalRoles(roles: readonly string[]): FixedRoleCode[] {
  if (!hasCanonicalRoles(roles)) {
    return [];
  }

  return [...roles];
}
