import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceTicketPriority,
  ServiceTicketStatus,
  type ServiceTicketPhoto,
} from '@tejas96/shared/types';

export class ServiceTicketListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'TKT-ONEOHM_EPC-2026-0001' })
  ticketNumber: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ServiceTicketStatus })
  status: ServiceTicketStatus;

  @ApiProperty({ enum: ServiceTicketPriority })
  priority: ServiceTicketPriority;

  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty({ example: 'Rajesh Sharma' })
  customerName: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 'PRJ-ONEOHM_EPC-2026-0001' })
  projectNumber: string;

  @ApiProperty({ format: 'uuid', description: 'Derived from project.property_id' })
  propertyId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedToEmployeeId: string | null;

  @ApiPropertyOptional({ nullable: true })
  assigneeName: string | null;

  @ApiPropertyOptional({ example: '2026-08-20', nullable: true })
  dueDate: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdByName: string | null;

  @ApiProperty()
  createdAt: string;
}

export class ServiceTicketStatusHistoryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ enum: ServiceTicketStatus, nullable: true })
  fromStatus: ServiceTicketStatus | null;

  @ApiProperty({ enum: ServiceTicketStatus })
  toStatus: ServiceTicketStatus;

  @ApiPropertyOptional({ nullable: true })
  note: string | null;

  @ApiPropertyOptional({ nullable: true })
  changedByName: string | null;

  @ApiProperty()
  createdAt: string;
}

export class ServiceTicketResponseDto extends ServiceTicketListItemDto {
  @ApiProperty()
  description: string;

  @ApiProperty({ example: 'Sunrise Villa, Pune' })
  propertyLabel: string;

  @ApiProperty()
  projectName: string;

  @ApiPropertyOptional({ example: '12 MG Road, Pune, Maharashtra, 411001', nullable: true })
  propertyAddress: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: { latitude: 18.5204, longitude: 73.8567 },
  })
  propertyCoordinates: { latitude: number; longitude: number } | null;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' }, nullable: true })
  photos: ServiceTicketPhoto[] | null;

  @ApiPropertyOptional({ nullable: true })
  resolutionNote: string | null;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  closedAt: string | null;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: [ServiceTicketStatusHistoryDto] })
  statusHistory: ServiceTicketStatusHistoryDto[];
}

export class ServiceTicketListResponseDto {
  @ApiProperty({ type: [ServiceTicketListItemDto] })
  items: ServiceTicketListItemDto[];

  @ApiProperty({
    example: { page: 1, limit: 20, total: 42, totalPages: 3 },
  })
  meta: { page: number; limit: number; total: number; totalPages: number };
}
