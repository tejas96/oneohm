import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * BusinessException
 * 
 * Base exception for all business logic errors.
 * Provides consistent error structure and HTTP status codes.
 */
export class BusinessException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        statusCode,
        message,
        errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

/**
 * EntityNotFoundException
 * 
 * Thrown when a requested entity is not found.
 */
export class EntityNotFoundException extends BusinessException {
  constructor(entityName: string, identifier: string | Record<string, unknown>) {
    const message =
      typeof identifier === 'string'
        ? `${entityName} with ID '${identifier}' not found`
        : `${entityName} not found with criteria: ${JSON.stringify(identifier)}`;

    super(message, HttpStatus.NOT_FOUND, 'ENTITY_NOT_FOUND', {
      entityName,
      identifier,
    });
  }
}

/**
 * EntityAlreadyExistsException
 * 
 * Thrown when trying to create an entity that already exists.
 */
export class EntityAlreadyExistsException extends BusinessException {
  constructor(entityName: string, field: string, value: string) {
    super(
      `${entityName} with ${field} '${value}' already exists`,
      HttpStatus.CONFLICT,
      'ENTITY_ALREADY_EXISTS',
      { entityName, field, value },
    );
  }
}

/**
 * ValidationException
 * 
 * Thrown for custom validation errors not caught by class-validator.
 */
export class ValidationException extends BusinessException {
  constructor(message: string, validationErrors?: Record<string, string[]>) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', {
      validationErrors,
    });
  }
}

/**
 * InsufficientPermissionsException
 * 
 * Thrown when user lacks required permissions for an action.
 */
export class InsufficientPermissionsException extends BusinessException {
  constructor(action: string, resource: string) {
    super(
      `Insufficient permissions to ${action} ${resource}`,
      HttpStatus.FORBIDDEN,
      'INSUFFICIENT_PERMISSIONS',
      { action, resource },
    );
  }
}

/**
 * InvalidOperationException
 * 
 * Thrown when an operation cannot be performed due to business rules.
 */
export class InvalidOperationException extends BusinessException {
  constructor(message: string, reason?: string) {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_OPERATION', { reason });
  }
}

/**
 * ResourceConflictException
 * 
 * Thrown when an operation conflicts with the current state of a resource.
 */
export class ResourceConflictException extends BusinessException {
  constructor(message: string, conflictDetails?: Record<string, unknown>) {
    super(message, HttpStatus.CONFLICT, 'RESOURCE_CONFLICT', conflictDetails);
  }
}

/**
 * ExternalServiceException
 * 
 * Thrown when an external service call fails.
 */
export class ExternalServiceException extends BusinessException {
  constructor(serviceName: string, operation: string, originalError?: string) {
    super(
      `External service '${serviceName}' failed during '${operation}'`,
      HttpStatus.BAD_GATEWAY,
      'EXTERNAL_SERVICE_ERROR',
      { serviceName, operation, originalError },
    );
  }
}

/**
 * DatabaseException
 * 
 * Thrown for database-specific errors.
 */
export class DatabaseException extends BusinessException {
  constructor(message: string, operation: string, details?: Record<string, unknown>) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR', {
      operation,
      ...details,
    });
  }
}

