import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  ticketId: string;

  // a message needs EITHER text or an attachment, not necessarily both —
  // this DTO alone can't enforce "at least one," so the gateway checks that
  @IsOptional()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsString()
  attachmentId?: string;
}
