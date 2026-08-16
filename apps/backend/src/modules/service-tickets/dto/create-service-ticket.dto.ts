import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MAX_SERVICE_TICKET_PHOTOS,
  ServiceTicketPriority,
  type ServiceTicketPhoto,
} from '@tejas96/shared/types';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ServiceTicketPhotoDto implements ServiceTicketPhoto {
  @ApiProperty({ example: 'inverter-fault.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'service/8f0c.../issue-photo/1723200000_ab12_inverter-fault.jpg' })
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty({ example: 'https://cdn.example.com/service/8f0c.../inverter-fault.jpg' })
  @IsString()
  @IsNotEmpty()
  publicUrl: string;

  @ApiPropertyOptional({ example: 284913 })
  @IsOptional()
  @IsInt()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateServiceTicketDto {
  @ApiProperty({ example: 'Inverter tripping every morning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Customer reports the inverter trips around 7am and needs a manual reset.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: ServiceTicketPriority, default: ServiceTicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(ServiceTicketPriority)
  priority: ServiceTicketPriority = ServiceTicketPriority.MEDIUM;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ format: 'uuid', description: 'Must belong to the selected customer' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedToEmployeeId?: string;

  @ApiPropertyOptional({
    example: '2026-08-20',
    description: 'Calendar due date (YYYY-MM-DD). Send null to clear on update.',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    return value;
  })
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ type: [ServiceTicketPhotoDto], maxItems: MAX_SERVICE_TICKET_PHOTOS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SERVICE_TICKET_PHOTOS)
  @ValidateNested({ each: true })
  @Type(() => ServiceTicketPhotoDto)
  photos?: ServiceTicketPhotoDto[];
}
