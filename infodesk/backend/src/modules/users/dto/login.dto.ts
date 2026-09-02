import { IsNotEmpty } from 'class-validator';

class LoginDto {
  @IsNotEmpty()
  identifier: string;

  @IsNotEmpty()
  password: string;
}
