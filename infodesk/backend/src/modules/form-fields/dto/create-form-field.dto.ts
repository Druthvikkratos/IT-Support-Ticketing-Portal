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
  ValidateNested,
} from 'class-validator';
import { FileConfigDto } from './file-config.dto';
import { Type } from 'class-transformer';

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

  @ValidateIf((dto) => dto.fieldType === 'file')
  @IsNotEmpty({message: 'File configuration is required for file upload fields'})
  @ValidateNested()
  @Type(() => FileConfigDto)
  fileConfig?: FileConfigDto;

  @IsBoolean()
  isRequired: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
