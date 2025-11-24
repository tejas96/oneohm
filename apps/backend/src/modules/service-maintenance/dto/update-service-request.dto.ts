import { PartialType } from '@nestjs/swagger';

import { CreateServiceRequestDto } from './create-service-request.dto';

/**
 * DTO for Updating Service Request
 */
export class UpdateServiceRequestDto extends PartialType(CreateServiceRequestDto) {}
