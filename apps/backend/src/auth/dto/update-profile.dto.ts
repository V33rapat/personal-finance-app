import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform, type TransformFnParams } from 'class-transformer';

export class UpdateProfileDto {
  @Transform(({ value }: TransformFnParams) => {
    const fullName: unknown = value;
    return typeof fullName === 'string' ? fullName.trim() : fullName;
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(3, { message: 'Full name must be at least 3 characters' })
  @MaxLength(50, { message: 'Full name must not exceed 50 characters' })
  full_name: string;
}
