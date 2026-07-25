import { ChangeRequestStatus, ChangeRequestType, ConnectionType, PropertyType } from './enums';

/** Payload shapes submitted at property creation (one variant per type). */
export type ChangeRequestPayload =
  | { type: ChangeRequestType.CONSUMER_NAME_CHANGE; newName: string }
  | { type: ChangeRequestType.NAME_SPELLING_CORRECTION; correctedName: string }
  | { type: ChangeRequestType.PROPERTY_TYPE_CHANGE; newPropertyType: PropertyType }
  | { type: ChangeRequestType.LOAD_CHANGE; phase: ConnectionType; newSanctionedLoad?: number }
  | { type: ChangeRequestType.NEW_EV_METER; note?: string }
  | { type: ChangeRequestType.NEW_CONNECTION; phase: ConnectionType; note?: string };

/** Stored on customer_properties.change_requests JSONB column. */
export type StoredChangeRequest = ChangeRequestPayload & {
  status: ChangeRequestStatus;
  requestedBy: string;
  projectTaskId?: string;
};
