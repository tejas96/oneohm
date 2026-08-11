import { BadRequestException } from '@nestjs/common';
import { UserProfileType } from '@tejas96/shared/types';

import {
  assertNoResellerFieldsOnStaffProfile,
  prepareEmployeeProfileData,
} from './employee-profile-data.util';

describe('employee-profile-data.util', () => {
  describe('assertNoResellerFieldsOnStaffProfile', () => {
    it('rejects reseller-only fields on staff profiles', () => {
      expect(() =>
        assertNoResellerFieldsOnStaffProfile({
          aadhaarNumber: '234567890123',
        }),
      ).toThrow(BadRequestException);
    });

    it('allows staff employment fields', () => {
      expect(() =>
        assertNoResellerFieldsOnStaffProfile({
          employeeId: 'EMP001',
          department: 'Sales',
        }),
      ).not.toThrow();
    });
  });

  describe('prepareEmployeeProfileData', () => {
    it('rejects invalid Aadhaar numbers for reseller profiles', async () => {
      await expect(
        prepareEmployeeProfileData(UserProfileType.RESELLER, {
          aadhaarNumber: '23456789012',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects Aadhaar numbers starting with 0 or 1', async () => {
      await expect(
        prepareEmployeeProfileData(UserProfileType.RESELLER, {
          aadhaarNumber: '123456789012',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects experience above 60 years', async () => {
      await expect(
        prepareEmployeeProfileData(UserProfileType.RESELLER, {
          yearsOfExperience: 61,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative experience', async () => {
      await expect(
        prepareEmployeeProfileData(UserProfileType.RESELLER, {
          yearsOfExperience: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reseller personal fields on staff profiles', async () => {
      await expect(
        prepareEmployeeProfileData(UserProfileType.EMPLOYEE, {
          aadhaarNumber: '234567890123',
          currentProfession: 'Should not be stored',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts valid reseller personal fields', async () => {
      const result = await prepareEmployeeProfileData(UserProfileType.RESELLER, {
        aadhaarNumber: '234567890123',
        currentProfession: 'Solar Consultant',
        yearsOfExperience: 8,
      });

      expect(result).toEqual({
        aadhaarNumber: '234567890123',
        currentProfession: 'Solar Consultant',
        yearsOfExperience: 8,
      });
    });

    it('ignores unknown or unsafe profile keys', async () => {
      const result = await prepareEmployeeProfileData(UserProfileType.EMPLOYEE, {
        department: 'Sales',
        designation: 'Executive',
        __proto__: { polluted: true },
        constructor: { polluted: true },
      } as Record<string, unknown>);

      expect(result).toEqual({
        department: 'Sales',
        designation: 'Executive',
      });
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    });
  });
});
