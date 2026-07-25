/**
 * Change of Request types captured at property creation.
 * Each type maps to a special workflow task when the property is converted to a project.
 */
export enum ChangeRequestType {
  CONSUMER_NAME_CHANGE = 'consumer_name_change',
  NAME_SPELLING_CORRECTION = 'name_spelling_correction',
  PROPERTY_TYPE_CHANGE = 'property_type_change',
  LOAD_CHANGE = 'load_change',
  NEW_EV_METER = 'new_ev_meter',
  NEW_CONNECTION = 'new_connection',
}

export enum ChangeRequestStatus {
  PENDING = 'pending',
  CONVERTED = 'converted',
}
