import {
  IsEnum,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(['expense', 'income'])
  type: 'expense' | 'income';

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;
}
