import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { PASSWORD_CASE_PATTERN, PASSWORD_MIN_LENGTH } from '../password-policy';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
  @MinLength(3, { message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' })
  @MaxLength(50)
  username: string;

  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
  })
  @Matches(PASSWORD_CASE_PATTERN, {
    message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กและตัวพิมพ์ใหญ่อย่างน้อยอย่างละ 1 ตัว',
  })
  password: string;
}
