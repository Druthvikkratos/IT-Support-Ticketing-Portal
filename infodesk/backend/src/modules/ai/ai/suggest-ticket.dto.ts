import { IsNotEmpty, MaxLength } from 'class-validator';

export class SuggestTicketDto {
  @IsNotEmpty() @MaxLength(150) title: string;
  @IsNotEmpty() @MaxLength(2000) description: string;
}
