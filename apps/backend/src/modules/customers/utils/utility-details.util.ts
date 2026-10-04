import { BadRequestException } from '@nestjs/common';
import { isValidConsumerNumber } from '@tejas96/shared/utils';

const UTILITY_DETAILS_INCOMPLETE_MESSAGE =
  'Consumer name, DISCOM and connection type are required; a consumer number, when given, must be 10–12 digits.';

export interface UtilityDetailsFields {
  consumerNumber?: string | null;
  consumerName?: string | null;
  discomId?: string | null;
  connectionType?: string | null;
}

function isUtilityDetailsComplete(property: UtilityDetailsFields): boolean {
  // The consumer number may be empty until onboarding (projects/utils/onboarding-checks.ts).
  const consumerNumber = property.consumerNumber?.trim();
  return Boolean(
    property.consumerName?.trim() &&
      (!consumerNumber || isValidConsumerNumber(consumerNumber)) &&
      property.discomId &&
      property.connectionType,
  );
}

export function assertUtilityDetailsComplete(property: UtilityDetailsFields): void {
  if (!isUtilityDetailsComplete(property)) {
    throw new BadRequestException(UTILITY_DETAILS_INCOMPLETE_MESSAGE);
  }
}

export function hasUtilityFieldUpdate(updateDto: {
  consumerNumber?: unknown;
  consumerName?: unknown;
  discomId?: unknown;
  connectionType?: unknown;
}): boolean {
  return (
    updateDto.consumerNumber !== undefined ||
    updateDto.consumerName !== undefined ||
    updateDto.discomId !== undefined ||
    updateDto.connectionType !== undefined
  );
}
