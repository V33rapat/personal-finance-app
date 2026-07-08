import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  from_wallet_id: string;

  @IsString()
  @IsNotEmpty()
  to_wallet_id: string;

  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsDateString()
  transfer_date: string;

  @IsString()
  @IsOptional()
  note?: string;
}
