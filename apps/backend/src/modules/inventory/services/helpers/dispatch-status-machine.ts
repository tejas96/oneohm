import { BadRequestException } from '@nestjs/common';
import { MaterialDispatchStatus } from '@oneohm-epc/shared/types';

const VALID_DISPATCH_TRANSITIONS: Record<MaterialDispatchStatus, MaterialDispatchStatus[]> = {
  [MaterialDispatchStatus.PREPARED]: [
    MaterialDispatchStatus.DISPATCHED,
    MaterialDispatchStatus.CANCELLED,
  ],
  [MaterialDispatchStatus.DISPATCHED]: [
    MaterialDispatchStatus.IN_TRANSIT,
    MaterialDispatchStatus.CANCELLED,
  ],
  [MaterialDispatchStatus.IN_TRANSIT]: [
    MaterialDispatchStatus.DELIVERED,
    MaterialDispatchStatus.PARTIALLY_DELIVERED,
    MaterialDispatchStatus.CANCELLED,
  ],
  [MaterialDispatchStatus.DELIVERED]: [],
  [MaterialDispatchStatus.PARTIALLY_DELIVERED]: [
    MaterialDispatchStatus.DELIVERED,
    MaterialDispatchStatus.CANCELLED,
  ],
  [MaterialDispatchStatus.CANCELLED]: [],
};

export function validateDispatchStatusTransition(
  currentStatus: MaterialDispatchStatus,
  newStatus: MaterialDispatchStatus,
): void {
  if (!VALID_DISPATCH_TRANSITIONS[currentStatus].includes(newStatus)) {
    throw new BadRequestException(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
    );
  }
}
