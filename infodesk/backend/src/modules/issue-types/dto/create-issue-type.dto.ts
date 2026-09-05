import { IsNotEmpty, MaxLength, maxLength } from "class-validator";

export class CreateIssueTypeDto {
    @IsNotEmpty()
    @MaxLength(50)
    name: string
}