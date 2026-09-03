import {
  IsEmail,
  IsNotEmpty,
  IsStrongPassword,
  MinLength,
  Validate,
  ValidationArguments,
} from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'notGmail', async: false })
export class NotGmailConstraint implements ValidatorConstraintInterface {
  validate(email: string) {
    return !email.toLowerCase().endsWith('gmail.com');
  }
  defaultMessage() {
    return 'Gmail not allowed';
  }
}

export class CreateAdminDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @Validate(NotGmailConstraint)
  email: string;

  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    { message: 'Password must be at least 8 characters and include upper, lower, number, and symbol' },
  )
  password: string;
}
