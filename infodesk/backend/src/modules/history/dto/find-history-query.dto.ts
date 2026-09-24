import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindHistoryQueryDto {
  @IsOptional() @IsString() search?: string; // matches ticket number or title
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsIn(['status_change', 'message']) type?:
    'status_change' | 'message';
  @IsOptional() @IsString() actorId?: string; // filter to one specific user's actions

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
