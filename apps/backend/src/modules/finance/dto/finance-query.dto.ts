import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * Common query options for org finance endpoints. The OrganizationContext
 * decorator pulls organizationId from header/query — these DTOs whitelist
 * the additional filters supported per endpoint.
 *
 * `organizationId` is intentionally NOT declared here; it's passed via the
 * decorator. Declaring it would cause global ValidationPipe (whitelist:
 * true) to keep it on dtos but it's already trusted from the decorator.
 */

class PaginationQueryBase {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

/**
 * Only the filters the ledger query actually implements are declared here.
 *
 * The legacy version also advertised `bucket`, `search` and five `sort` keys.
 * Nothing sent `bucket` or `search`, and the sole caller asked for
 * `daysOverdue DESC`, which is the fixed ordering the query now uses. Leaving
 * them declared would accept arguments and quietly ignore them; the validation
 * pipe runs with `forbidNonWhitelisted`, so removing them here means an
 * unsupported filter fails loudly instead.
 */
export class OutstandingQueryDto extends PaginationQueryBase {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
