import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanDocumentType } from '@oneohm-epc/shared-types';
import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class LoanDocumentResponseDto {
  @ApiProperty() @Expose() id: string;
  @ApiProperty() @Expose() loanApplicationId: string;
  @ApiProperty({ enum: LoanDocumentType }) @Expose() documentType: LoanDocumentType;
  @ApiProperty() @Expose() documentName: string;
  @ApiProperty() @Expose() filePath: string;
  @ApiProperty() @Expose() isVerified: boolean;
  @ApiPropertyOptional() @Expose() verifiedAt?: Date;
  @ApiPropertyOptional() @Expose() verifiedBy?: string;
  @ApiProperty() @Expose() createdAt: Date;
  @ApiPropertyOptional() @Expose() createdBy?: string;

  @ApiPropertyOptional({ type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  verifiedByUser?: UserResponseDto;

  @ApiPropertyOptional({ type: UserResponseDto })
  @Expose()
  @Type(() => UserResponseDto)
  createdByUser?: UserResponseDto;
}
