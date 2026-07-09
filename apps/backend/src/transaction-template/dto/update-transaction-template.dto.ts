import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateTransactionTemplateDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(['expense', 'income'])
  @IsOptional()
  type?: 'expense' | 'income';

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  default_amount?: number;

  @IsString()
  @IsOptional()
  category_id?: string | null;

  @IsString()
  @IsOptional()
  note?: string | null;
}
