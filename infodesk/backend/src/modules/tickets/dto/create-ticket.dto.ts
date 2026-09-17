import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsPhoneNumber, MaxLength } from 'class-validator';
import { Priority } from '@prisma/client';

export class CreateTicketDto {
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsNotEmpty()
  description: string;

  @IsInt()
  issueTypeId: number;

  @IsEnum(Priority)
  priority: Priority;

  @IsNotEmpty()
  phoneNumber: string;

  // { "3": "Dell Latitude 5420", "7": "IT-204" } — validated loosely here,
  // since the real per-field validation (required/type/options match)
  // happens in the service against the live FormField definitions
  @IsOptional()
  @IsObject()
  customFieldValues?: Record<string, any>;
}