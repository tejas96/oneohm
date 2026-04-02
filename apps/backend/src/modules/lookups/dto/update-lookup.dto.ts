import { PartialType } from '@nestjs/swagger';

import { CreateLookupDto } from './create-lookup.dto';

export class UpdateLookupDto extends PartialType(CreateLookupDto) {}
