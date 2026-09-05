import { IsEmpty, IsNotEmpty, MaxLength } from "class-validator";

export class UpdateIssueTypeDto{
    @IsEmpty()
    @MaxLength(50)
    name: string;
}