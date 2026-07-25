import { BadRequestException } from '@nestjs/common';
import { isValidConsumerNumber } from '@tejas96/shared/utils';

export const UTILITY_DETAILS_INCOMPLETE_MESSAGE =
  'Consumer name, consumer number, DISCOM, and connection type are required with a valid 10–12 digit consumer number.';

export interface UtilityDetailsFields {
  consumerNumber?: string | null;
  consumerName?: string | null;
  discomId?: string | null;
  connectionType?: string | null;
}

export function isUtilityDetailsComplete(property: UtilityDetailsFields): boolean {
  return Boolean(
    property.consumerName?.trim() &&
      property.consumerNumber?.trim() &&
      isValidConsumerNumber(property.consumerNumber) &&
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
