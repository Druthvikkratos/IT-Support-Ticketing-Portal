import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';
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

  @IsOptional()
  @IsObject()
  customFieldValues?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientRequestId?: string;

  @IsOptional()
  @IsBoolean()
  quickReport?: boolean;
}
