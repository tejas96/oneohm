import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

/**
 * Update User DTO
 * Allows updating core auth fields (except password which has a separate endpoint)
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
