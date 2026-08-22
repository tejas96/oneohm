import { type UserEntity } from '../../users/entities/user.entity';
import {
  type ServiceTicketListItemDto,
  type ServiceTicketResponseDto,
  type ServiceTicketStatusHistoryDto,
} from '../dto';
import { type ServiceTicketEntity } from '../entities';

/** Matches the customer name format used by the quotes module. */
function customerDisplayName(customer?: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
}): string {
  if (!customer) return '';
  return [customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function userDisplayName(user?: UserEntity | null): string | null {
  if (!user) return null;
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null;
}

/** Property label for the detail screen — falls back to the address when unnamed. */
function propertyLabel(property?: {
  propertyName?: string;
  address?: string;
  city?: string;
}): string {
  if (!property) return '—';
  if (property.propertyName) return property.propertyName;
  return [property.address, property.city].filter(Boolean).join(', ') || '—';
}

function propertyAddress(property?: {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string | null {
  if (!property) return null;
  const joined = [property.address, property.city, property.state, property.pincode]
    .filter(Boolean)
    .join(', ');
  return joined || null;
}

function coercePropertyCoordinates(
  gps?: { latitude?: number | string; longitude?: number | string } | null,
): { latitude: number; longitude: number } | null {
  if (!gps) return null;
  const latitude = Number(gps.latitude);
  const longitude = Number(gps.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function toListItemDto(ticket: ServiceTicketEntity): ServiceTicketListItemDto {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    customerId: ticket.customerId,
    customerName: customerDisplayName(ticket.customer),
    projectId: ticket.projectId,
    projectNumber: ticket.project?.projectNumber ?? '',
    propertyId: ticket.project?.propertyId ?? '',
    assignedToEmployeeId: ticket.assignedToEmployeeId,
    assigneeName:
      userDisplayName(ticket.assignedToEmployee?.user) ??
      (ticket.assignedToEmployee ? 'Unnamed employee' : null),
    dueDate: ticket.dueDate ?? null,
    createdByName: userDisplayName(ticket.createdByUser),
    createdAt: ticket.createdAt.toISOString(),
  };
}

function toHistoryDto(
  entry: ServiceTicketEntity['statusHistory'][number],
): ServiceTicketStatusHistoryDto {
  return {
    id: entry.id,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    note: entry.note,
    changedByName: userDisplayName(entry.changedByUser),
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toResponseDto(ticket: ServiceTicketEntity): ServiceTicketResponseDto {
  const property = ticket.project?.property;

  return {
    ...toListItemDto(ticket),
    description: ticket.description,
    propertyLabel: propertyLabel(property),
    propertyAddress: propertyAddress(property),
    propertyCoordinates: coercePropertyCoordinates(property?.gpsCoordinates),
    projectName: ticket.project?.name ?? '',
    photos: ticket.photos,
    resolutionNote: ticket.resolutionNote,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    updatedAt: ticket.updatedAt.toISOString(),
    statusHistory: (ticket.statusHistory ?? [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toHistoryDto),
  };
}
