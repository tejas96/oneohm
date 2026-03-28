'use client';

export const PERMISSIONS = {
  QUOTES: {
    VIEW: 'quotes:read',
    CREATE: 'quotes:create',
    UPDATE: 'quotes:update',
    DELETE: 'quotes:delete',
    VIEW_PRICE_BREAKDOWN: 'quotes:view_price_breakdown',
  },
  CUSTOMERS: {
    VIEW: 'customers:read',
    CREATE: 'customers:create',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete',
    ASSIGN: 'customers:assign',
  },
  PROJECTS: {
    VIEW: 'projects:read',
    CREATE: 'projects:create',
    UPDATE: 'projects:update',
    DELETE: 'projects:delete',
  },
  DOCUMENTS: {
    VIEW: 'documents:read',
    CREATE: 'documents:create',
    UPDATE: 'documents:update',
    DELETE: 'documents:delete',
  },
  SITE_ACTIVITIES: {
    VIEW: 'site-activities:read',
    CREATE: 'site-activities:create',
    UPDATE: 'site-activities:update',
    DELETE: 'site-activities:delete',
  },
  IAM: {
    VIEW_ROLES: 'roles:read',
    MANAGE_ROLES: 'roles:create',
    VIEW_PERMISSIONS: 'permissions:read',
    MANAGE_PERMISSIONS: 'permissions:create',
    VIEW_USERS: 'users:read',
    MANAGE_USERS: 'users:create',
  },
} as const;

type PermissionValues<T> = T extends string
  ? T
  : { [K in keyof T]: PermissionValues<T[K]> }[keyof T];

export type Permission = PermissionValues<typeof PERMISSIONS>;
