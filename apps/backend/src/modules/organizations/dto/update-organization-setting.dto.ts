import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateOrganizationSettingDto } from './create-organization-setting.dto';

/**
 * DTO for updating an organization setting
 * Omits organizationId as it cannot be changed
 */
export class UpdateOrganizationSettingDto extends PartialType(
  OmitType(CreateOrganizationSettingDto, ['organizationId'] as const),
) {}
