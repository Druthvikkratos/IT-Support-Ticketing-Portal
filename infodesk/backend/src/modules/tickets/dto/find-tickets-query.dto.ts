import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TicketStatus, Priority } from '@prisma/client';

export class FindTicketsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @Type(() => Number) @IsInt() issueTypeId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 10;

  @IsOptional() @IsIn(['ticketNumber', 'createdAt', 'priority', 'status']) sortField?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sortDir?: 'asc' | 'desc';
}