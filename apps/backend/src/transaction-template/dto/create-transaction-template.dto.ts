import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTransactionTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['expense', 'income'])
  type: 'expense' | 'income';

  @IsNumber()
  @Min(0.01)
  default_amount: number;

  @IsString()
  @IsOptional()
  category_id?: string | null;

  @IsString()
  @IsOptional()
  note?: string | null;
}
