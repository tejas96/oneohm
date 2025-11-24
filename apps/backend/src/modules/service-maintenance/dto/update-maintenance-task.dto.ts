import { PartialType } from '@nestjs/swagger';

import { CreateMaintenanceTaskDto } from './create-maintenance-task.dto';

/**
 * DTO for Updating Maintenance Task
 */
export class UpdateMaintenanceTaskDto extends PartialType(CreateMaintenanceTaskDto) {}
