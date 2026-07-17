import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateTransactionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0.01, {
    message: 'à¸ˆà¸³à¸™à¸§à¸™à¹€à¸‡à¸´à¸™à¸•à¹‰à¸­à¸‡à¸¡à¸²à¸à¸à¸§à¹ˆà¸² 0',
  })
  @IsOptional()
  amount?: number;

  @IsEnum(['expense', 'income'])
  @IsOptional()
  type?: 'expense' | 'income';

  @IsString()
  @IsOptional()
  category_id?: string | null;

  @IsDateString()
  @IsOptional()
  transaction_date?: string;

  @IsString()
  @IsOptional()
  note?: string | null;
}
