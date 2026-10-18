import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../../common/enums/user-role.enum';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}
