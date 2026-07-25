import { PartialType } from '@nestjs/swagger';

import { CreateDiscomDto } from './create-discom.dto';

export class UpdateDiscomDto extends PartialType(CreateDiscomDto) {}
