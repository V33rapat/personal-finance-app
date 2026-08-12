import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class FindDailyTransactionDto {
  @IsUUID()
  walletId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsEnum(['income', 'expense'])
  @IsOptional()
  type?: 'income' | 'expense';

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;
}
