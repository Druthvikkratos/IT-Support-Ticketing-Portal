import { IsArray, IsBoolean, IsIn, IsInt, Max, Min } from 'class-validator';

export class FileConfigDto {
  @IsArray()
  @IsIn(['image', 'pdf', 'excel', 'document', 'video'], { each: true })
  allowedCategories: string[];

  @IsBoolean()
  allowMultiple: boolean;

  @IsInt()
  @Min(1)
  @Max(1024) // 1GB hard ceiling — an admin cannot configure a field above this
  maxSizeMB: number;
}
