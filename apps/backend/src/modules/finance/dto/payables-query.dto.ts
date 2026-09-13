import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query options for `GET /finance/payables`.
 *
 * `page` and `limit` are copied field-for-field from `ReceivablesQueryDto`
 * rather than shared through a base class, so paging behaves identically
 * across the module — same one-indexed page, same offset maths, same
 * maximum. A second paging convention in one module is how two screens end
 * up disagreeing about what "page 2" means.
 */
export class PayablesQueryDto {
  @ApiPropertyOptional({ description: 'Matches vendor name or code.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Keep only vendors with a nonzero balance — a debt or an advance either way.',
  })
  @IsBoolean()
  @IsOptional()
  // Reads `obj.onlyOwing` — the untouched source value — rather than the
  // `value` the pipe hands us. `enableImplicitConversion` (main.ts's global
  // ValidationPipe) runs its own Boolean() coercion on this property ahead of
  // this decorator because the field's design type is `boolean`, and
  // `Boolean('false')` is `true`: a naive JS truthy cast, not a string
  // comparison. Transforming that already-mangled value would make
  // `onlyOwing=false` turn the filter ON. Going straight to the raw query
  // string sidesteps it.
  @Transform(({ obj }) => obj.onlyOwing === 'true')
  onlyOwing?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}
