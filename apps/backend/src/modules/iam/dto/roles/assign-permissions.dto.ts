import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class AssignPermissionsDto {
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  permissionIds!: string[];
}


