import { BadRequestException } from '@nestjs/common';
import { EmployeeProfileKind, UserProfileType } from '@tejas96/shared/types';
import { AADHAAR_ALREADY_REGISTERED_MESSAGE } from '@tejas96/shared/utils';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';

import { EmployeeProfileDataDto } from '../dto/employee-profile-data.dto';

export { AADHAAR_ALREADY_REGISTERED_MESSAGE };

export const RESELLER_ONLY_PROFILE_FIELDS = [
  'aadhaarNumber',
  'currentProfession',
  'yearsOfExperience',
  'companyName',
  'companyCode',
  'contactPersonName',
  'gstin',
  'pan',
  'commissionPercentage',
  'bankName',
  'accountNumber',
  'ifscCode',
  'accountHolderName',
] as const;

/** Allowed keys on inline employee/reseller profile payloads (CreateEmployeeDto minus userId). */
export const EMPLOYEE_PROFILE_DATA_FIELDS = [
  'employeeId',
  'designation',
  'department',
  'joiningDate',
  'email',
  'phone',
  'alternatePhone',
  'dateOfBirth',
  'gender',
  'avatarUrl',
  'address',
  'city',
  'state',
  'country',
  'pincode',
  'status',
  'profileKind',
  ...RESELLER_ONLY_PROFILE_FIELDS,
] as const;

function getProvidedProfileDataKeys(profileData: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  for (const field of EMPLOYEE_PROFILE_DATA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(profileData, field)) {
      keys.add(field);
    }
  }
  return keys;
}

function pickAllowedProfileData(profileData: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const field of EMPLOYEE_PROFILE_DATA_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(profileData, field)) {
      sanitized[field] = profileData[field];
    }
  }
  return sanitized;
}

export type ResellerOnlyProfileField = (typeof RESELLER_ONLY_PROFILE_FIELDS)[number];

function hasProfileFieldValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function formatValidationErrors(errors: ValidationError[]): string {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children?.length) {
      messages.push(formatValidationErrors(error.children));
    }
  }

  return messages.join('; ');
}

export function assertNoResellerFieldsOnStaffProfile(profileData: Record<string, unknown>): void {
  const disallowed = RESELLER_ONLY_PROFILE_FIELDS.filter((field) =>
    hasProfileFieldValue(profileData[field]),
  );

  if (disallowed.length > 0) {
    throw new BadRequestException(
      `Fields not allowed for staff employee profiles: ${disallowed.join(', ')}`,
    );
  }
}

/**
 * Validate and normalize inline employee/reseller profile data before persistence.
 * Rejects reseller-only fields on staff profiles and enforces DTO constraints
 * (Aadhaar format, experience bounds, etc.) for provided values.
 */
export async function prepareEmployeeProfileData(
  profileType: UserProfileType.EMPLOYEE | UserProfileType.RESELLER,
  profileData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const profileKind =
    profileType === UserProfileType.RESELLER
      ? EmployeeProfileKind.RESELLER
      : EmployeeProfileKind.STAFF;

  if (profileKind === EmployeeProfileKind.STAFF) {
    assertNoResellerFieldsOnStaffProfile(profileData);
  }

  const sanitizedProfileData = pickAllowedProfileData(profileData);

  const dto = plainToInstance(
    EmployeeProfileDataDto,
    { ...sanitizedProfileData, profileKind },
    { enableImplicitConversion: true },
  );

  const errors = await validate(dto, {
    skipMissingProperties: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  const providedKeys = getProvidedProfileDataKeys(sanitizedProfileData);
  const relevantErrors = errors.filter((error) => providedKeys.has(error.property));

  if (relevantErrors.length > 0) {
    throw new BadRequestException(formatValidationErrors(relevantErrors));
  }

  const dtoRecord = dto as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const field of EMPLOYEE_PROFILE_DATA_FIELDS) {
    if (!providedKeys.has(field)) {
      continue;
    }

    const value = dtoRecord[field];
    if (value !== undefined) {
      result[field] = value;
    }
  }

  return result;
}
