import { IsEmail, IsNotEmpty, Validate } from "class-validator";
import { NotGmailConstraint } from "./create-admin.dto";

export class UpdateAdminDto{
    @IsNotEmpty()
    name: string

    @IsEmail()
    @Validate(NotGmailConstraint)
    email: string;
}