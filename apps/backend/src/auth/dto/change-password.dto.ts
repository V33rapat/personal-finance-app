import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { PASSWORD_CASE_PATTERN, PASSWORD_MIN_LENGTH } from '../password-policy';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  current_password: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'Password must be at least 8 characters' })
  @Matches(PASSWORD_CASE_PATTERN, {
    message: 'Password must include lowercase and uppercase letters',
  })
  new_password: string;
}
