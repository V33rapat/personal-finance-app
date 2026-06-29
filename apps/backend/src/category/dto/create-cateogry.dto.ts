import { IsEnum, IsString, MaxLength, Matches, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
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