import { IsArray, IsBoolean, IsIn, IsInt, Max, Min } from 'class-validator';

export class FileConfigDto {
  @IsArray()
  @IsIn(['image', 'pdf', 'excel', 'document', 'video'], { each: true })
  allowedCategories: string[];

  @IsBoolean()
  allowMultiple: boolean;

  @IsInt()
  @Min(1)
  @Max(50) // hard ceiling so nobody accidentally allows a 500MB upload field
  maxSizeMB: number;
}
