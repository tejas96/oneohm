import {
  ChangeRequestStatus,
  ChangeRequestType,
  ConnectionType,
  PropertyType,
  type StoredChangeRequest,
} from '@tejas96/shared/types';

import { PROPERTY_TYPE_LABELS } from '../constants';

export type ChangeRequestFormItem = {
  type: ChangeRequestType;
  newName?: string;
  correctedName?: string;
  newPropertyType?: PropertyType | string;
  phase?: ConnectionType;
  newSanctionedLoad?: number;
  note?: string;
};

export const CHANGE_REQUEST_OPTIONS: Array<{ type: ChangeRequestType; label: string }> = [
  { type: ChangeRequestType.CONSUMER_NAME_CHANGE, label: 'Consumer name change' },
  { type: ChangeRequestType.NAME_SPELLING_CORRECTION, label: 'Consumer name spelling correction' },
  { type: ChangeRequestType.PROPERTY_TYPE_CHANGE, label: 'Property type change' },
  { type: ChangeRequestType.LOAD_CHANGE, label: 'New load (single/three phase)' },
  { type: ChangeRequestType.NEW_EV_METER, label: 'New EV meter' },
  { type: ChangeRequestType.NEW_CONNECTION, label: 'New connection' },
];

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  [ConnectionType.SINGLE_PHASE]: 'Single Phase',
  [ConnectionType.THREE_PHASE]: 'Three Phase',
};

export function getChangeRequestLabel(type: ChangeRequestType): string {
  return CHANGE_REQUEST_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

/** Map stored pending change requests to editable form items (edit mode). */
export function pendingChangeRequestsToFormItems(
  items: StoredChangeRequest[] | undefined,
): ChangeRequestFormItem[] {
  if (!items?.length) return [];
  return items
    .filter((item) => item.status === ChangeRequestStatus.PENDING)
    .map((item) => {
      // Drop the stored-only fields; `...payload` is what the form edits.
      // No underscore prefixes: `no-unused-vars` ignores rest siblings by
      // default, and the repo's naming-convention rule rejects leading
      // underscores on variables — prefixing here satisfied one rule by
      // breaking the other.
      const { status, requestedBy, projectTaskId, ...payload } = item;
      return payload as ChangeRequestFormItem;
    });
}

export function getConvertedChangeRequests(
  items: StoredChangeRequest[] | undefined,
): StoredChangeRequest[] {
  return (items ?? []).filter((item) => item.status === ChangeRequestStatus.CONVERTED);
}

function formatPhase(phase?: ConnectionType): string {
  if (!phase) return '—';
  return CONNECTION_TYPE_LABELS[phase] ?? phase;
}

function formatPropertyType(value?: PropertyType | string): string {
  if (!value) return '—';
  return PROPERTY_TYPE_LABELS[value as PropertyType] ?? value;
}

/** Human-readable summary for review / detail views. */
export function formatChangeRequestSummary(item: ChangeRequestFormItem): string {
  switch (item.type) {
    case ChangeRequestType.CONSUMER_NAME_CHANGE:
      return item.newName ? `New name: ${item.newName}` : '—';
    case ChangeRequestType.NAME_SPELLING_CORRECTION:
      return item.correctedName ? `Corrected name: ${item.correctedName}` : '—';
    case ChangeRequestType.PROPERTY_TYPE_CHANGE:
      return `New property type: ${formatPropertyType(item.newPropertyType)}`;
    case ChangeRequestType.LOAD_CHANGE: {
      const loadPart = item.newSanctionedLoad != null ? `, ${item.newSanctionedLoad} kW` : '';
      return `Phase: ${formatPhase(item.phase)}${loadPart}`;
    }
    case ChangeRequestType.NEW_EV_METER:
      return item.note?.trim() ? `Note: ${item.note.trim()}` : 'No note';
    case ChangeRequestType.NEW_CONNECTION: {
      const notePart = item.note?.trim() ? ` · Note: ${item.note.trim()}` : '';
      return `Phase: ${formatPhase(item.phase)}${notePart}`;
    }
    default:
      return '—';
  }
}
