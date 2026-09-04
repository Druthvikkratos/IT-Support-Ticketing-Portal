import { IsEmail, IsNotEmpty, Validate } from "class-validator";
import { NotGmailConstraint } from "./create-admin.dto";

export class UpdateEmployeeDto{
    @IsNotEmpty()
    name: string

    @IsEmail()
    @Validate(NotGmailConstraint)
    email: string
}