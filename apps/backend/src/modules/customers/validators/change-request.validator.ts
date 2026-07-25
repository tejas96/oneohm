import {
  ChangeRequestType,
  ConnectionType,
  PropertyType,
  type ChangeRequestPayload,
} from '@tejas96/shared/types';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateChangeRequestPayload(item: Record<string, unknown>): string | null {
  const type = item.type as ChangeRequestType | undefined;
  if (!type || !Object.values(ChangeRequestType).includes(type)) {
    return 'Invalid change request type';
  }

  switch (type) {
    case ChangeRequestType.CONSUMER_NAME_CHANGE:
      if (!isNonEmptyString(item.newName)) return 'newName is required';
      if (item.newName.length > 255) return 'newName is too long';
      return null;
    case ChangeRequestType.NAME_SPELLING_CORRECTION:
      if (!isNonEmptyString(item.correctedName)) return 'correctedName is required';
      if (item.correctedName.length > 255) return 'correctedName is too long';
      return null;
    case ChangeRequestType.PROPERTY_TYPE_CHANGE:
      if (
        !item.newPropertyType ||
        !Object.values(PropertyType).includes(item.newPropertyType as PropertyType)
      ) {
        return 'newPropertyType must be a valid PropertyType';
      }
      return null;
    case ChangeRequestType.LOAD_CHANGE:
      if (!item.phase || !Object.values(ConnectionType).includes(item.phase as ConnectionType)) {
        return 'phase must be a valid ConnectionType';
      }
      if (
        item.newSanctionedLoad !== undefined &&
        (typeof item.newSanctionedLoad !== 'number' || item.newSanctionedLoad < 0)
      ) {
        return 'newSanctionedLoad must be a non-negative number';
      }
      return null;
    case ChangeRequestType.NEW_EV_METER:
      if (item.note !== undefined && typeof item.note !== 'string') {
        return 'note must be a string';
      }
      if (typeof item.note === 'string' && item.note.length > 500) {
        return 'note is too long';
      }
      return null;
    case ChangeRequestType.NEW_CONNECTION:
      if (!item.phase || !Object.values(ConnectionType).includes(item.phase as ConnectionType)) {
        return 'phase must be a valid ConnectionType';
      }
      if (item.note !== undefined && typeof item.note !== 'string') {
        return 'note must be a string';
      }
      if (typeof item.note === 'string' && item.note.length > 500) {
        return 'note is too long';
      }
      return null;
    default:
      return 'Invalid change request type';
  }
}

const ALLOWED_KEYS: Record<ChangeRequestType, Set<string>> = {
  [ChangeRequestType.CONSUMER_NAME_CHANGE]: new Set(['type', 'newName']),
  [ChangeRequestType.NAME_SPELLING_CORRECTION]: new Set(['type', 'correctedName']),
  [ChangeRequestType.PROPERTY_TYPE_CHANGE]: new Set(['type', 'newPropertyType']),
  [ChangeRequestType.LOAD_CHANGE]: new Set(['type', 'phase', 'newSanctionedLoad']),
  [ChangeRequestType.NEW_EV_METER]: new Set(['type', 'note']),
  [ChangeRequestType.NEW_CONNECTION]: new Set(['type', 'phase', 'note']),
};

function hasOnlyAllowedKeys(item: Record<string, unknown>): boolean {
  const type = item.type as ChangeRequestType;
  const allowed = ALLOWED_KEYS[type];
  if (!allowed) return false;
  return Object.keys(item).every((key) => allowed.has(key));
}

@ValidatorConstraint({ name: 'isValidChangeRequestItem', async: false })
export class ChangeRequestItemConstraint implements ValidatorConstraintInterface {
  private lastError = 'Invalid change request item';

  validate(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      this.lastError = 'Change request item must be an object';
      return false;
    }

    const item = value as Record<string, unknown>;
    if (!hasOnlyAllowedKeys(item)) {
      this.lastError = 'Change request item contains unexpected fields';
      return false;
    }

    const error = validateChangeRequestPayload(item);
    if (error) {
      this.lastError = error;
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return this.lastError;
  }
}

export function IsValidChangeRequestItem(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: ChangeRequestItemConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'hasUniqueChangeRequestTypes', async: false })
export class UniqueChangeRequestTypesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (!Array.isArray(value)) return false;
    const types = value.map((item) => (item as ChangeRequestPayload)?.type);
    return new Set(types).size === types.length;
  }

  defaultMessage(): string {
    return 'Duplicate change request types are not allowed';
  }
}

export function HasUniqueChangeRequestTypes(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: UniqueChangeRequestTypesConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidChangeRequestArray', async: false })
export class ChangeRequestArrayConstraint implements ValidatorConstraintInterface {
  private itemConstraint = new ChangeRequestItemConstraint();

  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (!Array.isArray(value)) return false;
    if (value.length > 6) return false;
    return value.every((item) => this.itemConstraint.validate(item));
  }

  defaultMessage(args: ValidationArguments): string {
    return this.itemConstraint.defaultMessage() || `${args.property} is invalid`;
  }
}

export function IsValidChangeRequestArray(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: ChangeRequestArrayConstraint,
    });
  };
}
