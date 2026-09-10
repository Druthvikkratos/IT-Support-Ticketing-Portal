import { ArrayNotEmpty, IsInt } from 'class-validator';

export class ReorderFromFieldsDto {
  @ArrayNotEmpty()
  @IsInt({ each: true })
  orderedIds: number[];
}
