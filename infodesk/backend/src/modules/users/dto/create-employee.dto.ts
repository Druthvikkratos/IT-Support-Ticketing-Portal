import { IsEmail, IsNotEmpty, Matches, Validate } from "class-validator";
import { NotGmailConstraint } from "./create-admin.dto";

export class CreateEmployeeDto{
    @IsNotEmpty()
    name: string;

    @Matches(/^\d{4}$/, { message: 'Employee code must be exactly 4 digits' })
    employeeCode: string

    @IsEmail()
    @Validate(NotGmailConstraint)
    email: string
}