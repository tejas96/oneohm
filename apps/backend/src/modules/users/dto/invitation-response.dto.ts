import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class InvitationResponseDto {
  @Expose()
  @ApiProperty()
  id!: string;

  @Expose()
  @ApiProperty()
  email!: string;

  @Expose()
  @ApiProperty()
  status!: string;

  @Expose()
  @ApiProperty()
  organizationId!: string;

  @Expose()
  @ApiPropertyOptional()
  organizationName?: string;

  @Expose()
  @ApiProperty()
  roleId!: string;

  @Expose()
  @ApiPropertyOptional()
  roleName?: string;

  @Expose()
  @ApiProperty()
  expiresAt!: Date;

  @Expose()
  @ApiPropertyOptional()
  invitedBy?: string;

  @Expose()
  @ApiProperty()
  createdAt!: Date;
}
