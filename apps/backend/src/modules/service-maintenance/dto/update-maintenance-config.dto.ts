import { PartialType } from '@nestjs/swagger';

import { CreateMaintenanceConfigDto } from './create-maintenance-config.dto';

/**
 * DTO for Updating Maintenance Config
 */
export class UpdateMaintenanceConfigDto extends PartialType(CreateMaintenanceConfigDto) {}
