/**
 * Lookup Scope Type Enum
 * Defines whether a lookup entry is global (platform-wide) or scoped to a specific organization
 */
export enum LookupScopeType {
  GLOBAL = 'global',
  ORGANIZATION = 'organization',
}

/**
 * Lookup Data Type Enum
 * Describes the value type of the lookup entry, used for validation and display
 */
export enum LookupDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
}

export enum LookupTypeCode {
  DEFAULT_TASK_STATUS = 'default_task_status',
  PRIORITY = 'priority',
}
