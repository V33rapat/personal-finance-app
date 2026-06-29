import { IsEnum, IsOptional } from 'class-validator';

export class FindCategoryDto {
  @IsEnum(['expense', 'income'])
  @IsOptional()
  type: 'expense' | 'income';

  @IsString()
  @IsOptional()
  search?: string;
}