import {
  IsEmail,
  IsNotEmpty,
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
}
