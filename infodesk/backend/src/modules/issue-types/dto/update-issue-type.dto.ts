import { IsEmpty, IsNotEmpty, MaxLength } from "class-validator";

export class UpdateIssueTypeDto{
    @IsNotEmpty()
    @MaxLength(50)
    name: string;
}