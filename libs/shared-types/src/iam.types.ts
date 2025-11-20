/**
 * Feature Types
 */
export type FeatureType = 'module' | 'sub_feature' | 'component' | 'workflow';

/**
 * Permission Scope Types
 */
export type PermissionScope = 'all' | 'own' | 'department' | 'assigned' | 'custom';

/**
 * Permission Level Types
 */
export type PermissionLevel = 'basic' | 'standard' | 'advanced' | 'admin';

/**
 * Permission Condition Types
 */
export type PermissionConditionType =
  | 'attribute'
  | 'ownership'
  | 'relationship'
  | 'time_based'
  | 'custom_query';

/**
 * Access Level Types for Role-Feature Access
 */
export type AccessLevel = 'none' | 'read_only' | 'limited' | 'full';

/**
 * Permission Actions (CRUD + custom)
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage',
  ASSIGN = 'assign',
}


