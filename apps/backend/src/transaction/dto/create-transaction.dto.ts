import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  wallet_id: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0.01, { message: 'จำนวนเงินต้องมากกว่า 0' })
  amount: number;

  @IsEnum(['expense', 'income'])
  type: 'expense' | 'income';

  @IsString()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsOptional()
  template_id?: string | null;

  @IsDateString()
  transaction_date: string;

  @IsString()
  @IsOptional()
  note?: string;
}
