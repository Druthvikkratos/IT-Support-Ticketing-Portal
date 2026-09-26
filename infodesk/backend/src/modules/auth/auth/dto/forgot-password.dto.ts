import { IsEmail, Matches, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @Matches(/^\d{4}$/, { message: 'Employee code must be 4 digits' })
  employeeCode: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  newPassword: string;
}
