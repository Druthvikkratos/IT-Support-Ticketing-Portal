import { FieldType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateFormFieldDto {
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsEnum(FieldType)
  fieldType: FieldType;

  @ValidateIf((dto) =>
    ['dropdown', 'radio', 'checkbox'].includes(dto.fieldType),
  )
  @IsNotEmpty({
    message: 'Options are required for dropdown, radio, and checkbox fields',
  })
  options?: string[];

  @IsBoolean()
  isRequired: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
