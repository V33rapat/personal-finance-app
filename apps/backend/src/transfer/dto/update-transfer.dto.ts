import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateTransferDto {
  @IsString()
  @IsOptional()
  from_wallet_id?: string;

  @IsString()
  @IsOptional()
  to_wallet_id?: string;

  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @IsOptional()
  amount?: number;

  @IsDateString()
  @IsOptional()
  transfer_date?: string;

  @IsString()
  @IsOptional()
  note?: string | null;
}
