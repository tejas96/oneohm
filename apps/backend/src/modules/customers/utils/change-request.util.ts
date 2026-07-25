import { BadRequestException } from '@nestjs/common';
import {
  ChangeRequestStatus,
  ChangeRequestType,
  ConnectionType,
  PropertyType,
  type ChangeRequestPayload,
  type StoredChangeRequest,
} from '@tejas96/shared/types';

import { ChangeRequestItemDto } from '../dto/change-request.dto';
import { CustomerPropertyEntity } from '../entities/customer-property.entity';

const MAX_CHANGE_REQUESTS = 6;

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  [ConnectionType.SINGLE_PHASE]: 'Single Phase',
  [ConnectionType.THREE_PHASE]: 'Three Phase',
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Residential Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

export function normalizeChangeRequestsForStorage(
  items: ChangeRequestItemDto[] | undefined,
  requestedBy: string,
): StoredChangeRequest[] {
  if (!items?.length) return [];

  return items.map((item) => ({
    ...(item as ChangeRequestPayload),
    status: ChangeRequestStatus.PENDING,
    requestedBy,
  }));
}

/**
 * Merges incoming pending change requests with already-converted items on update.
 * Converted requests are immutable; incoming must not duplicate their types.
 */
export function mergeChangeRequestsForUpdate(
  existing: StoredChangeRequest[],
  incoming: ChangeRequestItemDto[] | undefined,
  requestedBy: string,
): StoredChangeRequest[] {
  const converted = existing.filter((cr) => cr.status === ChangeRequestStatus.CONVERTED);
  const convertedTypes = new Set(converted.map((cr) => cr.type));

  for (const item of incoming ?? []) {
    if (convertedTypes.has(item.type)) {
      throw new BadRequestException(
        `Change request "${item.type}" has already been converted and cannot be modified`,
      );
    }
  }

  const pending = normalizeChangeRequestsForStorage(incoming, requestedBy);
  const merged = [...converted, ...pending];

  if (merged.length > MAX_CHANGE_REQUESTS) {
    throw new BadRequestException(`Too many change requests (maximum ${MAX_CHANGE_REQUESTS})`);
  }

  const types = merged.map((cr) => cr.type);
  if (new Set(types).size !== types.length) {
    throw new BadRequestException('Duplicate change request types are not allowed');
  }

  return merged;
}

export function buildChangeRequestTaskDescription(request: StoredChangeRequest): string {
  switch (request.type) {
    case ChangeRequestType.CONSUMER_NAME_CHANGE:
      return `Change consumer name to: ${request.newName}`;
    case ChangeRequestType.NAME_SPELLING_CORRECTION:
      return `Correct consumer name spelling to: ${request.correctedName}`;
    case ChangeRequestType.PROPERTY_TYPE_CHANGE:
      return `Change property type to: ${PROPERTY_TYPE_LABELS[request.newPropertyType]}`;
    case ChangeRequestType.LOAD_CHANGE: {
      const phaseLabel = CONNECTION_TYPE_LABELS[request.phase];
      const loadPart = request.newSanctionedLoad != null ? `, ${request.newSanctionedLoad} kW` : '';
      return `Change load to: ${phaseLabel}${loadPart}`;
    }
    case ChangeRequestType.NEW_EV_METER:
      return request.note?.trim()
        ? `New EV meter requested. Note: ${request.note.trim()}`
        : 'New EV meter requested';
    case ChangeRequestType.NEW_CONNECTION: {
      const phaseLabel = CONNECTION_TYPE_LABELS[request.phase];
      return request.note?.trim()
        ? `New ${phaseLabel} connection requested. Note: ${request.note.trim()}`
        : `New ${phaseLabel} connection requested`;
    }
    default:
      return 'Change of request';
  }
}

export function getChangeRequestPropertyUpdates(
  request: StoredChangeRequest,
): Partial<CustomerPropertyEntity> {
  switch (request.type) {
    case ChangeRequestType.CONSUMER_NAME_CHANGE:
      return { consumerName: request.newName };
    case ChangeRequestType.NAME_SPELLING_CORRECTION:
      return { consumerName: request.correctedName };
    case ChangeRequestType.PROPERTY_TYPE_CHANGE:
      return { propertyType: request.newPropertyType };
    case ChangeRequestType.LOAD_CHANGE: {
      const updates: Partial<CustomerPropertyEntity> = { connectionType: request.phase };
      if (request.newSanctionedLoad != null) {
        updates.sanctionedLoad = request.newSanctionedLoad;
      }
      return updates;
    }
    case ChangeRequestType.NEW_CONNECTION:
      return { connectionType: request.phase };
    case ChangeRequestType.NEW_EV_METER:
    default:
      return {};
  }
}
