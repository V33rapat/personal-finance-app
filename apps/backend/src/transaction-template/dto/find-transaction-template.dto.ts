import { IsEnum, IsOptional } from 'class-validator';

export class FindTransactionTemplateDto {
  @IsEnum(['expense', 'income'])
  @IsOptional()
  type?: 'expense' | 'income';
}
