/**
 * Canonical fixed-role catalog for multi-role access control.
 * Role codes are the contract used in state, adapters, route policies, and backend.
 */

export type FixedRoleGroup =
  | 'owner'
  | 'commercial'
  | 'project_delivery'
  | 'operations'
  | 'support';

export type FixedRoleAvailability = 'available' | 'coming_soon';

export interface FixedRoleDefinitionShape {
  code: string;
  label: string;
  shortDescription: string;
  group: FixedRoleGroup;
  availability: FixedRoleAvailability;
}

export const FIXED_ROLES = [
  {
    code: 'guest',
    label: 'Guest',
    shortDescription: 'Read-only observer with dashboard and profile access',
    group: 'support',
    availability: 'available',
  },
  {
    code: 'field_worker',
    label: 'Field Worker',
    shortDescription: 'Assigned customers, properties, quotes, and project tasks',
    group: 'commercial',
    availability: 'available',
  },
  {
    code: 'store',
    label: 'Store',
    shortDescription: 'Inventory, stock, procurement, and allocations',
    group: 'operations',
    availability: 'available',
  },
  {
    code: 'reseller',
    label: 'Reseller',
    shortDescription: 'Own leads, customers, and quotations',
    group: 'commercial',
    availability: 'coming_soon',
  },
  {
    code: 'admin',
    label: 'Admin',
    shortDescription: 'Full product access and non-owner role management',
    group: 'owner',
    availability: 'available',
  },
  {
    code: 'super_admin',
    label: 'Superadmin',
    shortDescription: 'Full product access and owner-role governance',
    group: 'owner',
    availability: 'available',
  },
  {
    code: 'liaisoning',
    label: 'Liaisoning',
    shortDescription: 'Assigned projects, documents, and regulatory coordination',
    group: 'project_delivery',
    availability: 'available',
  },
  {
    code: 'designer',
    label: 'Designer',
    shortDescription: 'Design tasks, surveys, documents, and BOM authoring',
    group: 'project_delivery',
    availability: 'available',
  },
  {
    code: 'finance',
    label: 'Finance',
    shortDescription: 'Ledger, receivables, and project finance',
    group: 'operations',
    availability: 'available',
  },
  {
    code: 'execution',
    label: 'Execution',
    shortDescription: 'Installation tasks, surveys, and project progress',
    group: 'project_delivery',
    availability: 'available',
  },
  {
    code: 'ic_partner',
    label: 'I & C Partner',
    shortDescription: 'Installation and commissioning partner workspace',
    group: 'project_delivery',
    availability: 'coming_soon',
  },
  {
    code: 'sales',
    label: 'Sales',
    shortDescription: 'CRM, pipeline, onboarding, and quotations',
    group: 'commercial',
    availability: 'available',
  },
  {
    code: 'marketing',
    label: 'Marketing',
    shortDescription: 'Lead sources and read-only CRM context',
    group: 'commercial',
    availability: 'coming_soon',
  },
  {
    code: 'service',
    label: 'Service',
    shortDescription: 'Customer service history and maintenance',
    group: 'support',
    availability: 'coming_soon',
  },
  {
    code: 'hr',
    label: 'HR',
    shortDescription: 'Employee directory and staff profile management',
    group: 'support',
    availability: 'available',
  },
  {
    code: 'loan',
    label: 'Loan',
    shortDescription: 'Financing context on customers and projects',
    group: 'commercial',
    availability: 'coming_soon',
  },
  {
    code: 'dispatch',
    label: 'Dispatch',
    shortDescription: 'Dispatch workflows and delivery coordination',
    group: 'operations',
    availability: 'available',
  },
] as const satisfies readonly FixedRoleDefinitionShape[];

export type FixedRoleCode = (typeof FIXED_ROLES)[number]['code'];

export type FixedRoleDefinition = Omit<FixedRoleDefinitionShape, 'code'> & {
  code: FixedRoleCode;
};

export const FIXED_ROLE_CODES: readonly FixedRoleCode[] = FIXED_ROLES.map(
  (role) => role.code,
);

export const OWNER_ROLES = ['admin', 'super_admin'] as const satisfies readonly FixedRoleCode[];

export type OwnerRoleCode = (typeof OWNER_ROLES)[number];

const FIXED_ROLE_CODE_SET = new Set<string>(FIXED_ROLE_CODES);

export function isFixedRoleCode(code: string): code is FixedRoleCode {
  return FIXED_ROLE_CODE_SET.has(code);
}

export interface RolePresentation {
  label: string;
  shortDescription?: string;
  group?: FixedRoleGroup;
  availability?: FixedRoleAvailability;
  isLegacy: boolean;
}

export function getRolePresentation(code: string): RolePresentation {
  const definition = FIXED_ROLES.find((role) => role.code === code);
  if (definition) {
    return {
      label: definition.label,
      shortDescription: definition.shortDescription,
      group: definition.group,
      availability: definition.availability,
      isLegacy: false,
    };
  }

  return {
    label: code
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    isLegacy: true,
  };
}

export function getRolesByGroup(group: FixedRoleGroup): readonly FixedRoleDefinition[] {
  return FIXED_ROLES.filter((role) => role.group === group) as FixedRoleDefinition[];
}
